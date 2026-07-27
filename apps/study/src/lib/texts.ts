// 古籍文本加载（按书/章节懒加载，带内存缓存）
const BASE = `${import.meta.env.BASE_URL}texts`;

const indexCache: Record<string, string[]> = {};
export interface ChapterData {
  title: string;
  paras: string[][];
  author?: string;
  tune?: string;
  layout?: {
    type: 'poetry' | 'ci' | 'couplet' | 'prose' | 'tool';
    watermark: 'bamboo' | 'cloud' | 'plum' | 'none';
    writingMode: 'vertical' | 'horizontal';
  };
}

const chapterCache: Record<string, ChapterData> = {};

export async function loadIndex(bookId: string, signal?: AbortSignal): Promise<string[]> {
  if (indexCache[bookId]) return indexCache[bookId];
  const r = await fetch(`${BASE}/${bookId}/index.json`, { signal });
  if (!r.ok) throw new Error('load index failed');
  const data = (await r.json()) as string[];
  indexCache[bookId] = data;
  return data;
}

export async function loadChapter(
  bookId: string,
  n: number,
  signal?: AbortSignal,
): Promise<ChapterData> {
  const key = `${bookId}/${n}`;
  if (chapterCache[key]) return chapterCache[key];
  const r = await fetch(`${BASE}/${bookId}/${n}.json`, { signal });
  if (!r.ok) throw new Error('load chapter failed');
  const data = (await r.json()) as ChapterData;
  chapterCache[key] = data;
  return data;
}

// 判断是否为诗词曲类（阅读器居中排版）
export function isVerseBook(bookId: string): boolean {
  return [
    'tang300',
    'songci300',
    'shijing',
    'chuci',
    'huajianji',
    'nalan',
    'juemiaohao',
    'yuefu',
    'shenglvqimeng',
    'liwengduiyun',
    'baixiangcipu',
  ].includes(bookId);
}
