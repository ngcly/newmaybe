export type Tab = 'poster' | 'inspiration' | 'assets';
export type ThemeType = 'paper' | 'dark' | 'ochre' | 'bamboo' | 'sunset' | 'cinnabar' | 'withered';
export type RatioType = '9:16' | '4:3' | '1:1' | '1.91:1';
export type AlignType = 'left' | 'center';

export interface Prompt {
  category: string;
  text: string;
}

export interface DailyPoem {
  content: string;
  author: string;
  origin: string;
}

export interface Asset {
  title: string;
  path: string;
  type: string;
}
