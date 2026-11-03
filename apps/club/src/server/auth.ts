import type { Env } from '../worker';
import type { AuthorAccount } from '../types';
import { InputError, readInput, sourceKey, field } from './input';
import { json, rateLimit } from './http';
import { requireMailConfiguration, sendLoginCode } from './gmail';

export async function digest(value: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function codeHash(env: Env, value: string) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32)
    throw new InputError('登录服务尚未配置', 503);
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(env.AUTH_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  return Array.from(
    new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value))),
    (byte) => byte.toString(16).padStart(2, '0'),
  ).join('');
}
function cookieName(request: Request) {
  const url = new URL(request.url);
  return url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname)
    ? 'club_session_dev'
    : '__Host-club_session';
}
function cookie(request: Request, token: string, age: number) {
  const name = cookieName(request);
  return `${name}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${age}${name.startsWith('__Host-') ? '; Secure' : ''}`;
}
function sessionToken(request: Request) {
  const name = cookieName(request);
  return (
    request.headers
      .get('Cookie')
      ?.split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${name}=`))
      ?.slice(name.length + 1) || ''
  );
}
export function isAdmin(email: string, env: Env) {
  return (env.CLUB_ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .includes(email);
}
export async function account(request: Request, env: Env): Promise<AuthorAccount | null> {
  const token = sessionToken(request);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const row = await env.DB.prepare(
    `SELECT a.id, a.email, a.pen_name FROM authors a
    JOIN author_sessions s ON s.author_id = a.id WHERE s.token_hash = ? AND s.expires_at > unixepoch()`,
  )
    .bind(await digest(token))
    .first<{ id: string; email: string; pen_name: string }>();
  return row
    ? { id: row.id, email: row.email, penName: row.pen_name, isAdmin: isAdmin(row.email, env) }
    : null;
}
export async function requireAccount(request: Request, env: Env) {
  const user = await account(request, env);
  if (!user) throw new InputError('请先登录后管理文稿', 401);
  return user;
}
function emailField(body: Record<string, unknown>) {
  const email = field(body, 'email', 254, '邮箱', true).toLowerCase();
  if (!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,}$/i.test(email))
    throw new InputError('请输入有效邮箱');
  return email;
}
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('');
}

export async function authRoute(request: Request, env: Env): Promise<Response> {
  const path = new URL(request.url).pathname;
  if (request.method === 'GET' && path === '/api/auth/me')
    return json({ user: await account(request, env) });
  if (request.method === 'POST' && path === '/api/auth/logout') {
    await env.DB.prepare('DELETE FROM author_sessions WHERE token_hash = ?')
      .bind(await digest(sessionToken(request)))
      .run();
    return json({ success: true }, 200, { 'Set-Cookie': cookie(request, '', 0) });
  }
  if (request.method === 'PUT' && path === '/api/auth/profile') {
    const user = await requireAccount(request, env);
    const penName = field(await readInput(request), 'penName', 30, '笔名', true);
    await env.DB.prepare('UPDATE authors SET pen_name = ? WHERE id = ?')
      .bind(penName, user.id)
      .run();
    return json({ user: { ...user, penName } });
  }
  if (request.method !== 'POST') throw new InputError('接口不存在', 404);
  if (path === '/api/auth/code') {
    const email = emailField(await readInput(request));
    requireMailConfiguration(env);
    await codeHash(env, 'configuration-check');
    await rateLimit(env.DB, `login-ip:${await sourceKey(request)}`, 15);
    await rateLimit(env.DB, `login-email:${await digest(email)}`, 5);
    await rateLimit(env.DB, 'login-global-day', 200, 86400);
    const id = crypto.randomUUID();
    let number: number;
    do {
      number = crypto.getRandomValues(new Uint32Array(1))[0];
    } while (number >= 4294000000);
    const code = String(number % 1000000).padStart(6, '0');
    const hash = await codeHash(env, `${id}:${email}:${code}`);
    const inserted = await env.DB.prepare(
      `INSERT INTO login_challenges(email, id, code_hash, expires_at) VALUES (?, ?, ?, unixepoch() + 600)
      ON CONFLICT(email) DO UPDATE SET id=excluded.id, code_hash=excluded.code_hash, attempts=0, expires_at=excluded.expires_at, created_at=unixepoch()
      WHERE login_challenges.created_at <= unixepoch() - 60 RETURNING id`,
    )
      .bind(email, id, hash)
      .first();
    if (!inserted) throw new InputError('请等待 60 秒后再获取验证码', 429);
    try {
      await sendLoginCode(env, email, code);
    } catch (error) {
      await env.DB.prepare('DELETE FROM login_challenges WHERE id = ?').bind(id).run();
      throw error;
    }
    await env.DB.batch([
      env.DB.prepare('DELETE FROM author_sessions WHERE expires_at <= unixepoch()'),
      env.DB.prepare('DELETE FROM login_challenges WHERE expires_at <= unixepoch()'),
    ]);
    return json({ challengeId: id, expiresIn: 600 });
  }
  if (path === '/api/auth/verify') {
    const body = await readInput(request);
    const email = emailField(body);
    const id = field(body, 'challengeId', 64, '验证请求', true);
    const code = field(body, 'code', 6, '验证码', true);
    if (!/^\d{6}$/.test(code)) throw new InputError('请输入六位验证码');
    await rateLimit(env.DB, `verify:${await sourceKey(request)}`, 60);
    const hash = await codeHash(env, `${id}:${email}:${code}`);
    const row = await env.DB.prepare(
      `UPDATE login_challenges SET attempts=attempts+1
      WHERE email=? AND id=? AND expires_at>unixepoch() AND attempts<5 RETURNING code_hash`,
    )
      .bind(email, id)
      .first<{ code_hash: string }>();
    let difference = row ? 0 : 1;
    for (let i = 0; i < hash.length; i++)
      difference |= hash.charCodeAt(i) ^ (row?.code_hash.charCodeAt(i) || 0);
    if (difference) throw new InputError('验证码错误或已失效，请重新获取', 400);
    const consumed = await env.DB.prepare(
      'DELETE FROM login_challenges WHERE email=? AND id=? AND code_hash=? AND expires_at>unixepoch() RETURNING email',
    )
      .bind(email, id, hash)
      .first();
    if (!consumed) throw new InputError('验证码已使用，请重新获取');
    const token = randomToken();
    await env.DB.batch([
      env.DB.prepare('INSERT OR IGNORE INTO authors(id,email,pen_name) VALUES (?,?,?)').bind(
        crypto.randomUUID(),
        email,
        '文友',
      ),
      env.DB.prepare('DELETE FROM author_sessions WHERE token_hash = ?').bind(
        await digest(sessionToken(request)),
      ),
      env.DB.prepare(
        'INSERT INTO author_sessions(token_hash, author_id, expires_at) SELECT ?, id, unixepoch()+2592000 FROM authors WHERE email=?',
      ).bind(await digest(token), email),
    ]);
    return json({ success: true }, 200, { 'Set-Cookie': cookie(request, token, 2592000) });
  }
  throw new InputError('接口不存在', 404);
}
