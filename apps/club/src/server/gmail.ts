import type { Env } from '../worker';
import { InputError } from './input';

function base64(text: string) {
  return btoa(
    Array.from(new TextEncoder().encode(text), (byte) => String.fromCharCode(byte)).join(''),
  );
}

export function requireMailConfiguration(env: Env) {
  if (
    !env.GMAIL_CLIENT_ID ||
    !env.GMAIL_CLIENT_SECRET ||
    !env.GMAIL_REFRESH_TOKEN ||
    !env.GMAIL_SENDER ||
    !/^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(env.GMAIL_SENDER)
  )
    throw new InputError('登录邮件服务尚未配置，请联系站主', 503);
}

export async function sendLoginCode(env: Env, email: string, code: string) {
  requireMailConfiguration(env);
  try {
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: env.GMAIL_CLIENT_ID!,
        client_secret: env.GMAIL_CLIENT_SECRET!,
        refresh_token: env.GMAIL_REFRESH_TOKEN!,
        grant_type: 'refresh_token',
      }),
      signal: AbortSignal.timeout(10000),
    });
    const token = (await tokenResponse.json()) as { access_token?: string };
    if (!tokenResponse.ok || !token.access_token) throw Error('token');
    const text = `你的文友雅集登录验证码是：${code}\n\n10 分钟内有效，请勿向他人提供。若非本人操作，请忽略此邮件。`;
    const mime = [
      `From: ${env.GMAIL_SENDER}`,
      `To: ${email}`,
      `Subject: =?UTF-8?B?${base64('文友雅集 · 登录验证码')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64(text),
    ].join('\r\n');
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: base64(mime).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) throw Error('send');
  } catch {
    // Never expose provider responses, tokens, email contents or codes in logs/API errors.
    throw new InputError('验证码暂时无法发送，请稍后重试', 503);
  }
}
