import { fitHeading } from '../features/creative/canvas-text';
import { loadDraft, saveDraft, INITIAL_SAVE_STATUS } from '../lib/draft-storage';
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

const groupTitle = 'text-sm font-medium text-[var(--ink)]';
const labelClass = 'text-xs text-[var(--ink-soft)]';
const inputClass =
  'p-2 border border-[var(--line)] bg-[var(--paper)] rounded-[var(--corner-sm)] text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors';
const optionClass = (active: boolean) =>
  `py-1.5 px-2 rounded-[var(--corner-sm)] text-xs border transition-colors cursor-pointer ${
    active
      ? 'border-[var(--ochre)] text-[var(--ochre)] bg-[var(--paper)]'
      : 'border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
  }`;

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

  const [saveStatus, setSaveStatus] = useState(INITIAL_SAVE_STATUS);
  const [headingNotice, setHeadingNotice] = useState('');
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const updateDraft = (patch: Partial<PosterDraft>) => {
    const next = { ...draft, ...patch };
    setDraft(next);
    setSaveStatus(saveDraft(STORAGE_KEY_POSTER, next));
  };

  const handleResetDraft = () => {
    setDraft(DEFAULT_POSTER);
    setSaveStatus(saveDraft(STORAGE_KEY_POSTER, DEFAULT_POSTER));
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
    const fittedTitle = fitHeading(ctx, title, width - 160, 64, 28);
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(fittedTitle.text, width / 2, titleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(fittedTitle.text, 80, titleY);
    }

    // Subtitle
    ctx.fillStyle = colors.accent;
    const fittedSubtitle = fitHeading(ctx, subtitle, width - 160, 24, 16);
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(fittedSubtitle.text, width / 2, subtitleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(fittedSubtitle.text, 80, subtitleY);
    }

    setHeadingNotice(
      fittedTitle.truncated || fittedSubtitle.truncated
        ? '标题或副标题已缩小，仍超出画幅的部分以省略号显示；请缩短文案后导出。'
        : fittedTitle.adjusted || fittedSubtitle.adjusted
          ? '标题或副标题已自动缩小以适应画幅。'
          : '',
    );

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
    ctx.font = '32px "Noto Serif SC", "Songti SC", serif';
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
      document.fonts.load('normal 32px "Noto Serif SC"'),
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
    ['paper', '米纸'],
    ['dark', '暗夜'],
    ['ochre', '赭石'],
    ['bamboo', '竹青'],
    ['sunset', '晚霞'],
    ['cinnabar', '朱砂'],
    ['withered', '枯木'],
  ];

  const currentSize = SIZES[ratio];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-medium text-[var(--ink)]">新可能排版海报生成器</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          写文案、选比例与底色，画布即时出图，满意后导出高清 PNG。
        </p>
      </header>

      {headingNotice && (
        <p role="status" className="text-sm text-[var(--ochre)]">
          {headingNotice}
        </p>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-8 xl:gap-10 items-start">
        {/* 预览优先：画布占主体，宽屏时随页面停留，较窄时排在参数上方 */}
        <section aria-label="海报预览与导出" className="xl:sticky xl:top-8 flex flex-col gap-4">
          <div className="flex justify-center items-center min-h-72 p-6 sm:p-10 bg-[var(--paper-deep)] border border-[var(--line)] rounded-[var(--corner-md)]">
            <canvas
              id="poster-preview"
              ref={canvasRef}
              className="block w-auto h-auto max-w-full max-h-[68vh] shadow-md"
            />
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span className="text-xs text-[var(--ink-faint)]">
              {currentSize.label} · {currentSize.w} × {currentSize.h}
            </span>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[var(--corner-sm)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] text-sm font-medium transition-colors cursor-pointer"
            >
              <svg
                className="w-4 h-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.8}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>{downloadSuccess ? '已导出，请查看下载' : '下载高清海报 PNG'}</span>
            </button>
          </div>
        </section>

        <aside
          aria-label="海报参数"
          className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]"
        >
          <div className="flex flex-col gap-4 py-6">
            <h3 className={groupTitle}>文案</h3>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="poster-title" className={labelClass}>
                大标题
              </label>
              <input
                id="poster-title"
                type="text"
                value={title}
                onChange={(e) => updateDraft({ title: e.target.value })}
                placeholder="海报大标题..."
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="poster-subtitle" className={labelClass}>
                副标题
              </label>
              <input
                id="poster-subtitle"
                type="text"
                value={subtitle}
                onChange={(e) => updateDraft({ subtitle: e.target.value })}
                placeholder="简明副标题..."
                className={inputClass}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <label htmlFor="poster-quote" className={labelClass}>
                  正文
                </label>
                <span className="text-xs text-[var(--ink-faint)]">
                  {quote.length} 字{quote.length > 80 ? ' · 略长，画面可能紧凑' : ' · 宜 15～60 字'}
                </span>
              </div>
              <textarea
                id="poster-quote"
                value={quote}
                onChange={(e) => updateDraft({ quote: e.target.value })}
                placeholder="引人深思的正文或摘录..."
                className={`${inputClass} p-3 leading-relaxed h-28 resize-none`}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="poster-stamp" className={labelClass}>
                  落款印章
                </label>
                <input
                  id="poster-stamp"
                  type="text"
                  value={author}
                  onChange={(e) => updateDraft({ author: e.target.value })}
                  placeholder={'如“林”'}
                  maxLength={4}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="poster-watermark" className={labelClass}>
                  水印字
                </label>
                <input
                  id="poster-watermark"
                  type="text"
                  value={watermark}
                  onChange={(e) => updateDraft({ watermark: e.target.value })}
                  maxLength={1}
                  placeholder={'如“留”'}
                  className={inputClass}
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4 py-6">
            <h3 className={groupTitle}>版式</h3>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>尺寸比例</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['9:16', '4:3', '1:1', '1.91:1'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={ratio === r}
                    onClick={() => updateDraft({ ratio: r })}
                    className={`${optionClass(ratio === r)} flex flex-col items-center`}
                  >
                    <span className="font-semibold">{r}</span>
                    <span className="text-xs opacity-80">
                      {SIZES[r].w}×{SIZES[r].h}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className={labelClass}>对齐</span>
              <div className="grid grid-cols-2 gap-1.5">
                {(['left', 'center'] as const).map((a) => (
                  <button
                    key={a}
                    type="button"
                    aria-pressed={align === a}
                    onClick={() => updateDraft({ align: a })}
                    className={optionClass(align === a)}
                  >
                    {a === 'left' ? '居左' : '居中'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 py-6">
            <h3 className={groupTitle}>底色</h3>
            <div className="grid grid-cols-4 gap-2">
              {themeLabels.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={theme === key}
                  onClick={() => updateDraft({ theme: key })}
                  className={`py-2 rounded-[var(--corner-sm)] text-xs border transition-shadow cursor-pointer ${
                    theme === key
                      ? 'border-[var(--ochre)] ring-1 ring-[var(--ochre)] ring-offset-2 ring-offset-[var(--paper)]'
                      : 'border-[var(--line)]'
                  }`}
                  style={{ backgroundColor: POSTER_THEMES[key].bg, color: POSTER_THEMES[key].text }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 py-4">
            <span
              role={saveStatus.saved || saveStatus === INITIAL_SAVE_STATUS ? 'status' : 'alert'}
              className="text-xs text-[var(--ink-faint)]"
            >
              {saveStatus.message}
            </span>
            <button
              type="button"
              onClick={handleResetDraft}
              className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
              title="恢复为初始默认文案"
            >
              重置文案
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
