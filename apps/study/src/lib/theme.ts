// 夜读（玄青暗黑）模式：主题读写与切换
export type Theme = 'light' | 'dark';
const KEY = 'linxia:theme';

export function getTheme(): Theme {
  try {
    return localStorage.getItem(KEY) === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark';
  try {
    localStorage.setItem(KEY, next);
  } catch {
    /* ignore */
  }
  applyTheme(next);
  return next;
}

// ---- 阅读器字体（宋/楷） ----
export type ReaderFont = 'song' | 'kai';
const FONT_KEY = 'linxia:font';

export function getReaderFont(): ReaderFont {
  try {
    return localStorage.getItem(FONT_KEY) === 'kai' ? 'kai' : 'song';
  } catch {
    return 'song';
  }
}

export function setReaderFont(f: ReaderFont) {
  try {
    localStorage.setItem(FONT_KEY, f);
  } catch {
    /* ignore */
  }
}

// ---- 阅读器字号记忆 ----
const SIZE_KEY = 'linxia:fontsize';

export function getFontSize(): number {
  try {
    const v = parseInt(localStorage.getItem(SIZE_KEY) || '', 10);
    return v >= 14 && v <= 26 ? v : 18;
  } catch {
    return 18;
  }
}

export function setFontSize(n: number) {
  try {
    localStorage.setItem(SIZE_KEY, String(n));
  } catch {
    /* ignore */
  }
}

// ---- 阅读器版式（横排/竖排） ----
export type WritingMode = 'horizontal' | 'vertical';
const MODE_KEY = 'linxia:writing_mode';

export function getWritingMode(): WritingMode | null {
  try {
    const v = localStorage.getItem(MODE_KEY);
    return v === 'vertical' || v === 'horizontal' ? v : null;
  } catch {
    return null;
  }
}

export function setWritingMode(m: WritingMode) {
  try {
    localStorage.setItem(MODE_KEY, m);
  } catch {
    /* ignore */
  }
}

// ---- 阅读器夹注显隐 ----
const ANNOTATION_KEY = 'linxia:annotation';

export function getShowAnnotation(): boolean {
  try {
    const v = localStorage.getItem(ANNOTATION_KEY);
    return v === null ? true : v === 'true';
  } catch {
    return true;
  }
}

export function setShowAnnotation(show: boolean) {
  try {
    localStorage.setItem(ANNOTATION_KEY, String(show));
  } catch {
    /* ignore */
  }
}

// ---- 阅读器专注模式（Zen Mode） ----
const ZEN_KEY = 'linxia:zen';

export function getZenMode(): boolean {
  try {
    return localStorage.getItem(ZEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setZenMode(zen: boolean) {
  try {
    localStorage.setItem(ZEN_KEY, String(zen));
  } catch {
    /* ignore */
  }
}
