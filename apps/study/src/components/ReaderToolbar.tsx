import { Link } from 'react-router';
import { List, Minus, Plus, Eye, EyeOff, Maximize2, Check, SlidersHorizontal } from 'lucide-react';
import type { ReaderFont, WritingMode } from '@/lib/theme';

interface ReaderToolbarProps {
  bookId: string;
  bookTitle: string;
  num: number;
  total: number;
  zenMode: boolean;
  writingMode: WritingMode;
  onToggleWritingMode: () => void;
  fontFam: ReaderFont;
  onFontFamChange: (font: ReaderFont) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  showAnnotation: boolean;
  onToggleAnnotation: () => void;
  onToggleZen: () => void;
  done: boolean;
  onToggleDone: () => void;
  canMarkRead: boolean;
  onOpenSettings: () => void;
}

export function ReaderToolbar({
  bookId,
  bookTitle,
  num,
  total,
  zenMode,
  writingMode,
  onToggleWritingMode,
  fontFam,
  onFontFamChange,
  fontSize,
  onFontSizeChange,
  showAnnotation,
  onToggleAnnotation,
  onToggleZen,
  done,
  onToggleDone,
  canMarkRead,
  onOpenSettings,
}: ReaderToolbarProps) {
  if (zenMode) return null;

  return (
    <div className="flex items-center justify-between mb-8 pb-3 border-b gap-2">
      <Link
        to={`/book/${bookId}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cinnabar transition-colors shrink-0"
      >
        <List className="w-4 h-4" /> <span className="hidden sm:inline">目录</span>
      </Link>

      {/* 中间章节标头（移动端可见） */}
      <span className="text-xs text-muted-foreground truncate max-w-[140px] sm:max-w-[220px] font-medium text-center">
        {bookTitle} · {num + 1}
        {total ? `/${total}` : ''}
      </span>

      {/* 桌面端平铺工具条 */}
      <div className="hidden md:flex items-center gap-2.5">
        {/* 竖排 / 横排 切换 */}
        <button
          onClick={onToggleWritingMode}
          className="px-2.5 py-1.5 rounded-md border text-xs hover:border-cinnabar/50 hover:text-cinnabar transition-colors"
        >
          {writingMode === 'horizontal' ? '切换竖排' : '切换横排'}
        </button>

        {/* 字体切换 */}
        <div className="flex items-center border rounded-md overflow-hidden bg-surface">
          <button
            onClick={() => onFontFamChange('song')}
            className={`px-2.5 py-1 text-xs transition-colors border-r ${
              fontFam === 'song'
                ? 'bg-secondary font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-secondary/30'
            }`}
          >
            宋体
          </button>
          <button
            onClick={() => onFontFamChange('kai')}
            className={`px-2.5 py-1 text-xs transition-colors ${
              fontFam === 'kai'
                ? 'bg-secondary font-semibold text-foreground'
                : 'text-muted-foreground hover:bg-secondary/30'
            }`}
          >
            楷体
          </button>
        </div>

        {/* 字号缩放 */}
        <div className="flex items-center border rounded-md overflow-hidden bg-surface">
          <button
            onClick={() => onFontSizeChange(Math.max(14, fontSize - 1))}
            className="p-1.5 hover:bg-secondary/30 text-muted-foreground"
            aria-label="缩小字号"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <span className="px-2 text-xs border-x select-none">{fontSize}</span>
          <button
            onClick={() => onFontSizeChange(Math.min(26, fontSize + 1))}
            className="p-1.5 hover:bg-secondary/30 text-muted-foreground"
            aria-label="放大字号"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* 夹注开关 */}
        <button
          onClick={onToggleAnnotation}
          className={`p-1.5 rounded-md border text-xs transition-colors ${
            showAnnotation
              ? 'text-foreground/80 hover:border-cinnabar/40'
              : 'text-muted-foreground bg-secondary/40'
          }`}
          title={showAnnotation ? '点击隐藏夹注' : '点击显示夹注'}
          aria-label="夹注开关"
        >
          {showAnnotation ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
        </button>

        {/* 专注模式 */}
        <button
          onClick={onToggleZen}
          className="p-1.5 rounded-md border text-xs text-foreground/80 hover:border-cinnabar/40 transition-colors"
          title="进入禅定专注阅读 (Esc 退出)"
          aria-label="专注模式"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>

        {/* 标记已读 */}
        <button
          disabled={!canMarkRead}
          onClick={onToggleDone}
          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border transition-colors ${
            done
              ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20'
              : 'bg-surface hover:border-cinnabar/40'
          }`}
        >
          <Check className="w-3.5 h-3.5" />
          {done ? '已读' : '标记已读'}
        </button>
      </div>

      {/* 移动端右侧快捷区 */}
      <div className="flex md:hidden items-center gap-1.5">
        <button
          disabled={!canMarkRead}
          onClick={onToggleDone}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors ${
            done
              ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20'
              : 'bg-surface hover:border-cinnabar/40'
          }`}
        >
          <Check className="w-3 h-3" />
          {done ? '已读' : '已读'}
        </button>

        <button
          onClick={onOpenSettings}
          className="p-1.5 rounded-md border bg-surface hover:border-cinnabar/50 text-foreground/80 transition-colors"
          aria-label="打开排版设置"
        >
          <SlidersHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
