import type { Article, Comment, FeedFilter } from '../types';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from '../data/initialArticles';

const STORAGE_ARTICLES_KEY = 'newmaybe_club_articles';
const STORAGE_COMMENTS_KEY = 'newmaybe_club_comments';

// Local storage fallback helpers
function getLocalArticles(): Article[] {
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

function saveLocalArticles(articles: Article[]): void {
  try {
    localStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(articles));
  } catch {
    /* ignore */
  }
}

function getLocalComments(): Record<string, Comment[]> {
  if (typeof window === 'undefined') return INITIAL_COMMENTS;
  try {
    const saved = localStorage.getItem(STORAGE_COMMENTS_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* ignore */
  }
  return INITIAL_COMMENTS;
}

function saveLocalComments(map: Record<string, Comment[]>): void {
  try {
    localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export const ClubAPI = {
  // 1. Fetch articles (Network First, local fallback)
  async fetchArticles(options?: {
    topicId?: string | null;
    seriesTitle?: string | null;
    filter?: FeedFilter;
    q?: string;
  }): Promise<Article[]> {
    const params = new URLSearchParams();
    if (options?.topicId) params.set('topicId', options.topicId);
    if (options?.seriesTitle) params.set('seriesTitle', options.seriesTitle);
    if (options?.filter) params.set('filter', options.filter);
    if (options?.q) params.set('q', options.q);

    try {
      const res = await fetch(`/api/articles?${params.toString()}`);
      if (res.ok) {
        const data = (await res.json()) as { articles: Article[] };
        if (Array.isArray(data.articles) && data.articles.length > 0) {
          saveLocalArticles(data.articles);
          return data.articles;
        }
      }
    } catch {
      // Backend not running or offline; fall through to local cache
    }

    return getLocalArticles();
  },

  // 2. Fetch single article & comments
  async fetchArticle(id: string): Promise<{ article: Article | null; comments: Comment[] }> {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(id)}`);
      if (res.ok) {
        const data = (await res.json()) as { article: Article; comments: Comment[] };
        return data;
      }
    } catch {
      /* fallback */
    }

    const localArts = getLocalArticles();
    const found = localArts.find((a) => a.id === id) || null;
    const commentsMap = getLocalComments();
    return { article: found, comments: commentsMap[id] || [] };
  },

  // 3. Create new article
  async createArticle(
    newArticleData: Omit<Article, 'id' | 'likes' | 'commentsCount'>,
  ): Promise<Article> {
    try {
      const res = await fetch('/api/articles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newArticleData),
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; article: Article };
        if (data.article) {
          const current = getLocalArticles();
          saveLocalArticles([data.article, ...current]);
          return data.article;
        }
      }
    } catch {
      /* fallback */
    }

    // Fallback: local creation
    const fallbackArticle: Article = {
      ...newArticleData,
      id: `club-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      likes: 1,
      commentsCount: 0,
      isUserCreated: true,
    };
    const current = getLocalArticles();
    saveLocalArticles([fallbackArticle, ...current]);
    return fallbackArticle;
  },

  // 4. Like an article
  async likeArticle(articleId: string): Promise<number | null> {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/like`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; likes: number };
        return data.likes;
      }
    } catch {
      /* fallback */
    }

    // Local fallback update
    const current = getLocalArticles();
    let newLikes = 1;
    const updated = current.map((a) => {
      if (a.id === articleId) {
        newLikes = a.likes + 1;
        return { ...a, likes: newLikes };
      }
      return a;
    });
    saveLocalArticles(updated);
    return newLikes;
  },

  // 5. Add comment
  async addComment(articleId: string, author: string, content: string): Promise<Comment> {
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author, content }),
      });
      if (res.ok) {
        const data = (await res.json()) as { success: boolean; comment: Comment };
        if (data.comment) {
          const commentsMap = getLocalComments();
          commentsMap[articleId] = [data.comment, ...(commentsMap[articleId] || [])];
          saveLocalComments(commentsMap);
          return data.comment;
        }
      }
    } catch {
      /* fallback */
    }

    // Local fallback
    const fallbackComment: Comment = {
      id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      articleId,
      author: author.trim() || '文友',
      content: content.trim(),
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      likes: 0,
    };
    const commentsMap = getLocalComments();
    commentsMap[articleId] = [fallbackComment, ...(commentsMap[articleId] || [])];
    saveLocalComments(commentsMap);
    return fallbackComment;
  },

  // 6. Like a comment
  async likeComment(commentId: string): Promise<void> {
    try {
      await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
        method: 'POST',
      });
    } catch {
      /* fallback */
    }

    const commentsMap = getLocalComments();
    for (const key of Object.keys(commentsMap)) {
      commentsMap[key] = commentsMap[key].map((c) =>
        c.id === commentId ? { ...c, likes: c.likes + 1 } : c,
      );
    }
    saveLocalComments(commentsMap);
  },
};
