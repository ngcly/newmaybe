import type { Article } from '../types';
import { articleHref } from './article-url';

export function pageMetadata(article: Article | null, path: string, status = 200) {
  const home = path === '/';
  const title = article
    ? `${article.title} · 文友雅集`
    : home
      ? 'newmaybe 文友雅集 · 开放创作与专题文集社区'
      : status === 404
        ? '篇章不存在 · 文友雅集'
        : status >= 500
          ? '篇章暂时无法读取 · 文友雅集'
          : '正在加载篇章 · 文友雅集';
  const description =
    article?.summary ||
    (home
      ? 'newmaybe 文友雅集 - 慢节奏的人文写作与读者交流社区。支持沉浸式创作、专题文集、文章阅读、文友评注与点赞互动。'
      : '文友雅集 · 字里相逢，行间留白。');
  return {
    title,
    description,
    canonical: `https://club.newmaybe.com${article ? articleHref(article.id) : path}`,
    type: article ? 'article' : 'website',
    robots: status >= 400 ? 'noindex, follow' : 'index, follow',
  };
}

export function metadataValues(metadata: ReturnType<typeof pageMetadata>): Record<string, string> {
  return {
    description: metadata.description,
    robots: metadata.robots,
    'og:title': metadata.title,
    'og:description': metadata.description,
    'og:url': metadata.canonical,
    'og:type': metadata.type,
    'twitter:title': metadata.title,
    'twitter:description': metadata.description,
  };
}
