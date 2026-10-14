import type { Env } from '../worker';
import { articleHref, articleIdFromPath } from '../lib/article-url';
import { metadataValues, pageMetadata } from '../lib/page-metadata';
import { mapArticle, type RawArticleRow } from './rows';
import type { Article } from '../types';

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export async function articlePage(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const id = articleIdFromPath(url.pathname);
  if (id && url.pathname !== articleHref(id)) {
    url.pathname = articleHref(id);
    return Response.redirect(url.toString(), 308);
  }
  let article: Article | null = null;
  let status = 404;
  try {
    const row = id
      ? await env.DB.prepare('SELECT * FROM articles WHERE id = ?').bind(id).first<RawArticleRow>()
      : null;
    if (row) {
      article = mapArticle(row);
      status = 200;
    }
  } catch {
    status = 503;
  }
  const metadata = pageMetadata(article, url.pathname, status);
  const values = metadataValues(metadata);
  const shell = await env.ASSETS?.fetch(
    new Request(new URL('/', url), { headers: { Accept: 'text/html' } }),
  );
  if (!shell?.ok || !shell.headers.get('Content-Type')?.includes('text/html')) {
    return new Response(request.method === 'HEAD' ? null : '篇章暂时无法读取，请稍后重试', {
      status: 503,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex',
      },
    });
  }
  let html = await shell.text();
  html = html
    .replace(/<title>[^<]*<\/title>/, () => `<title>${escapeHtml(metadata.title)}</title>`)
    .replace(
      /(<meta\s+(?:name|property)="([^"]+)"\s+content=")[^"]*("\s*\/?>)/g,
      (tag, before: string, key: string, after: string) =>
        key in values ? before + escapeHtml(values[key]) + after : tag,
    )
    .replace(
      /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      () => `<link rel="canonical" href="${escapeHtml(metadata.canonical)}" />`,
    );
  // Readable without JavaScript. React replaces this fallback when the interactive reader mounts.
  const body = article
    ? `<article><h1>${escapeHtml(article.title)}</h1><p>${escapeHtml(article.author)} · ${escapeHtml(article.pubDate)}</p><div style="white-space:pre-wrap">${escapeHtml(article.content)}</div></article>`
    : `<h1>${status === 404 ? '篇章不存在' : '篇章暂时无法读取，请稍后重试'}</h1>`;
  html = html.replace(
    '<div id="root"></div>',
    () =>
      `<div id="root"><main style="max-width:48rem;margin:2rem auto;padding:1.5rem;line-height:1.9"><a href="/">返回雅集广场</a>${body}</main></div>`,
  );
  const headers = new Headers(shell.headers);
  headers.set('Content-Type', 'text/html; charset=utf-8');
  headers.set('Cache-Control', 'no-store');
  for (const key of ['Content-Length', 'Content-Encoding', 'ETag', 'Last-Modified'])
    headers.delete(key);
  if (status >= 400) headers.set('X-Robots-Tag', 'noindex');
  return new Response(request.method === 'HEAD' ? null : html, { status, headers });
}
