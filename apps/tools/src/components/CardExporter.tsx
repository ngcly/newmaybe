import { useState } from 'react';
import { CARD_THEMES } from '../constants/themes';
import type { CardType, CardTheme } from '../types';

interface CardExporterProps {
  initialContent?: string;
}

export interface FragmentForm {
  content: string;
  mood: string;
  location: string;
  pubDate: string;
}

export interface ExcerptForm {
  content: string;
  author: string;
  source: string;
  comment: string;
  pubDate: string;
  tags: string;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const paragraphs = text.split('\n');
  let currentY = y;

  for (const para of paragraphs) {
    if (!para.trim()) {
      currentY += lineHeight / 2;
      continue;
    }

    const words = para.split('');
    let line = '';

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n];
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n];
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    currentY += lineHeight;
  }
  return currentY;
}

export default function CardExporter({ initialContent }: CardExporterProps) {
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [cardTheme, setCardTheme] = useState<CardTheme>('paper');
  const [exportSuccess, setExportSuccess] = useState(false);
  const [imageExportSuccess, setImageExportSuccess] = useState(false);

  const [fragForm, setFragForm] = useState<FragmentForm>({
    content: initialContent || '留白处，自有新可能。',
    mood: '凌晨三点',
    location: '咸宁',
    pubDate: new Date().toISOString().split('T')[0],
  });

  const [excForm, setExcForm] = useState<ExcerptForm>({
    content: initialContent || '语言是一次皮肤的接触：我用我的语言去摩擦另一个人。',
    author: '罗兰·巴特',
    source: '《恋人絮语》',
    comment: '赋予语言以身体的触感，这是最温柔的浪漫。',
    pubDate: new Date().toISOString().split('T')[0],
    tags: '语言, 情感',
  });

  const handleExportMarkdown = () => {
    let mdContent: string;
    if (cardType === 'fragment') {
      mdContent = `---
pubDate: ${fragForm.pubDate}
mood: ${fragForm.mood}
location: ${fragForm.location}
---
${fragForm.content}
`;
    } else {
      const tagList = excForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      mdContent = `---
author: ${excForm.author}
source: ${excForm.source}
pubDate: ${excForm.pubDate}
tags: [${tagList.map((t) => `"${t}"`).join(', ')}]
comment: ${excForm.comment}
---
${excForm.content}
`;
    }

    void navigator.clipboard.writeText(mdContent);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const themeColors = CARD_THEMES[cardTheme];

    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = themeColors.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);

    if (cardType === 'fragment') {
      ctx.fillStyle = themeColors.textFaint;
      ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(fragForm.pubDate, canvas.width - 60, 60);

      ctx.fillStyle = themeColors.textSoft;
      ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      wrapText(ctx, fragForm.content, 60, 120, canvas.width - 120, 38);

      ctx.strokeStyle = themeColors.line + '99';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(60, canvas.height - 90);
      ctx.lineTo(canvas.width - 60, canvas.height - 90);
      ctx.stroke();

      ctx.fillStyle = themeColors.textFaint;
      ctx.font = '14px "Noto Serif SC", "Songti SC", serif';
      ctx.textBaseline = 'middle';
      if (fragForm.location) {
        ctx.textAlign = 'left';
        ctx.fillText(`📍 ${fragForm.location}`, 60, canvas.height - 65);
      }
      if (fragForm.mood) {
        ctx.textAlign = 'right';
        ctx.fillText(fragForm.mood, canvas.width - 60, canvas.height - 65);
      }
    } else {
      ctx.fillStyle = themeColors.accent;
      ctx.globalAlpha = 0.15;
      ctx.font = 'normal 90px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('"', 50, 45);
      ctx.globalAlpha = 1.0;

      ctx.fillStyle = themeColors.text;
      ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';

      const endY = wrapText(ctx, excForm.content, 60, 110, canvas.width - 120, 38);

      ctx.fillStyle = themeColors.textSoft;
      ctx.font = '16px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'right';
      const authorY = endY + 15 > canvas.height - 180 ? canvas.height - 170 : endY + 15;
      ctx.fillText(`— ${excForm.author}`, canvas.width - 60, authorY);
      if (excForm.source) {
        ctx.fillStyle = themeColors.textFaint;
        ctx.font = 'italic 14px "Noto Serif SC", "Songti SC", serif';
        ctx.fillText(excForm.source, canvas.width - 60, authorY + 22);
      }

      if (excForm.comment) {
        const commentStartY = canvas.height - 110;
        ctx.strokeStyle = themeColors.line;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(60, commentStartY);
        ctx.lineTo(canvas.width - 60, commentStartY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.fillStyle = themeColors.accent;
        ctx.font = 'bold 11px "Noto Serif SC", "Songti SC", serif';
        ctx.textAlign = 'left';
        ctx.fillText('随感', 60, commentStartY + 15);

        ctx.fillStyle = themeColors.textSoft;
        ctx.font = '14px "Noto Serif SC", "Songti SC", serif';
        wrapText(ctx, excForm.comment, 60, commentStartY + 35, canvas.width - 120, 22);
      }
    }

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `newmaybe-card-${cardType}-${cardTheme}.png`;
    link.href = url;
    link.click();

    setImageExportSuccess(true);
    setTimeout(() => setImageExportSuccess(false), 2000);
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">念头/拾遗卡片生成器</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          可视化撰写灵感片段，高仿真预览主站卡片样式，支持切换多款底色，并可一键导出图片与源码。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Controls */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
          {/* Card type toggle */}
          <div className="flex gap-2 p-1 bg-[var(--paper)] border border-[var(--line)] rounded">
            <button
              onClick={() => setCardType('fragment')}
              className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                cardType === 'fragment'
                  ? 'bg-[var(--ochre)] text-[var(--paper)] border-none'
                  : 'text-[var(--ink-soft)] bg-transparent border-none'
              }`}
            >
              念头 (Fragment)
            </button>
            <button
              onClick={() => setCardType('excerpt')}
              className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                cardType === 'excerpt'
                  ? 'bg-[var(--ochre)] text-[var(--paper)] border-none'
                  : 'text-[var(--ink-soft)] bg-transparent border-none'
              }`}
            >
              拾遗 (Excerpt)
            </button>
          </div>

          {/* Theme picker */}
          <div className="flex flex-col gap-1">
            <label className="text-xs text-[var(--ink-soft)] font-medium">卡片配色主题 Theme</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {(
                [
                  ['paper', '米纸底 📄'],
                  ['dark', '黛墨底 🌙'],
                  ['ochre', '赭石底 🔴'],
                  ['bamboo', '竹青底 🍃'],
                  ['cinnabar', '朱砂底 🏮'],
                  ['withered', '枯木底 🍂'],
                ] as [CardTheme, string][]
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCardTheme(key)}
                  className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                    cardTheme === key
                      ? 'border-[var(--ochre)] shadow-sm'
                      : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                  }`}
                  style={
                    cardTheme === key
                      ? { backgroundColor: CARD_THEMES[key].bg, color: CARD_THEMES[key].text }
                      : undefined
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Fragment or Excerpt form */}
          {cardType === 'fragment' ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">念头正文</label>
                <textarea
                  value={fragForm.content}
                  onChange={(e) => setFragForm({ ...fragForm, content: e.target.value })}
                  className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm h-32 focus:border-[var(--ochre)] outline-none resize-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    此刻氛围/心情
                  </label>
                  <input
                    type="text"
                    value={fragForm.mood}
                    onChange={(e) => setFragForm({ ...fragForm, mood: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">发生地点</label>
                  <input
                    type="text"
                    value={fragForm.location}
                    onChange={(e) => setFragForm({ ...fragForm, location: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">发布日期</label>
                <input
                  type="date"
                  value={fragForm.pubDate}
                  onChange={(e) => setFragForm({ ...fragForm, pubDate: e.target.value })}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">引言原文</label>
                <textarea
                  value={excForm.content}
                  onChange={(e) => setExcForm({ ...excForm, content: e.target.value })}
                  className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm h-28 focus:border-[var(--ochre)] outline-none resize-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">原作者</label>
                  <input
                    type="text"
                    value={excForm.author}
                    onChange={(e) => setExcForm({ ...excForm, author: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    书籍/篇名出处
                  </label>
                  <input
                    type="text"
                    value={excForm.source}
                    onChange={(e) => setExcForm({ ...excForm, source: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[var(--ink-soft)] font-medium">个人短评/随感</label>
                <input
                  type="text"
                  value={excForm.comment}
                  onChange={(e) => setExcForm({ ...excForm, comment: e.target.value })}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    标签 (以逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={excForm.tags}
                    onChange={(e) => setExcForm({ ...excForm, tags: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">摘录日期</label>
                  <input
                    type="date"
                    value={excForm.pubDate}
                    onChange={(e) => setExcForm({ ...excForm, pubDate: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2 mt-2">
            <button
              onClick={handleExportMarkdown}
              className="w-full bg-[var(--paper)] hover:bg-[var(--paper-deep)] border border-[var(--line)] text-[var(--ink-soft)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer"
            >
              {exportSuccess ? '已复制 Markdown 源码！✔' : '复制 Markdown 源码'}
            </button>
            <button
              onClick={handleDownloadCard}
              className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer"
            >
              {imageExportSuccess ? '图片已下载！✔' : '导出卡片图片 (PNG)'}
            </button>
          </div>
        </div>

        {/* Right: Card Preview */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
            实时卡片预览 (Live Preview)
          </span>
          <div
            style={{
              backgroundColor: CARD_THEMES[cardTheme].bg,
              color: CARD_THEMES[cardTheme].text,
              borderColor: CARD_THEMES[cardTheme].line,
            }}
            className="border rounded p-8 md:p-12 min-h-80 flex flex-col justify-between relative shadow-sm transition-all duration-300"
          >
            {cardType === 'fragment' ? (
              <>
                <div
                  style={{ color: CARD_THEMES[cardTheme].textFaint }}
                  className="absolute top-4 right-6 text-xs italic font-serif"
                >
                  {fragForm.pubDate}
                </div>
                <div className="flex-grow flex items-center justify-start py-8">
                  <p
                    style={{ color: CARD_THEMES[cardTheme].textSoft }}
                    className="font-serif text-lg leading-relaxed whitespace-pre-line text-justify"
                  >
                    {fragForm.content}
                  </p>
                </div>
                <div
                  style={{
                    color: CARD_THEMES[cardTheme].textFaint,
                    borderColor: CARD_THEMES[cardTheme].line + '99',
                  }}
                  className="flex justify-between items-baseline border-t pt-4 mt-4 text-xs font-serif"
                >
                  <span>{fragForm.location ? `📍 ${fragForm.location}` : ''}</span>
                  <span>{fragForm.mood ? `${fragForm.mood}` : ''}</span>
                </div>
              </>
            ) : (
              <>
                <div
                  style={{ color: CARD_THEMES[cardTheme].accent }}
                  className="absolute top-4 left-6 opacity-15 text-5xl font-serif leading-none select-none"
                >
                  "
                </div>
                <div className="flex-grow flex flex-col justify-between py-6">
                  <p
                    style={{ color: CARD_THEMES[cardTheme].text }}
                    className="font-serif text-lg leading-relaxed text-justify whitespace-pre-line relative z-10"
                  >
                    {excForm.content}
                  </p>
                  <div className="text-right mt-6 flex flex-col items-end gap-1">
                    <span
                      style={{ color: CARD_THEMES[cardTheme].textSoft }}
                      className="text-sm font-medium"
                    >
                      — {excForm.author}
                    </span>
                    {excForm.source && (
                      <span
                        style={{ color: CARD_THEMES[cardTheme].textFaint }}
                        className="text-xs italic"
                      >
                        {excForm.source}
                      </span>
                    )}
                  </div>
                </div>
                {excForm.comment && (
                  <div
                    style={{ borderColor: CARD_THEMES[cardTheme].line }}
                    className="border-t border-dashed pt-4 mt-4"
                  >
                    <span
                      style={{ color: CARD_THEMES[cardTheme].accent }}
                      className="block text-[10px] tracking-wider uppercase mb-1"
                    >
                      随感
                    </span>
                    <p
                      style={{ color: CARD_THEMES[cardTheme].textSoft }}
                      className="text-xs text-justify"
                    >
                      {excForm.comment}
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
