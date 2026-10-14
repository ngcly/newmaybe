import type { Article, ArticleSummary, Comment } from '../types';

export interface RawArticleRow {
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

export interface RawCommentRow {
  id: string;
  article_id: string;
  author: string;
  content: string;
  likes: number;
  created_at: string;
  reply_to_id?: string | null;
  reply_to_author?: string | null;
}

export type RawArticleSummaryRow = Omit<RawArticleRow, 'content'>;

export function mapArticle(row: RawArticleRow): Article {
  return { ...mapArticleSummary(row), content: row.content };
}

export function mapArticleSummary(row: RawArticleSummaryRow): ArticleSummary {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
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

export function mapComment(row: RawCommentRow): Comment {
  return {
    id: row.id,
    articleId: row.article_id,
    author: row.author,
    content: row.content,
    likes: row.likes,
    createdAt: row.created_at,
    replyToId: row.reply_to_id ?? undefined,
    replyToAuthor: row.reply_to_author ?? undefined,
  };
}
