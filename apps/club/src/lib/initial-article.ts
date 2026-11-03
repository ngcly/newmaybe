import type { Article } from '../types';

// The Worker embeds the published row for direct article links. Read it once, before React
// replaces the server fallback, so the reader opens with the text instead of a loading state.
const element =
  typeof document === 'undefined' ? null : document.getElementById('club-initial-article');
let embedded: unknown = null;
try {
  embedded = element?.textContent ? JSON.parse(element.textContent) : null;
} catch {
  embedded = null;
}
element?.remove();

export function initialArticle(id: string | null): Article | null {
  const article = embedded as Article | null;
  return id && article?.id === id && typeof article.content === 'string' ? article : null;
}
