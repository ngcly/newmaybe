import { useState } from 'react';
import { CARD_THEMES } from '@newmaybe/design-tokens';
import { downloadCard } from './card-canvas';
import type { CardType, CardTheme, FragmentForm, ExcerptForm } from './types';
import { localIsoDate, yamlValue } from '@newmaybe/content/authoring';

interface CardExporterProps {
  initialContent?: string;
}

export default function CardExporter({ initialContent }: CardExporterProps) {
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [cardTheme, setCardTheme] = useState<CardTheme>('paper');
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [imageExportSuccess, setImageExportSuccess] = useState(false);

  const [fragForm, setFragForm] = useState<FragmentForm>({
    content: initialContent || '留白处，自有新可能。',
    mood: '凌晨三点',
    location: '咸宁',
    pubDate: localIsoDate(),
  });

  const [excForm, setExcForm] = useState<ExcerptForm>({
    content: initialContent || '语言是一次皮肤的接触：我用我的语言去摩擦另一个人。',
    author: '罗兰·巴特',
    source: '《恋人絮语》',
    comment: '赋予语言以身体的触感，这是最温柔的浪漫。',
    pubDate: localIsoDate(),
    tags: '语言, 情感',
  });

  const handleExportMarkdown = () => {
    let mdContent: string;
    if (cardType === 'fragment') {
      mdContent = `---
pubDate: ${fragForm.pubDate}
mood: ${yamlValue(fragForm.mood)}
location: ${yamlValue(fragForm.location)}
---
${fragForm.content}
`;
    } else {
      const tagList = excForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      mdContent = `---
author: ${yamlValue(excForm.author)}
source: ${yamlValue(excForm.source)}
pubDate: ${excForm.pubDate}
tags: ${yamlValue(tagList)}
comment: ${yamlValue(excForm.comment)}
---
${excForm.content}
`;
    }

    void navigator.clipboard.writeText(mdContent);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const handleDownloadCard = async () => {
    await downloadCard(cardType, cardTheme, exportScale, fragForm, excForm);
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
                  aria-label="念头正文"
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
                    aria-label="此刻氛围/心情"
                    value={fragForm.mood}
                    onChange={(e) => setFragForm({ ...fragForm, mood: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">发生地点</label>
                  <input
                    type="text"
                    aria-label="发生地点"
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
                  aria-label="发布日期"
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
                  aria-label="引言原文"
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
                    aria-label="原作者"
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
                    aria-label="书籍/篇名出处"
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
                  aria-label="个人短评/随感"
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
                    aria-label="标签（以逗号分隔）"
                    value={excForm.tags}
                    onChange={(e) => setExcForm({ ...excForm, tags: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">摘录日期</label>
                  <input
                    type="date"
                    aria-label="摘录日期"
                    value={excForm.pubDate}
                    onChange={(e) => setExcForm({ ...excForm, pubDate: e.target.value })}
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-2.5 mt-2">
            <div className="flex items-center justify-between text-xs text-[var(--ink-soft)] px-1">
              <span>导出清晰度：</span>
              <div className="flex gap-1 bg-[var(--paper)] border border-[var(--line)] rounded p-0.5">
                {([1, 2, 3] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setExportScale(s)}
                    className={`px-2 py-0.5 rounded text-xs transition-all cursor-pointer ${
                      exportScale === s
                        ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium shadow-xs'
                        : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {s}x {s === 1 ? '标准' : s === 2 ? '超清' : '印刷'}
                  </button>
                ))}
              </div>
            </div>

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
              {imageExportSuccess
                ? '图片已下载！✔'
                : `导出卡片图片 (${exportScale}x ${exportScale === 1 ? '标准' : exportScale === 2 ? '超清' : '印刷级'} PNG)`}
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
