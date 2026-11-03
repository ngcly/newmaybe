export interface Topic {
  id: string;
  name: string;
  desc: string;
  icon: string;
  articleCount: number;
}

export interface AuthorAccount {
  id: string;
  email: string;
  penName: string;
  isAdmin: boolean;
}
export interface ManuscriptDraft {
  title: string;
  content: string;
  topicId: string;
  authorSeal: string;
  seriesTitle: string;
  goldenQuote: string;
}
export type ManuscriptStatus =
  'draft' | 'pending' | 'changes_requested' | 'published' | 'withdrawn';
export interface Manuscript {
  id: string;
  authorId: string;
  author: string;
  draft: ManuscriptDraft;
  version: number;
  status: ManuscriptStatus;
  isPublic: boolean;
  publishedRevision: number | null;
  reviewNote: string;
  updatedAt: number;
}
export interface ManuscriptRevision {
  version: number;
  draft: ManuscriptDraft;
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  note: string;
  createdAt: number;
}

export interface Comment {
  id: string;
  articleId: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  replyToId?: string;
  replyToAuthor?: string;
}

export interface Article {
  id: string;
  title: string;
  summary: string;
  content: string;
  author: string;
  authorSeal?: string;
  topicId: string;
  topicName: string;
  pubDate: string;
  readingTime: number;
  wordCount: number;
  likes: number;
  commentsCount: number;
  isUserCreated?: boolean;
  seriesTitle?: string;
  seriesOrder?: number;
  goldenQuote?: string;
  featured?: boolean;
}

export type PaperTheme = 'paper' | 'parchment' | 'bamboo' | 'ink';
export type ReaderFont = 'song' | 'kai' | 'sans';
export type ReaderFontSize = 'sm' | 'md' | 'lg' | 'xl';
export type ReaderLineHeight = 'compact' | 'normal' | 'relaxed';

export interface ReaderPreferences {
  theme: PaperTheme;
  font: ReaderFont;
  fontSize: ReaderFontSize;
  lineHeight: ReaderLineHeight;
}

export type FeedFilter = 'featured' | 'latest' | 'series';
export type ViewMode = 'plaza' | 'topics' | 'article';

export type ArticleSummary = Omit<Article, 'content'>;
export interface FeedStats {
  total: number;
  topics: Record<string, number>;
  series: { title: string; count: number; author: string }[];
}
export interface ArticlePage {
  articles: ArticleSummary[];
  nextOffset: number | null;
  stats?: FeedStats;
  offline?: boolean;
}
export function summarizeArticle(article: Article | ArticleSummary): ArticleSummary {
  const { content, ...summary } = article as Article;
  void content;
  return summary;
}
