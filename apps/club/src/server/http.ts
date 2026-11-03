import { InputError } from './input';
import type { D1Database } from '../worker';

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', ...headers } });
}

export function protectWrite(request: Request) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
  const origin = request.headers.get('Origin');
  if (
    request.headers.get('X-Club-Request') !== '1' ||
    (origin && origin !== new URL(request.url).origin) ||
    request.headers.get('Sec-Fetch-Site') === 'cross-site'
  )
    throw new InputError('请从文友雅集页面操作', 403);
}

export async function rateLimit(db: D1Database, key: string, maximum: number, seconds = 3600) {
  const start = Math.floor(Date.now() / 1000 / seconds) * seconds;
  const result = await db
    .prepare(
      `INSERT INTO write_limits (key, period_start, hits) VALUES (?, ?, 1)
    ON CONFLICT(key) DO UPDATE SET hits = hits + 1 WHERE hits < ? RETURNING hits`,
    )
    .bind(`${key}:${start}`, start, maximum)
    .first();
  if (!result) throw new InputError('操作过于频繁，请稍后再试', 429);
  await db
    .prepare('DELETE FROM write_limits WHERE period_start < ?')
    .bind(start - 86400)
    .run();
}
