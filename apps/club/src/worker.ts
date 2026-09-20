import type { Article, Comment } from './types';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from './data/initialArticles';

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run<T = unknown>(): Promise<D1Result<T>>;
  all<T = unknown>(): Promise<D1Result<T>>;
}

export interface D1Result<T = unknown> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
  error?: string;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

export interface Env {
  DB: D1Database;
  ASSETS?: {
    fetch: (request: Request) => Promise<Response>;
  };
}

interface RawArticleRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  author_seal: string | null;
  topic_id: string;
  topic_name: string;
  pub_date: string;
  reading_time: number;
  word_count: number;
  likes: number;
  comments_count: number;
  series_title: string | null;
  series_order: number | null;
  golden_quote: string | null;
  featured: number;
  created_at: number;
}

interface RawCommentRow {
  id: string;
  article_id: string;
  author: string;
  content: string;
  likes: number;
  created_at: string;
}

function mapArticle(row: RawArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    author: row.author,
    authorSeal: row.author_seal ?? undefined,
    topicId: row.topic_id,
    topicName: row.topic_name,
    pubDate: row.pub_date,
    readingTime: row.reading_time,
    wordCount: row.word_count,
    likes: row.likes,
    commentsCount: row.comments_count,
    seriesTitle: row.series_title ?? undefined,
    seriesOrder: row.series_order ?? undefined,
    goldenQuote: row.golden_quote ?? undefined,
    featured: Boolean(row.featured),
  };
}

function mapComment(row: RawCommentRow): Comment {
  return {
    id: row.id,
    articleId: row.article_id,
    author: row.author,
    content: row.content,
    likes: row.likes,
    createdAt: row.created_at,
  };
}

function corsHeaders(request: Request): HeadersInit {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8',
  };
}

function jsonResponse(data: unknown, status = 200, request?: Request): Response {
  const headers = request ? corsHeaders(request) : { 'Content-Type': 'application/json' };
  return new Response(JSON.stringify(data), { status, headers });
}

// Auto seed initial data if DB is empty
async function ensureSeedData(db: D1Database): Promise<void> {
  try {
    const check = await db
      .prepare('SELECT count(*) as count FROM articles')
      .first<{ count: number }>();
    if (check && check.count > 0) return;

    const articleStatements: D1PreparedStatement[] = INITIAL_ARTICLES.map((a) =>
      db
        .prepare(
          `INSERT OR IGNORE INTO articles (
            id, title, summary, content, author, author_seal,
            topic_id, topic_name, pub_date, reading_time, word_count,
            likes, comments_count, series_title, series_order, golden_quote, featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          a.id,
          a.title,
          a.summary,
          a.content,
          a.author,
          a.authorSeal || null,
          a.topicId,
          a.topicName,
          a.pubDate,
          a.readingTime,
          a.wordCount,
          a.likes,
          a.commentsCount,
          a.seriesTitle || null,
          a.seriesOrder || null,
          a.goldenQuote || null,
          a.featured ? 1 : 0,
        ),
    );

    const commentStatements: D1PreparedStatement[] = [];
    for (const [articleId, comments] of Object.entries(INITIAL_COMMENTS)) {
      for (const c of comments) {
        commentStatements.push(
          db
            .prepare(
              `INSERT OR IGNORE INTO comments (id, article_id, author, content, likes, created_at)
               VALUES (?, ?, ?, ?, ?, ?)`,
            )
            .bind(c.id, articleId, c.author, c.content, c.likes, c.createdAt),
        );
      }
    }

    if (articleStatements.length > 0) {
      await db.batch([...articleStatements, ...commentStatements]);
    }
  } catch (err) {
    console.error('ensureSeedData failed:', err);
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(request) });
    }

    // Only route /api/* requests to Worker logic
    if (!url.pathname.startsWith('/api/')) {
      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }
      return new Response('Not Found', { status: 404 });
    }

    // Ensure database table initialized & seeded on first call
    await ensureSeedData(env.DB);

    try {
      // 1. GET /api/articles - List articles with optional filter, topic, search
      if (request.method === 'GET' && url.pathname === '/api/articles') {
        const topicId = url.searchParams.get('topicId');
        const seriesTitle = url.searchParams.get('seriesTitle');
        const filter = url.searchParams.get('filter'); // 'featured' | 'latest' | 'series'
        const q = url.searchParams.get('q')?.trim().toLowerCase();

        let sql = 'SELECT * FROM articles WHERE 1=1';
        const bindings: unknown[] = [];

        if (topicId) {
          sql += ' AND topic_id = ?';
          bindings.push(topicId);
        }

        if (seriesTitle) {
          sql += ' AND series_title = ?';
          bindings.push(seriesTitle);
        }

        if (filter === 'series') {
          sql += ' AND series_title IS NOT NULL AND series_title != ""';
        }

        if (q) {
          sql += ` AND (
            LOWER(title) LIKE ? OR
            LOWER(author) LIKE ? OR
            LOWER(summary) LIKE ? OR
            LOWER(golden_quote) LIKE ? OR
            LOWER(series_title) LIKE ?
          )`;
          const pattern = `%${q}%`;
          bindings.push(pattern, pattern, pattern, pattern, pattern);
        }

        // Sorting
        if (filter === 'featured') {
          sql += ' ORDER BY featured DESC, likes DESC, pub_date DESC';
        } else if (filter === 'series') {
          sql += ' ORDER BY series_title ASC, series_order ASC';
        } else {
          // latest default
          sql += ' ORDER BY pub_date DESC, created_at DESC';
        }

        const stmt = env.DB.prepare(sql).bind(...bindings);
        const { results } = await stmt.all<RawArticleRow>();
        return jsonResponse({ articles: results.map(mapArticle) }, 200, request);
      }

      // 2. GET /api/articles/:id - Get single article & its comments
      const articleDetailMatch = url.pathname.match(/^\/api\/articles\/([^/]+)$/);
      if (request.method === 'GET' && articleDetailMatch) {
        const id = articleDetailMatch[1];
        const row = await env.DB.prepare('SELECT * FROM articles WHERE id = ?')
          .bind(id)
          .first<RawArticleRow>();

        if (!row) {
          return jsonResponse({ error: '篇章未找到' }, 404, request);
        }

        const { results: commentRows } = await env.DB.prepare(
          'SELECT * FROM comments WHERE article_id = ? ORDER BY created_at DESC',
        )
          .bind(id)
          .all<RawCommentRow>();

        return jsonResponse(
          {
            article: mapArticle(row),
            comments: commentRows.map(mapComment),
          },
          200,
          request,
        );
      }

      // 3. POST /api/articles - Create article
      if (request.method === 'POST' && url.pathname === '/api/articles') {
        const body = (await request.json()) as Partial<Article>;
        if (!body.title?.trim() || !body.content?.trim() || !body.topicId) {
          return jsonResponse({ error: '标题、正文与投稿专题不能为空' }, 400, request);
        }

        const wordCount = body.content.trim().length;
        const readingTime = Math.max(1, Math.ceil(wordCount / 130));
        const summary =
          body.summary?.trim() ||
          body.content
            .split('\n')
            .find((l) => l.trim().length > 10)
            ?.slice(0, 80) ||
          body.content.slice(0, 60);

        const newArticle: Article = {
          id: `club-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          title: body.title.trim().slice(0, 100),
          summary: summary.trim() + '...',
          content: body.content.trim().slice(0, 50000),
          author: body.author?.trim().slice(0, 30) || '文友',
          authorSeal:
            body.authorSeal?.trim().slice(0, 2) || body.author?.trim().slice(0, 2) || '文友',
          topicId: body.topicId,
          topicName: body.topicName || '文友雅集',
          pubDate: new Date().toISOString().split('T')[0],
          readingTime,
          wordCount,
          likes: 1,
          commentsCount: 0,
          seriesTitle: body.seriesTitle?.trim().slice(0, 50) || undefined,
          seriesOrder: body.seriesOrder ?? undefined,
          goldenQuote: body.goldenQuote?.trim().slice(0, 200) || undefined,
          featured: false,
          isUserCreated: true,
        };

        await env.DB.prepare(
          `INSERT INTO articles (
            id, title, summary, content, author, author_seal,
            topic_id, topic_name, pub_date, reading_time, word_count,
            likes, comments_count, series_title, series_order, golden_quote, featured
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
          .bind(
            newArticle.id,
            newArticle.title,
            newArticle.summary,
            newArticle.content,
            newArticle.author,
            newArticle.authorSeal || null,
            newArticle.topicId,
            newArticle.topicName,
            newArticle.pubDate,
            newArticle.readingTime,
            newArticle.wordCount,
            newArticle.likes,
            newArticle.commentsCount,
            newArticle.seriesTitle || null,
            newArticle.seriesOrder || null,
            newArticle.goldenQuote || null,
            0,
          )
          .run();

        return jsonResponse({ success: true, article: newArticle }, 201, request);
      }

      // 4. POST /api/articles/:id/like - Like article
      const articleLikeMatch = url.pathname.match(/^\/api\/articles\/([^/]+)\/like$/);
      if (request.method === 'POST' && articleLikeMatch) {
        const id = articleLikeMatch[1];
        await env.DB.prepare('UPDATE articles SET likes = likes + 1 WHERE id = ?').bind(id).run();
        const row = await env.DB.prepare('SELECT likes FROM articles WHERE id = ?')
          .bind(id)
          .first<{ likes: number }>();
        return jsonResponse({ success: true, likes: row?.likes ?? 0 }, 200, request);
      }

      // 5. POST /api/articles/:id/comments - Add comment
      const addCommentMatch = url.pathname.match(/^\/api\/articles\/([^/]+)\/comments$/);
      if (request.method === 'POST' && addCommentMatch) {
        const articleId = addCommentMatch[1];
        const body = (await request.json()) as { author?: string; content?: string };
        if (!body.content?.trim()) {
          return jsonResponse({ error: '评注内容不能为空' }, 400, request);
        }

        const newComment: Comment = {
          id: `comm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          articleId,
          author: body.author?.trim().slice(0, 30) || '文友',
          content: body.content.trim().slice(0, 1000),
          createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
          likes: 0,
        };

        await env.DB.batch([
          env.DB.prepare(
            'INSERT INTO comments (id, article_id, author, content, likes, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ).bind(
            newComment.id,
            newComment.articleId,
            newComment.author,
            newComment.content,
            newComment.likes,
            newComment.createdAt,
          ),
          env.DB.prepare(
            'UPDATE articles SET comments_count = comments_count + 1 WHERE id = ?',
          ).bind(articleId),
        ]);

        return jsonResponse({ success: true, comment: newComment }, 201, request);
      }

      // 6. POST /api/comments/:id/like - Like comment
      const commentLikeMatch = url.pathname.match(/^\/api\/comments\/([^/]+)\/like$/);
      if (request.method === 'POST' && commentLikeMatch) {
        const commentId = commentLikeMatch[1];
        await env.DB.prepare('UPDATE comments SET likes = likes + 1 WHERE id = ?')
          .bind(commentId)
          .run();
        return jsonResponse({ success: true }, 200, request);
      }

      // 7. POST /api/init-seed - Manual trigger to seed or recheck
      if (request.method === 'POST' && url.pathname === '/api/init-seed') {
        await ensureSeedData(env.DB);
        return jsonResponse({ success: true, message: '种子文集检查就绪' }, 200, request);
      }

      return jsonResponse({ error: 'Endpoint Not Found' }, 404, request);
    } catch (err) {
      console.error('API Error:', err);
      return jsonResponse(
        {
          error: '服务内部异常，请稍后重试',
          details: err instanceof Error ? err.message : String(err),
        },
        500,
        request,
      );
    }
  },
};
