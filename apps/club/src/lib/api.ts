import {
  summarizeArticle,
  type ArticleSummary,
  type ArticlePage,
  type Article,
  type Comment,
} from '../types';
// Public bodies are fetched fresh so withdrawn works are never revived from a local cache.
export function getLocalArticles(): ArticleSummary[] {
  return [];
}
export function getCachedComments(): Record<string, Comment[]> {
  return {};
}

export const ClubAPI = {
  async fetchArticles(params = new URLSearchParams()): Promise<ArticlePage> {
    try {
      const res = await fetch(`/api/articles?${params}`);
      if (res.ok && res.headers.get('content-type')?.includes('application/json')) {
        const data = (await res.json()) as ArticlePage;
        if (Array.isArray(data.articles)) {
          return {
            ...data,
            articles: data.articles.map(summarizeArticle),
            nextOffset: data.nextOffset ?? null,
          };
        }
      }
    } catch {
      /* Do not revive withdrawn articles from browser storage. */
    }
    return { articles: getLocalArticles(), nextOffset: null, offline: true };
  },

  // 2. Fetch single article & comments. `notFound` separates a real 404 from a failed request.
  async fetchArticle(
    id: string,
  ): Promise<{ article: Article | null; comments: Comment[]; notFound: boolean }> {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (res.status === 404) return { article: null, comments: [], notFound: true };
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await res.json()) as { article: Article; comments: Comment[] };
          if (
            data?.article?.id === id &&
            typeof data.article.content === 'string' &&
            Array.isArray(data.comments)
          ) {
            return { ...data, notFound: false };
          }
        }
      }
    } catch {
      /* fallback */
    }

    return { article: null, comments: [], notFound: false };
  },

  // 4. Like an article
  async likeArticle(articleId: string): Promise<number | null> {
    const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/like`, {
      method: 'POST',
      headers: { 'X-Club-Request': '1' },
    });
    if (!res.ok) throw new Error('点赞失败');
    const data = (await res.json()) as { likes: number };
    return data.likes;
  },

  // 5. Add comment (supports replyToId and replyToAuthor)
  async addComment(
    articleId: string,
    author: string,
    content: string,
    replyToId?: string,
    replyToAuthor?: string,
  ): Promise<Comment> {
    let res: Response;
    try {
      res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Club-Request': '1' },
        body: JSON.stringify({ author, content, replyToId, replyToAuthor }),
      });
    } catch {
      throw new Error('网络连接失败，文字已保留，请重试');
    }
    const data = (await res.json().catch(() => null)) as {
      error?: string;
      comment?: Comment;
    } | null;
    if (!res.ok) throw new Error(data?.error || '评注发表失败，请稍后重试');
    if (!data?.comment?.id) throw new Error('评注未获确认，文字已保留，请重试');
    return data.comment;
  },

  // 6. Like a comment
  async likeComment(commentId: string): Promise<number> {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
      headers: { 'X-Club-Request': '1' },
    });
    if (!res.ok) throw new Error('点赞失败');
    const data = (await res.json()) as { likes: number };
    return data.likes;
  },
};
