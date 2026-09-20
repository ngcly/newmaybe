import { X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type {
  ReaderPreferences,
  PaperTheme,
  ReaderFont,
  ReaderFontSize,
  ReaderLineHeight,
} from '../types';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onChange: (prefs: ReaderPreferences) => void;
  onReset: () => void;
}

const PAPER_THEMES: {
  id: PaperTheme;
  name: string;
  desc: string;
}[] = [
  {
    id: 'paper',
    name: '宣纸白',
    desc: '天然纸感',
  },
  {
    id: 'parchment',
    name: '羊皮暖',
    desc: '温润护眼',
  },
  {
    id: 'bamboo',
    name: '竹青静',
    desc: '清雅微凉',
  },
  {
    id: 'ink',
    name: '松墨夜',
    desc: '沉浸夜读',
  },
];

const FONTS: { id: ReaderFont; name: string; family: string }[] = [
  { id: 'song', name: '宋体 · 风骨', family: 'font-serif' },
  { id: 'kai', name: '楷体 · 墨韵', family: 'font-[var(--serif-kai)]' },
  { id: 'sans', name: '黑体 · 明晰', family: 'font-sans' },
];

const FONT_SIZES: { id: ReaderFontSize; label: string; px: string }[] = [
  { id: 'sm', label: '小', px: '16px' },
  { id: 'md', label: '标准', px: '18px' },
  { id: 'lg', label: '较大', px: '20px' },
  { id: 'xl', label: '特大', px: '24px' },
];

const LINE_HEIGHTS: { id: ReaderLineHeight; label: string }[] = [
  { id: 'compact', label: '紧凑' },
  { id: 'normal', label: '标准' },
  { id: 'relaxed', label: '松弛' },
];

export default function ReaderSettingsDrawer({
  isOpen,
  onClose,
  preferences,
  onChange,
  onReset,
}: ReaderSettingsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-lg bg-[var(--paper)] border border-[var(--line)] rounded-t-xl sm:rounded-lg shadow-2xl p-6 sm:p-7 z-10 animate-fade-in space-y-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-[var(--ochre)]" />
            <h3 className="font-serif font-semibold text-base text-[var(--ink)]">
              阅读排版与版式偏好
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onReset}
              className="flex items-center gap-1 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer px-2 py-1 rounded"
              title="恢复默认偏好"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>重置</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
              aria-label="关闭"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 纸张底色 */}
        <div>
          <label className="text-xs font-serif text-[var(--ink-faint)] block mb-2">
            纸张与色调 (Paper Tone)
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PAPER_THEMES.map((theme) => {
              const active = preferences.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onChange({ ...preferences, theme: theme.id })}
                  className={`club-reader-theme-${theme.id} p-3 rounded border text-left transition-all cursor-pointer flex flex-col justify-between h-18 bg-[var(--paper)] text-[var(--ink)] ${
                    active
                      ? 'border-[var(--ochre)] ring-2 ring-[var(--ochre)]/20 shadow-xs'
                      : 'border-[var(--line)] opacity-85 hover:opacity-100'
                  }`}
                >
                  <span className="text-xs font-serif font-semibold">{theme.name}</span>
                  <span className="text-[10px] opacity-75 font-serif">{theme.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 字体选择 */}
        <div>
          <label className="text-xs font-serif text-[var(--ink-faint)] block mb-2">
            正文字体 (Font Family)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {FONTS.map((f) => {
              const active = preferences.font === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => onChange({ ...preferences, font: f.id })}
                  className={`py-2 px-3 text-xs rounded border transition-all cursor-pointer text-center ${f.family} ${
                    active
                      ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium border-[var(--ochre)] shadow-xs'
                      : 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)]'
                  }`}
                >
                  {f.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* 字号大小 */}
        <div>
          <label className="text-xs font-serif text-[var(--ink-faint)] block mb-2">
            字体大小 (Font Size)
          </label>
          <div className="grid grid-cols-4 gap-2">
            {FONT_SIZES.map((sz) => {
              const active = preferences.fontSize === sz.id;
              return (
                <button
                  key={sz.id}
                  onClick={() => onChange({ ...preferences, fontSize: sz.id })}
                  className={`py-1.5 px-2 text-xs font-serif rounded border transition-all cursor-pointer text-center ${
                    active
                      ? 'bg-[var(--ochre)] text-[var(--paper)] font-semibold border-[var(--ochre)] shadow-xs'
                      : 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)]'
                  }`}
                >
                  {sz.label} ({sz.px})
                </button>
              );
            })}
          </div>
        </div>

        {/* 行间距 */}
        <div>
          <label className="text-xs font-serif text-[var(--ink-faint)] block mb-2">
            行间留白 (Line Spacing)
          </label>
          <div className="grid grid-cols-3 gap-2">
            {LINE_HEIGHTS.map((lh) => {
              const active = preferences.lineHeight === lh.id;
              return (
                <button
                  key={lh.id}
                  onClick={() => onChange({ ...preferences, lineHeight: lh.id })}
                  className={`py-1.5 px-3 text-xs font-serif rounded border transition-all cursor-pointer text-center ${
                    active
                      ? 'bg-[var(--ochre)] text-[var(--paper)] font-semibold border-[var(--ochre)] shadow-xs'
                      : 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)]'
                  }`}
                >
                  {lh.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 提示 */}
        <div className="pt-2 text-center">
          <p className="text-[11px] font-serif text-[var(--ink-faint)] italic">
            排版偏好已自动保存至浏览器，字里行间，唯愿从容。
          </p>
        </div>
      </div>
    </div>
  );
}
