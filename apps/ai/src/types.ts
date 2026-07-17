export interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  references?: { type: string; title: string; url: string }[];
}

export type ProviderType = 'free' | 'openai' | 'gemini';

export interface Suggestion {
  name: string;
  url: string;
  model: string;
}

export interface ContentStats {
  posts: number;
  notes: number;
  memories: number;
  excerpts: number;
  fragments: number;
}
