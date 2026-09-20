export interface Topic {
  id: string;
  name: string;
  desc: string;
  icon: string;
  articleCount: number;
}

export interface Comment {
  id: string;
  articleId: string;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
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
