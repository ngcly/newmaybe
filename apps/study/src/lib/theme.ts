// 夜读（玄青暗黑）模式：主题读写与切换
import { syncBrowserTheme } from '@newmaybe/design-tokens/browser-theme';

export type Theme = 'light' | 'dark';
const KEY = 'linxia:theme';

function getCookieTheme(): Theme | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(/(?:^|;\s*)theme=(dark|light)/);
  return match ? (match[1] as Theme) : null;
}

function setCookieTheme(t: Theme) {
  if (typeof document === 'undefined') return;
  const domainAttr = window.location.hostname.includes('newmaybe.com')
    ? '; domain=.newmaybe.com'
    : '';
  document.cookie = `theme=${t}; path=/${domainAttr}; max-age=31536000; SameSite=Lax`;
}

export function getTheme(): Theme {
  try {
    // 优先读取根域 Cookie（跨子应用共享），其次读取本地缓存与系统偏好
    const cookieTheme = getCookieTheme();
    if (cookieTheme) return cookieTheme;
    const local = localStorage.getItem(KEY);
    if (local === 'dark' || local === 'light') return local;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches
    ) {
      return 'dark';
    }
    return 'light';
  } catch {
    return 'light';
  }
}

export function applyTheme(t: Theme) {
  document.documentElement.classList.toggle('dark', t === 'dark');
  document.documentElement.classList.toggle('light', t === 'light');
  syncBrowserTheme(t);
  setCookieTheme(t);
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
