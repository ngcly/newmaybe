export type CardType = 'fragment' | 'excerpt';
export type ExportFormat = 'text' | 'markdown' | 'notion';
export type { CardTheme } from '@newmaybe/design-tokens';

export interface FragmentForm {
  content: string;
  mood: string;
  location: string;
  pubDate: string;
}

export interface ExcerptForm {
  content: string;
  author: string;
  source: string;
  comment: string;
  pubDate: string;
  tags: string;
}
