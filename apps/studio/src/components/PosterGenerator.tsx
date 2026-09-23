import { light } from '@newmaybe/design-tokens';
import { useState, useEffect, useRef, useCallback } from 'react';
import { POSTER_THEMES } from '../constants/themes';
import type { ThemeType, RatioType, AlignType } from '../types';

const SIZES: Record<RatioType, { w: number; h: number; label: string }> = {
  '9:16': { w: 720, h: 1280, label: '竖屏壁纸 / 故事' },
  '4:3': { w: 960, h: 720, label: '经典刊印画幅' },
  '1:1': { w: 800, h: 800, label: '正方灵感图谱' },
  '1.91:1': { w: 1200, h: 630, label: '社交横版封面' },
};

const STORAGE_KEY_POSTER = 'newmaybe:studio:draft:poster:v2';

interface PosterDraft {
  title: string;
  subtitle: string;
  quote: string;
  author: string;
  watermark: string;
  theme: ThemeType;
  ratio: RatioType;
  align: AlignType;
}

const DEFAULT_POSTER: PosterDraft = {
  title: '思考的经纬',
  subtitle: 'newmaybe.com 数字花园图谱上线',
  quote: '留白处，自有新可能。',
  author: '林',
  watermark: '留',
  theme: 'paper',
  ratio: '1.91:1',
  align: 'left',
};

function loadDraft<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback;
  try {
    const saved = localStorage.getItem(key);
    if (saved) return JSON.parse(saved) as T;
  } catch {
    // Ignore localStorage errors
  }
  return fallback;
}

function saveDraft<T>(key: string, data: T) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Ignore localStorage errors
  }
}

interface PosterGeneratorProps {
  initialQuote?: string;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    let line = '';
    for (const character of paragraph) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function fitEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let result = text;
  while (result && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

export default function PosterGenerator({ initialQuote }: PosterGeneratorProps) {
  const [draft, setDraft] = useState<PosterDraft>(() => {
    const saved = loadDraft<PosterDraft>(STORAGE_KEY_POSTER, DEFAULT_POSTER);
    if (initialQuote) {
      return { ...saved, quote: initialQuote };
    }
    return saved;
  });

  const [savedAt, setSavedAt] = useState<string>('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateDraft = (patch: Partial<PosterDraft>) => {
    setDraft((prev) => {
      const next = { ...prev, ...patch };
      saveDraft(STORAGE_KEY_POSTER, next);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSavedAt(timeStr);
      return next;
    });
  };

  const handleResetDraft = () => {
    setDraft(DEFAULT_POSTER);
    saveDraft(STORAGE_KEY_POSTER, DEFAULT_POSTER);
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSavedAt(timeStr);
  };

  const { title, subtitle, quote, author, watermark, theme, ratio, align } = draft;

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { w: width, h: height } = SIZES[ratio];
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    const colors = POSTER_THEMES[theme];

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // Border
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // Watermark
    if (watermark) {
      ctx.fillStyle = colors.watermark;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const watermarkSize = Math.min(width, height) * 0.55;
      ctx.font = `normal ${watermarkSize}px "Noto Serif SC", "Songti SC", serif`;
      ctx.fillText(watermark, width / 2, height / 2);
    }

    // Branding
    ctx.fillStyle = colors.accent;
    ctx.textBaseline = 'top';
    ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText('newmaybe.com · Editorial Studio', width / 2, 80);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText('newmaybe.com · Editorial Studio', 80, 80);
    }

    const titleY = height * 0.22;
    const subtitleY = titleY + 90;
    const lineY = subtitleY + 60;
    const quoteStartY = lineY + 60;

    // Title
    ctx.fillStyle = colors.text;
    ctx.font = 'normal 64px "Noto Serif SC", "Songti SC", serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, titleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(title, 80, titleY);
    }

    // Subtitle
    ctx.fillStyle = colors.accent;
    ctx.font = 'normal 24px "Noto Serif SC", "Songti SC", serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(subtitle, width / 2, subtitleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(subtitle, 80, subtitleY);
    }

    // Decorative line
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    if (align === 'center') {
      ctx.moveTo(width / 2 - 160, lineY);
      ctx.lineTo(width / 2 + 160, lineY);
    } else {
      ctx.moveTo(80, lineY);
      ctx.lineTo(400, lineY);
    }
    ctx.stroke();

    // Quote with line wrapping
    ctx.fillStyle = colors.text;
    ctx.font = 'italic 32px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = align === 'center' ? 'center' : 'left';

    const maxQuoteWidth = width - 160;
    const lineHeight = 50;
    const quoteLines = wrapLines(ctx, quote, maxQuoteWidth);
    const maxQuoteY = height - 160;
    const maxLines = Math.max(1, Math.floor((maxQuoteY - quoteStartY) / lineHeight) + 1);
    const visibleLines = quoteLines.slice(0, maxLines);
    if (quoteLines.length > maxLines && visibleLines.length > 0) {
      visibleLines[visibleLines.length - 1] = fitEllipsis(
        ctx,
        visibleLines[visibleLines.length - 1],
        maxQuoteWidth,
      );
    }
    visibleLines.forEach((quoteLine, index) => {
      ctx.fillText(
        quoteLine,
        align === 'center' ? width / 2 : 80,
        quoteStartY + index * lineHeight,
      );
    });

    // Stamp
    if (author) {
      const stampSize = 50;
      const stampX = width - 80 - stampSize;
      const stampY = height - 80 - stampSize;
      ctx.fillStyle = theme === 'ochre' || theme === 'sunset' ? light.ink : colors.accent;
      ctx.fillRect(stampX, stampY, stampSize, stampSize);
      ctx.fillStyle = light.paper;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(author.slice(0, 1), stampX + stampSize / 2, stampY + stampSize / 2);
    }
  }, [title, subtitle, quote, author, watermark, theme, ratio, align]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Repaint once the brand webfonts finish loading so the first render
  // doesn't stick with fallback serif glyphs.
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      document.fonts.load('normal 64px "Noto Serif SC"'),
      document.fonts.load('italic 32px "Noto Serif SC"'),
      document.fonts.load('bold 24px "Noto Serif SC"'),
      document.fonts.load('italic 20px "Cormorant Garamond"'),
      document.fonts.ready,
    ]).then(() => {
      if (!cancelled) renderCanvas();
    });
    return () => {
      cancelled = true;
    };
  }, [renderCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title || 'poster'}-${theme}-${ratio.replace(':', '_')}.png`;
    link.href = url;
    link.click();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 2200);
  };

  const themeLabels: [ThemeType, string][] = [
    ['paper', '米纸底 📄'],
    ['dark', '暗夜底 🌙'],
    ['ochre', '赭石底 🔴'],
    ['bamboo', '竹青底 🍃'],
    ['sunset', '晚霞底 🌅'],
    ['cinnabar', '朱砂底 🏮'],
    ['withered', '枯木底 🍂'],
  ];

  const currentSize = SIZES[ratio];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header with Pipeline Rhythm */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-serif text-[var(--ink-faint)]">
          <span className="text-[var(--ochre)] font-medium">阶段 1：文案撰写</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 2：版式调校</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 3：海报导出</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-2xl font-medium text-[var(--ink)]">新可能排版海报生成器</h2>
          <span className="text-xs text-[var(--ink-faint)]">
            Canvas 像素级精准绘制 · 东方版式美学
          </span>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          在前端通过 HTML5 Canvas
          绘制高清排版海报，支持多比例构图与经典印款，实时响应文案与色彩调校。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* STAGE 1: INPUT CONTENT (Col 1-5)                         */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
          {/* Step 1 Header & Autosave */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                1
              </span>
              <span className="text-sm font-medium text-[var(--ink)]">文案内容与落款印章</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[var(--ink-faint)] flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--bamboo)] animate-pulse"></span>
                {savedAt ? `已暂存 ${savedAt}` : '草稿已暂存'}
              </span>
              <button
                type="button"
                onClick={handleResetDraft}
                className="text-[11px] text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
                title="恢复为初始默认文案"
              >
                [重置]
              </button>
            </div>
          </div>

          {/* Text Inputs */}
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--ink-soft)] font-medium">大标题 (Title)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="海报大标题..."
                className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-[var(--ink-soft)] font-medium">
                副标题/引子 (Subtitle)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => updateDraft({ subtitle: e.target.value })}
                placeholder="简明副标题..."
                className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  正文金句 (Quote)
                </label>
                <span className="text-[11px] text-[var(--ink-faint)]">
                  {quote.length} 字
                  {quote.length > 80 ? ' · 略长，画面可能紧凑' : ' · 适合 15~60 字'}
                </span>
              </div>
              <textarea
                value={quote}
                onChange={(e) => updateDraft({ quote: e.target.value })}
                placeholder="引人深思的正文或摘录..."
                className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm leading-relaxed h-28 focus:border-[var(--ochre)] outline-none resize-none transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  落款印章 (Stamp)
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => updateDraft({ author: e.target.value })}
                  placeholder={'落款字，如"林"'}
                  maxLength={4}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  背景巨幅单字水印
                </label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => updateDraft({ watermark: e.target.value })}
                  maxLength={1}
                  placeholder={'单字，如"留"'}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* STAGE 2 & 3: PREVIEW, STYLE & EXPORT (Col 6-12)          */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Stage 2 Box */}
          <div className="flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                  2
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">版式调校与画布渲染</span>
              </div>
              <span className="text-xs font-serif text-[var(--ink-faint)]">
                {currentSize.w} × {currentSize.h} px · {ratio}
              </span>
            </div>

            {/* Ratio & Alignment Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ratio */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--ink-soft)] font-medium">尺寸比例 Ratio</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['9:16', '4:3', '1:1', '1.91:1'] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => updateDraft({ ratio: r })}
                      className={`py-1.5 px-2 rounded text-xs font-medium border transition-all cursor-pointer flex flex-col items-center ${
                        ratio === r
                          ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-xs'
                          : 'bg-[var(--paper)] text-[var(--ink-soft)] border-[var(--line)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <span className="font-semibold">{r}</span>
                      <span className="text-[10px] opacity-85">
                        {SIZES[r].w}×{SIZES[r].h}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Alignment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  排版对齐 Alignment
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['left', 'center'] as const).map((a) => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => updateDraft({ align: a })}
                      className={`h-full py-1.5 rounded text-xs font-medium border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                        align === a
                          ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-xs'
                          : 'bg-[var(--paper)] text-[var(--ink-soft)] border-[var(--line)] hover:text-[var(--ink)]'
                      }`}
                    >
                      <span>{a === 'left' ? '居左对齐 ⫷' : '居中对齐 ⫸'}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas Preview Container */}
            <div className="w-full flex justify-center items-center bg-[var(--paper)] border border-[var(--line)] rounded-md p-4 sm:p-6 shadow-inner overflow-hidden min-h-60">
              <canvas
                ref={canvasRef}
                className="w-full max-w-[460px] h-auto border border-[var(--line)]/60 rounded shadow-md"
              />
            </div>

            {/* Theme Picker directly beneath Canvas */}
            <div className="flex flex-col gap-2 pt-1">
              <label className="text-xs text-[var(--ink-soft)] font-medium">
                海报底色主题 (Palette)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {themeLabels.map(([key, label]) => {
                  const isActive = theme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => updateDraft({ theme: key })}
                      className={`py-2 px-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[var(--ochre)] shadow-xs ring-1 ring-[var(--ochre)]'
                          : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ink-soft)]'
                      }`}
                      style={{
                        backgroundColor: POSTER_THEMES[key].bg,
                        color: POSTER_THEMES[key].text,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Stage 3 Box: Deliver & Export */}
          <div className="flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                  3
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">成果导出</span>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                当前规格：{currentSize.label} ({currentSize.w} × {currentSize.h} px)
              </span>
            </div>

            {/* Primary Action Button */}
            <button
              type="button"
              onClick={handleDownload}
              className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3.5 px-6 rounded-md font-medium text-sm sm:text-base transition-all hover:scale-[1.005] active:scale-[0.995] shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {downloadSuccess ? (
                <>
                  <span className="text-lg">✔</span>
                  <span>高清海报已成功导出并下载！</span>
                </>
              ) : (
                <>
                  <svg
                    className="w-5 h-5 shrink-0"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  <span>
                    下载高清海报 PNG ({currentSize.w}×{currentSize.h} · {ratio})
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
