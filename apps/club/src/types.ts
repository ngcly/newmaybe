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
}

export type ViewMode = 'plaza' | 'topics' | 'article';
