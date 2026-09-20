import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Download, Copy, Check, Sparkles } from 'lucide-react';
import { light } from '@newmaybe/design-tokens';

interface QuoteCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleTitle: string;
  author: string;
  authorSeal?: string;
  initialQuote: string;
  topicName: string;
}

export default function QuoteCardModal({
  isOpen,
  onClose,
  articleTitle,
  author,
  authorSeal = '文友',
  initialQuote,
  topicName,
}: QuoteCardModalProps) {
  const [quoteText, setQuoteText] = useState(initialQuote);
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Render to canvas
  const drawCard = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Retina scale
    const dpr = 2;
    const width = 640;
    const height = 820;

    canvas.width = width * dpr;
    canvas.height = height * dpr;

    ctx.scale(dpr, dpr);

    // Background: Warm Rice Paper
    ctx.fillStyle = light.paper;
    ctx.fillRect(0, 0, width, height);

    // Subtle paper edge border
    ctx.strokeStyle = light.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, width - 40, height - 40);

    // Inner subtle decorative dashed border
    ctx.strokeStyle = light.line;
    ctx.lineWidth = 0.8;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(28, 28, width - 56, height - 56);
    ctx.setLineDash([]);

    // Top Header: Branding & Topic
    ctx.fillStyle = light.ochre;
    ctx.font = 'italic 13px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.textAlign = 'left';
    ctx.fillText(`NEWMAYBE CLUB · ${topicName.toUpperCase()}`, 52, 68);

    ctx.fillStyle = light['ink-faint'];
    ctx.font = '12px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.textAlign = 'right';
    ctx.fillText('文友雅集 · 纸签便览', width - 52, 68);

    // Divider
    ctx.strokeStyle = light.line;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(52, 86);
    ctx.lineTo(width - 52, 86);
    ctx.stroke();

    // Decorative Quote Marks
    ctx.fillStyle = light.ochre;
    ctx.globalAlpha = 0.18;
    ctx.font = '72px "Noto Serif SC", "Songti SC", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.fillText('“', 48, 158);
    ctx.globalAlpha = 1;

    // Body: Wrap and draw quote text
    ctx.fillStyle = light.ink;
    ctx.font = '300 20px/1.8 "Noto Serif SC", "Songti SC", "SimSun", serif';
    const maxWidth = width - 110;
    const lineHeight = 38;
    const startX = 55;
    const startY = 175;

    // Line wrapping algorithm
    const lines: string[] = [];
    const paragraphs = quoteText.split('\n');

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      let currentLine = '';
      for (const char of para) {
        const testLine = currentLine + char;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine.length > 0) {
          lines.push(currentLine);
          currentLine = char;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) lines.push(currentLine);
    }

    // Limit visible lines to fit card
    const maxVisibleLines = 10;
    const visibleLines = lines.slice(0, maxVisibleLines);
    if (lines.length > maxVisibleLines && visibleLines.length > 0) {
      visibleLines[visibleLines.length - 1] =
        visibleLines[visibleLines.length - 1].slice(0, -1) + '……';
    }

    visibleLines.forEach((line, i) => {
      ctx.fillText(line, startX, startY + i * lineHeight);
    });

    // Decorative Closing Quote Mark
    ctx.fillStyle = light.ochre;
    ctx.globalAlpha = 0.18;
    ctx.font = '72px "Noto Serif SC", "Songti SC", Georgia, serif';
    ctx.textAlign = 'right';
    const lastY = Math.min(height - 230, startY + visibleLines.length * lineHeight + 20);
    ctx.fillText('”', width - 52, lastY);
    ctx.globalAlpha = 1;

    // Bottom Colophon Area
    const colophonY = height - 160;

    // Divider
    ctx.strokeStyle = light.line;
    ctx.beginPath();
    ctx.moveTo(52, colophonY);
    ctx.lineTo(width - 52, colophonY);
    ctx.stroke();

    // Source Article & Author info
    ctx.textAlign = 'left';
    ctx.fillStyle = light['ink-soft'];
    ctx.font = '13px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.fillText('引自篇章', 52, colophonY + 34);

    ctx.fillStyle = light.ink;
    ctx.font = 'bold 15px "Noto Serif SC", "Songti SC", "SimSun", serif';
    const displayTitle = articleTitle.length > 22 ? articleTitle.slice(0, 21) + '…' : articleTitle;
    ctx.fillText(`《${displayTitle}》`, 52, colophonY + 58);

    ctx.fillStyle = light['ink-soft'];
    ctx.font = '13px "Noto Serif SC", "Songti SC", "SimSun", serif';
    ctx.fillText(`作者 · ${author}`, 52, colophonY + 82);

    // Author Seal Stamp (朱砂印)
    const sealSize = 52;
    const sealX = width - 52 - sealSize;
    const sealY = colophonY + 30;

    ctx.strokeStyle = light.cinnabar;
    ctx.lineWidth = 1.8;
    ctx.strokeRect(sealX, sealY, sealSize, sealSize);

    ctx.fillStyle = light.cinnabar;
    ctx.font = '15px "Noto Serif SC", "STKaiti", "KaiTi", serif';
    ctx.textAlign = 'center';
    const sealChars = (authorSeal || '文友').slice(0, 2);
    ctx.fillText(sealChars[0] || '文', sealX + sealSize / 2, sealY + 22);
    ctx.fillText(sealChars[1] || '友', sealX + sealSize / 2, sealY + 42);

    // Footer Watermark
    ctx.fillStyle = light['ink-faint'];
    ctx.font = '11px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'center';
    ctx.fillText('club.newmaybe.com · 字里相逢，行间留白', width / 2, height - 38);
  }, [quoteText, articleTitle, author, authorSeal, topicName]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const timer = setTimeout(() => {
      drawCard();
    }, 50);
    return () => {
      clearTimeout(timer);
    };
  }, [isOpen, drawCard]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `雅集便签-${articleTitle.slice(0, 8)}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  const handleCopyText = async () => {
    try {
      await navigator.clipboard.writeText(
        `“${quoteText.trim()}” —— 《${articleTitle}》· ${author}（引自 newmaybe.club 文友雅集）`,
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={onClose} />
      <div
        className="relative w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-sm shadow-2xl p-6 md:p-8 z-10 max-h-[95vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[var(--line)] mb-5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--ochre)]" />
            <h2 className="font-serif font-semibold text-lg text-[var(--ink)]">
              生成雅集纸签 · 读者书签
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left / Top: Custom Quote Editor */}
          <div className="md:col-span-6 flex flex-col gap-4">
            <div>
              <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1.5">
                便签摘录文句（可自由修剪或补充）
              </label>
              <textarea
                rows={5}
                value={quoteText}
                onChange={(e) => setQuoteText(e.target.value)}
                placeholder="输入或修改你想摘录的金句段落..."
                className="w-full px-3.5 py-2.5 text-sm font-serif leading-relaxed bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-y"
              />
            </div>

            <div className="p-3 rounded border border-dashed border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))] text-xs font-serif text-[var(--ink-soft)] space-y-1.5 leading-relaxed">
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-faint)]">出处：</span>
                <span className="font-medium text-[var(--ink)]">《{articleTitle}》</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-faint)]">文友：</span>
                <span>{author}</span>
                {authorSeal && (
                  <span className="text-[10px] px-1 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)]">
                    {authorSeal}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[var(--ink-faint)]">专题：</span>
                <span>{topicName}</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleDownload}
                disabled={!quoteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer shadow-xs disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                <span>保存高清书签便签 (PNG)</span>
              </button>

              <button
                onClick={handleCopyText}
                disabled={!quoteText.trim()}
                className="w-full flex items-center justify-center gap-2 py-2 px-4 text-xs font-serif text-[var(--ink-soft)] bg-[var(--paper-deep)] hover:bg-[color-mix(in_srgb,var(--paper-deep)_80%,var(--ink))] border border-[var(--line)] rounded transition-all cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-[var(--bamboo)]" />
                    <span className="text-[var(--bamboo)]">已复制金句到剪贴板</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>复制金句引文</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Right / Bottom: Live Preview Canvas */}
          <div className="md:col-span-6 flex flex-col items-center">
            <div className="border border-[var(--line)] rounded shadow-md overflow-hidden w-full max-w-[280px] sm:max-w-[320px] bg-[var(--paper)]">
              <canvas ref={canvasRef} className="w-full h-auto block" />
            </div>
            <span className="text-[11px] font-serif text-[var(--ink-faint)] mt-2 italic">
              宣纸底色 · 朱砂印章 · 雅集便览
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
