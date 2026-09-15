import { SlidersHorizontal, X, Minus, Plus, Eye, EyeOff, Maximize2 } from 'lucide-react';
import type { ReaderFont, WritingMode } from '@/lib/theme';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  writingMode: WritingMode;
  onWritingModeChange: (mode: WritingMode) => void;
  fontFam: ReaderFont;
  onFontFamChange: (font: ReaderFont) => void;
  fontSize: number;
  onFontSizeChange: (size: number) => void;
  showAnnotation: boolean;
  onToggleAnnotation: () => void;
  onToggleZen: () => void;
}

export function ReaderSettingsDrawer({
  isOpen,
  onClose,
  writingMode,
  onWritingModeChange,
  fontFam,
  onFontFamChange,
  fontSize,
  onFontSizeChange,
  showAnnotation,
  onToggleAnnotation,
  onToggleZen,
}: ReaderSettingsDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface border-t rounded-t-2xl p-6 shadow-2xl space-y-5 z-10">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="font-semibold text-base flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-cinnabar" /> 排版与阅读偏好
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 版式与字体 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">排版方向</label>
            <div className="grid grid-cols-2 gap-1 border rounded-lg p-1 bg-paper">
              <button
                onClick={() => onWritingModeChange('horizontal')}
                className={`py-1.5 text-xs rounded transition-colors ${
                  writingMode === 'horizontal'
                    ? 'bg-surface font-semibold text-cinnabar shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                横排
              </button>
              <button
                onClick={() => onWritingModeChange('vertical')}
                className={`py-1.5 text-xs rounded transition-colors ${
                  writingMode === 'vertical'
                    ? 'bg-surface font-semibold text-cinnabar shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                竖排
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">字体选择</label>
            <div className="grid grid-cols-2 gap-1 border rounded-lg p-1 bg-paper">
              <button
                onClick={() => onFontFamChange('song')}
                className={`py-1.5 text-xs rounded transition-colors ${
                  fontFam === 'song'
                    ? 'bg-surface font-semibold text-cinnabar shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                宋体
              </button>
              <button
                onClick={() => onFontFamChange('kai')}
                className={`py-1.5 text-xs rounded transition-colors ${
                  fontFam === 'kai'
                    ? 'bg-surface font-semibold text-cinnabar shadow-xs'
                    : 'text-muted-foreground'
                }`}
              >
                楷体
              </button>
            </div>
          </div>
        </div>

        {/* 字号调节 */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">
            字号大小 ({fontSize}px)
          </label>
          <div className="flex items-center gap-3 border rounded-lg p-2 bg-paper">
            <button
              onClick={() => onFontSizeChange(Math.max(14, fontSize - 1))}
              className="p-1.5 rounded bg-surface border hover:border-cinnabar/40 text-sm font-semibold"
              aria-label="缩小字号"
            >
              <Minus className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={14}
              max={26}
              step={1}
              value={fontSize}
              onChange={(e) => onFontSizeChange(Number(e.target.value))}
              className="flex-1 accent-cinnabar cursor-pointer"
            />
            <button
              onClick={() => onFontSizeChange(Math.min(26, fontSize + 1))}
              className="p-1.5 rounded bg-surface border hover:border-cinnabar/40 text-sm font-semibold"
              aria-label="放大字号"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 夹注开关与禅定模式 */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            onClick={onToggleAnnotation}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg border text-xs transition-colors ${
              showAnnotation
                ? 'bg-cinnabar/5 border-cinnabar/30 text-cinnabar font-medium'
                : 'bg-paper text-muted-foreground'
            }`}
          >
            {showAnnotation ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {showAnnotation ? '夹注：已开启' : '夹注：已隐藏'}
          </button>

          <button
            onClick={() => {
              onClose();
              onToggleZen();
            }}
            className="flex items-center justify-center gap-2 py-2.5 rounded-lg border bg-paper text-xs hover:border-cinnabar/40 font-medium transition-colors"
          >
            <Maximize2 className="w-4 h-4" /> 禅定专注模式
          </button>
        </div>
      </div>
    </div>
  );
}
