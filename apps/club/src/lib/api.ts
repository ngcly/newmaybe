import type { Article, Comment } from '../types';
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

export const ClubAPI = {
  // 1. Fetch articles (Network First, local fallback)
  async fetchArticles(): Promise<Article[]> {
    try {
      const res = await fetch('/api/articles');
      if (res.ok) {
        const data = (await res.json()) as { articles: Article[] };
        if (Array.isArray(data.articles)) {
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

  // 3. Create new article. A failed request is not a published article.
  async createArticle(
    newArticleData: Omit<Article, 'id' | 'likes' | 'commentsCount'>,
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

  // 5. Add comment
  async addComment(articleId: string, author: string, content: string): Promise<Comment> {
    const res = await fetch(`/api/articles/${encodeURIComponent(articleId)}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ author, content }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error || '评注发表失败');
    }
    const data = (await res.json()) as { comment?: Comment };
    if (!data.comment) throw new Error('评注未获确认');
    return data.comment;
  },

  // 6. Like a comment
  async likeComment(commentId: string): Promise<void> {
    const res = await fetch(`/api/comments/${encodeURIComponent(commentId)}/like`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('点赞失败');
  },
};
