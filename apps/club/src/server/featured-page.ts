import {
  featuredCatalog,
  featuredFontPath,
  isPublishedFeaturedPath,
  type FeaturedCatalog,
} from '../lib/featured';
import type { D1Database, Env } from '../worker';

function unavailable(request: Request, status: 404 | 503): Response {
  const title = status === 404 ? '这一期尚未发布或不存在' : '精选暂时无法读取';
  return new Response(
    request.method === 'HEAD'
      ? null
      : `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · 文友雅集</title><meta name="robots" content="noindex"><link rel="stylesheet" href="/featured/common/tokens.css"><link rel="stylesheet" href="/featured/common/catalog.css"></head><body><main class="edition-main"><h1>${title}</h1><a class="edition-link" href="/featured">返回本期精选 →</a></main></body></html>`,
    {
      status,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    },
  );
}

export async function featuredPage(
  request: Request,
  assets: Env['ASSETS'],
  catalog: FeaturedCatalog = featuredCatalog,
  db?: D1Database,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD')
    return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } });
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, '').replace(/\.html$/, '');
  const fontFile = featuredFontPath.test(path);
  const sharedAsset =
    fontFile || /^\/featured\/common\/(tokens|navigation|catalog)\.css$/.test(path);
  if (!sharedAsset && !isPublishedFeaturedPath(path, catalog)) return unavailable(request, 404);
  const issue = catalog.issues.find(
    (value) => path === `/featured/${value.slug}` || path.startsWith(`/featured/${value.slug}/`),
  );
  if (issue?.articleId && db) {
    try {
      if (
        !(await db
          .prepare('SELECT id FROM published_articles WHERE id = ?')
          .bind(issue.articleId)
          .first())
      )
        return unavailable(request, 404);
    } catch {
      return unavailable(request, 503);
    }
  }
  const document =
    path === '/featured' ||
    path === '/featured/archive' ||
    catalog.issues.some(
      (issue) => issue.status === 'published' && path === `/featured/${issue.slug}`,
    );
  if (document && url.pathname !== path) {
    url.pathname = path;
    return Response.redirect(url.toString(), 308);
  }
  if (!assets) return unavailable(request, 503);
  try {
    // Read GET even for HEAD, to verify the document rather than accepting an SPA fallback.
    const assetHeaders = new Headers({ Accept: document ? 'text/html' : '*/*' });
    if (!document && request.headers.has('Range'))
      assetHeaders.set('Range', request.headers.get('Range')!);
    const response = await assets.fetch(new Request(url, { headers: assetHeaders }));
    if (!document && response.status === 416)
      return new Response(request.method === 'HEAD' ? null : response.body, response);
    if (!response.ok) return unavailable(request, response.status === 404 ? 404 : 503);
    const isHtml = response.headers.get('Content-Type')?.includes('text/html');
    if (!document) {
      if (isHtml) return unavailable(request, 404);
      const headers = new Headers(response.headers);
      headers.set('Cache-Control', fontFile ? 'public, max-age=31536000, immutable' : 'no-store');
      return new Response(request.method === 'HEAD' ? null : response.body, {
        status: response.status,
        headers,
      });
    }
    if (!isHtml) return unavailable(request, 503);
    const body = await response.text();
    if (!body.includes(`<meta name="club-featured" content="${path}">`))
      return unavailable(request, 503);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', 'no-store');
    for (const key of ['Content-Length', 'Content-Encoding', 'ETag']) headers.delete(key);
    return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
  } catch {
    return unavailable(request, 503);
  }
}
