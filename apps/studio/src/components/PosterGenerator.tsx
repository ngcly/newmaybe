import { useState, useEffect, useRef, useCallback } from 'react';
import { POSTER_THEMES } from '../constants/themes';
import type { ThemeType, RatioType, AlignType } from '../types';

const SIZES: Record<RatioType, { w: number; h: number }> = {
  '9:16': { w: 720, h: 1280 },
  '4:3': { w: 960, h: 720 },
  '1:1': { w: 800, h: 800 },
  '1.91:1': { w: 1200, h: 630 },
};

interface PosterGeneratorProps {
  initialQuote?: string;
}

export default function PosterGenerator({ initialQuote }: PosterGeneratorProps) {
  const [title, setTitle] = useState('思考的经纬');
  const [subtitle, setSubtitle] = useState('newmaybe.com 数字花园图谱上线');
  const [quote, setQuote] = useState(initialQuote || '留白处，自有新可能。');
  const [author, setAuthor] = useState('林');
  const [watermark, setWatermark] = useState('留');
  const [theme, setTheme] = useState<ThemeType>('paper');
  const [ratio, setRatio] = useState<RatioType>('1.91:1');
  const [align, setAlign] = useState<AlignType>('left');

  const canvasRef = useRef<HTMLCanvasElement>(null);

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
    const words = quote.split('');
    let line = '';
    let y = quoteStartY;
    const lineHeight = 50;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxQuoteWidth && n > 0) {
        ctx.fillText(line, align === 'center' ? width / 2 : 80, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, align === 'center' ? width / 2 : 80, y);

    // Stamp
    if (author) {
      const stampSize = 50;
      const stampX = width - 80 - stampSize;
      const stampY = height - 80 - stampSize;
      ctx.fillStyle = theme === 'ochre' || theme === 'sunset' ? '#2B2722' : colors.accent;
      ctx.fillRect(stampX, stampY, stampSize, stampSize);
      ctx.fillStyle = '#F7F3EC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(author.slice(0, 1), stampX + stampSize / 2, stampY + stampSize / 2);
    }
  }, [title, subtitle, quote, author, watermark, theme, ratio, align]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title || 'poster'}-${theme}-${ratio.replace(':', '_')}.png`;
    link.href = url;
    link.click();
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

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">新可能排版海报生成器</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          在前端通过 Canvas 像素级绘制高清多比例海报，支持自定义配色方案及文本对齐方式，可一键下载。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
          {/* Theme Picker */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--ink-soft)] font-medium">
              主题色板 Color Scheme
            </label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {themeLabels.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTheme(key)}
                  className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    theme === key
                      ? 'border-[var(--ochre)] shadow-sm'
                      : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                  }`}
                  style={
                    theme === key
                      ? { backgroundColor: POSTER_THEMES[key].bg, color: POSTER_THEMES[key].text }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Ratio */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--ink-soft)] font-medium">海报尺寸比例 Ratio</label>
            <div className="grid grid-cols-4 gap-1.5 mt-1">
              {(['9:16', '4:3', '1:1', '1.91:1'] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRatio(r)}
                  className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    ratio === r
                      ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-sm'
                      : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Alignment */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--ink-soft)] font-medium">
              排版对齐方式 Alignment
            </label>
            <div className="flex gap-2 mt-1">
              {(['left', 'center'] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAlign(a)}
                  className={`flex-grow py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    align === a
                      ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-sm'
                      : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                  }`}
                >
                  {a === 'left' ? '居左对齐 ⫷' : '居中对齐 ⫸'}
                </button>
              ))}
            </div>
          </div>

          {/* Text inputs */}
          <div className="flex flex-col gap-3 mt-1">
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--ink-soft)] font-medium">大标题 (Title)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--ink-soft)] font-medium">
                副标题/描述 (Subtitle)
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs text-[var(--ink-soft)] font-medium">
                引言/正文 (Quote)
              </label>
              <textarea
                value={quote}
                onChange={(e) => setQuote(e.target.value)}
                className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm h-24 focus:border-[var(--ochre)] outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  印款签名 (Stamp)
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  placeholder={'落款字，如"林"'}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">背景巨幅水印</label>
                <input
                  type="text"
                  value={watermark}
                  onChange={(e) => setWatermark(e.target.value)}
                  maxLength={1}
                  placeholder={'单字，如"雨"'}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleDownload}
            className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer mt-2"
          >
            导出并下载高清海报 PNG
          </button>
        </div>

        {/* Right: Canvas Preview */}
        <div className="lg:col-span-7 flex flex-col gap-3 w-full">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
            画布渲染预览 (Canvas Render)
          </span>
          <div className="w-full flex justify-center items-center bg-[var(--paper-deep)] border border-[var(--line)] rounded p-4 shadow-sm overflow-hidden">
            <canvas
              ref={canvasRef}
              className="w-full max-w-[500px] h-auto border border-[var(--line)]/50 rounded shadow-md bg-[var(--paper)]"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
