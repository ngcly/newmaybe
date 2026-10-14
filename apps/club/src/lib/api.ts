import {
  summarizeArticle,
  type ArticleSummary,
  type ArticlePage,
  type Article,
  type Comment,
} from '../types';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from '../data/initialArticles';

const STORAGE_ARTICLES_KEY = 'newmaybe_club_articles';
const STORAGE_COMMENTS_KEY = 'newmaybe_club_comments';

// Local storage fallback helpers
export function getLocalArticles(): ArticleSummary[] {
  if (typeof window === 'undefined') return INITIAL_ARTICLES;
  try {
    const saved = localStorage.getItem(STORAGE_ARTICLES_KEY);
    if (saved) {
      const parsed: Article[] = JSON.parse(saved);
      const merged = parsed.map((item) => {
        const init = INITIAL_ARTICLES.find((a) => a.id === item.id);
        return init ? { ...init, ...item } : item;
      });
      INITIAL_ARTICLES.forEach((init) => {
        if (!merged.some((m) => m.id === init.id)) {
          merged.push(init);
        }
      });
      return merged;
    }
  } catch {
    /* ignore */
  }
  return INITIAL_ARTICLES;
}

export function getCachedComments(): Record<string, Comment[]> {
  if (typeof window === 'undefined') return INITIAL_COMMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_COMMENTS_KEY);
    if (saved) {
      const parsed: Record<string, Comment[]> = JSON.parse(saved);
      const merged: Record<string, Comment[]> = { ...INITIAL_COMMENTS };
      for (const [articleId, comments] of Object.entries(parsed)) {
        // An empty cached array is a confirmed empty list, not a cache miss.
        if (Array.isArray(comments)) merged[articleId] = comments;
      }
      return merged;
    }
  } catch {
    /* ignore */
  }
  return INITIAL_COMMENTS;
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
      /* Show cached summaries without pretending they are current. */
    }
    return { articles: getLocalArticles(), nextOffset: null, offline: true };
  },

  // 2. Fetch single article & comments
  async fetchArticle(id: string): Promise<{ article: Article | null; comments: Comment[] }> {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (res.status === 404) return { article: null, comments: [] };
      if (res.ok) {
        const contentType = res.headers.get('content-type') || '';
        if (contentType.includes('application/json')) {
          const data = (await res.json()) as { article: Article; comments: Comment[] };
          if (
            data?.article?.id === id &&
            typeof data.article.content === 'string' &&
            Array.isArray(data.comments)
          ) {
            try {
              const recent: Article[] = JSON.parse(
                localStorage.getItem('newmaybe_club_recent_articles') || '[]',
              );
              localStorage.setItem(
                'newmaybe_club_recent_articles',
                JSON.stringify([data.article, ...recent.filter((a) => a.id !== id)].slice(0, 5)),
              );
            } catch {
              /* Reading still works without a cache. */
            }
            return data;
          }
        }
      }
    } catch {
      /* fallback */
    }

    let found = INITIAL_ARTICLES.find((a) => a.id === id) || null;
    try {
      const recent: Article[] = JSON.parse(
        localStorage.getItem('newmaybe_club_recent_articles') || '[]',
      );
      found = recent.find((a) => a.id === id && typeof a.content === 'string') || found;
    } catch {
      /* Invalid cache falls back to seed articles. */
    }
    const commentsMap = getCachedComments();
    const fallbackComments = commentsMap[id] || INITIAL_COMMENTS[id] || [];
    return { article: found, comments: fallbackComments };
  },

  // 3. Create new article. A failed request is not a published article.
  async createArticle(
    newArticleData: Omit<Article, 'id' | 'likes' | 'commentsCount' | 'summary'>,
  ): Promise<Article> {
    const res = await fetch('/api/articles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newArticleData),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || '投稿失败，请稍后重试');
    }
    const data = (await res.json()) as { article?: Article };
    if (!data.article) throw new Error('投稿未获确认，请稍后检查');
    return data.article;
  },

  // 4. Like an article
  async likeArticle(articleId: string): Promise<number | null> {
    const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/like`, {
      method: 'POST',
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
        headers: { 'Content-Type': 'application/json' },
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
    });
    if (!res.ok) throw new Error('点赞失败');
    const data = (await res.json()) as { likes: number };
    return data.likes;
  },
};
