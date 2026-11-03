import { loadDraft, saveDraft, INITIAL_SAVE_STATUS } from '../../lib/draft-storage';
import { useState } from 'react';
import { CARD_THEMES } from '@newmaybe/design-tokens';
import { downloadCard } from './card-canvas';
import type { CardType, CardTheme, FragmentForm, ExcerptForm } from './types';
import { localIsoDate, yamlValue } from '@newmaybe/content/authoring';

interface CardExporterProps {
  initialContent?: string;
}

const STORAGE_KEY_FRAG = 'newmaybe:studio:draft:fragment:v2';
const STORAGE_KEY_EXC = 'newmaybe:studio:draft:excerpt:v2';

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
const SCALES = [
  [1, '1 倍', '800×500'],
  [2, '2 倍 · 推荐', '1600×1000'],
  [3, '3 倍 · 印刷', '2400×1500'],
] as const;

const DEFAULT_FRAG: FragmentForm = {
  content: '留白处，自有新可能。',
  mood: '凌晨三点',
  location: '咸宁',
  pubDate: localIsoDate(),
};

const DEFAULT_EXC: ExcerptForm = {
  content: '语言是一次皮肤的接触：我用我的语言去摩擦另一个人。',
  author: '罗兰·巴特',
  source: '《恋人絮语》',
  comment: '赋予语言以身体的触感，这是最温柔的浪漫。',
  pubDate: localIsoDate(),
  tags: '语言, 情感',
};

export default function CardExporter({ initialContent }: CardExporterProps) {
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [cardTheme, setCardTheme] = useState<CardTheme>('paper');
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [imageExportSuccess, setImageExportSuccess] = useState(false);
  const [saveStatus, setSaveStatus] = useState(INITIAL_SAVE_STATUS);

  const [fragForm, setFragForm] = useState<FragmentForm>(() => {
    const draft = loadDraft<FragmentForm>(STORAGE_KEY_FRAG, DEFAULT_FRAG);
    if (initialContent) {
      return { ...draft, content: initialContent };
    }
    return draft;
  });

  const [excForm, setExcForm] = useState<ExcerptForm>(() => {
    const draft = loadDraft<ExcerptForm>(STORAGE_KEY_EXC, DEFAULT_EXC);
    if (initialContent) {
      return { ...draft, content: initialContent };
    }
    return draft;
  });

  const updateFragForm = (updater: (prev: FragmentForm) => FragmentForm) => {
    const next = updater(fragForm);
    setFragForm(next);
    setSaveStatus(saveDraft(STORAGE_KEY_FRAG, next));
  };

  const updateExcForm = (updater: (prev: ExcerptForm) => ExcerptForm) => {
    const next = updater(excForm);
    setExcForm(next);
    setSaveStatus(saveDraft(STORAGE_KEY_EXC, next));
  };

  const handleResetDraft = () => {
    if (cardType === 'fragment') {
      const resetData = { ...DEFAULT_FRAG, pubDate: localIsoDate() };
      setFragForm(resetData);
      setSaveStatus(saveDraft(STORAGE_KEY_FRAG, resetData));
    } else {
      const resetData = { ...DEFAULT_EXC, pubDate: localIsoDate() };
      setExcForm(resetData);
      setSaveStatus(saveDraft(STORAGE_KEY_EXC, resetData));
    }
  };

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
    setTimeout(() => setExportSuccess(false), 2200);
  };

  const handleDownloadCard = async () => {
    await downloadCard(cardType, cardTheme, exportScale, fragForm, excForm);
    setImageExportSuccess(true);
    setTimeout(() => setImageExportSuccess(false), 2200);
  };

  const themeOptions: [CardTheme, string][] = [
    ['paper', '米纸'],
    ['dark', '黛墨'],
    ['ochre', '赭石'],
    ['bamboo', '竹青'],
    ['cinnabar', '朱砂'],
    ['withered', '枯木'],
  ];
  const colors = CARD_THEMES[cardTheme];
  const scaleDims = SCALES.find(([value]) => value === exportScale)?.[2];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-2xl font-medium text-[var(--ink)]">念头/拾遗卡片生成器</h2>
        <p className="text-sm text-[var(--ink-soft)]">
          填写内容即可预览纸墨卡片；草稿自动暂存在本机，可导出图片或复制 Markdown。
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_20rem] gap-8 xl:gap-10 items-start">
        {/* 预览优先：卡片按导出比例 16:10 呈现，导出操作紧随其下 */}
        <section aria-label="卡片预览与导出" className="xl:sticky xl:top-8 flex flex-col gap-4">
          <div className="p-6 sm:p-10 bg-[var(--paper-deep)] border border-[var(--line)] rounded-[var(--corner-md)]">
            <div
              style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.line }}
              className="mx-auto w-full max-w-[720px] aspect-[16/10] border p-[6%] flex flex-col justify-between relative shadow-md overflow-hidden transition-colors duration-300"
            >
              {cardType === 'fragment' ? (
                <>
                  <div
                    style={{ color: colors.textFaint }}
                    className="absolute top-[6%] right-[7%] text-xs tabular-nums"
                  >
                    {fragForm.pubDate}
                  </div>
                  <div className="flex-grow flex items-center justify-start py-6">
                    <p
                      style={{ color: colors.textSoft }}
                      className="font-serif text-base sm:text-lg leading-relaxed whitespace-pre-line text-justify"
                    >
                      {fragForm.content || '请输入正文内容...'}
                    </p>
                  </div>
                  <div
                    style={{ color: colors.textFaint, borderColor: colors.line + '99' }}
                    className="flex justify-between items-baseline border-t pt-4 mt-2 text-xs font-serif"
                  >
                    <span className="inline-flex items-center gap-1">
                      {fragForm.location ? (
                        <>
                          <svg
                            className="w-3 h-3"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={1.8}
                            aria-hidden="true"
                          >
                            <path d="M12 21c-4-4.2-6.5-7.6-6.5-11a6.5 6.5 0 0 1 13 0c0 3.4-2.5 6.8-6.5 11z" />
                            <circle cx="12" cy="10" r="2.2" />
                          </svg>
                          {fragForm.location}
                        </>
                      ) : (
                        '　'
                      )}
                    </span>
                    <span>{fragForm.mood || '　'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{ color: colors.accent }}
                    className="absolute top-3 left-5 opacity-15 text-5xl font-serif leading-none select-none pointer-events-none"
                  >
                    "
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-4">
                    <p
                      style={{ color: colors.text }}
                      className="font-serif text-base sm:text-lg leading-relaxed text-justify whitespace-pre-line relative z-10"
                    >
                      {excForm.content || '请输入引言原文...'}
                    </p>
                    <div className="text-right mt-4 flex flex-col items-end gap-1">
                      <span style={{ color: colors.textSoft }} className="text-sm font-medium">
                        — {excForm.author || '无名'}
                      </span>
                      {excForm.source && (
                        <span style={{ color: colors.textFaint }} className="text-xs">
                          {excForm.source}
                        </span>
                      )}
                    </div>
                  </div>
                  {excForm.comment && (
                    <div
                      style={{ borderColor: colors.line }}
                      className="border-t border-dashed pt-3 mt-3"
                    >
                      <span
                        style={{ color: colors.accent }}
                        className="block text-xs tracking-wider mb-1 font-serif"
                      >
                        随感
                      </span>
                      <p
                        style={{ color: colors.textSoft }}
                        className="text-xs text-justify font-serif"
                      >
                        {excForm.comment}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className={labelClass}>导出清晰度</span>
              <div className="flex gap-1.5">
                {SCALES.map(([value, label, dims]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={exportScale === value}
                    onClick={() => setExportScale(value)}
                    className={optionClass(exportScale === value)}
                    title={`分辨率 ${dims}px`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={handleDownloadCard}
                className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-[var(--corner-sm)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] text-sm font-medium transition-colors cursor-pointer"
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
                <span>
                  {imageExportSuccess ? '已导出，请查看下载' : `导出卡片图片 PNG · ${scaleDims}`}
                </span>
              </button>
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-[var(--corner-sm)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] text-sm transition-colors cursor-pointer"
              >
                {exportSuccess ? '已复制 Markdown' : '复制 Markdown'}
              </button>
            </div>
          </div>
        </section>

        <aside
          aria-label="卡片内容与配色"
          className="flex flex-col divide-y divide-[var(--line)] border-y border-[var(--line)]"
        >
          <div className="flex flex-col gap-4 py-6">
            <h3 className={groupTitle}>内容</h3>
            <div className="grid grid-cols-2 gap-1.5" role="group" aria-label="卡片类型">
              {(
                [
                  ['fragment', '念头'],
                  ['excerpt', '拾遗'],
                ] as const
              ).map(([type, label]) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={cardType === type}
                  onClick={() => setCardType(type)}
                  className={optionClass(cardType === type)}
                >
                  {label}
                </button>
              ))}
            </div>

            {cardType === 'fragment' ? (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="card-frag-content" className={labelClass}>
                      正文
                    </label>
                    <span className="text-xs text-[var(--ink-faint)]">
                      {fragForm.content.length} 字
                      {fragForm.content.length > 120 ? ' · 略长，建议精炼' : ' · 宜 20～100 字'}
                    </span>
                  </div>
                  <textarea
                    id="card-frag-content"
                    value={fragForm.content}
                    onChange={(e) =>
                      updateFragForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="在此写下这一刻的触动与念头..."
                    className={`${inputClass} p-3 leading-relaxed h-32 resize-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="card-frag-mood" className={labelClass}>
                      心绪
                    </label>
                    <input
                      id="card-frag-mood"
                      type="text"
                      value={fragForm.mood}
                      onChange={(e) =>
                        updateFragForm((prev) => ({ ...prev, mood: e.target.value }))
                      }
                      placeholder="如：凌晨三点"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="card-frag-location" className={labelClass}>
                      地点
                    </label>
                    <input
                      id="card-frag-location"
                      type="text"
                      value={fragForm.location}
                      onChange={(e) =>
                        updateFragForm((prev) => ({ ...prev, location: e.target.value }))
                      }
                      placeholder="如：咸宁"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="card-frag-date" className={labelClass}>
                      日期
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateFragForm((prev) => ({ ...prev, pubDate: localIsoDate() }))
                      }
                      className="text-xs text-[var(--ochre)] hover:underline cursor-pointer"
                    >
                      设为今日
                    </button>
                  </div>
                  <input
                    id="card-frag-date"
                    type="date"
                    value={fragForm.pubDate}
                    onChange={(e) =>
                      updateFragForm((prev) => ({ ...prev, pubDate: e.target.value }))
                    }
                    className={inputClass}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <label htmlFor="card-exc-content" className={labelClass}>
                      引文
                    </label>
                    <span className="text-xs text-[var(--ink-faint)]">
                      {excForm.content.length} 字
                    </span>
                  </div>
                  <textarea
                    id="card-exc-content"
                    value={excForm.content}
                    onChange={(e) =>
                      updateExcForm((prev) => ({ ...prev, content: e.target.value }))
                    }
                    placeholder="在此录入打动你的引言原文..."
                    className={`${inputClass} p-3 leading-relaxed h-28 resize-none`}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="card-exc-author" className={labelClass}>
                      作者
                    </label>
                    <input
                      id="card-exc-author"
                      type="text"
                      value={excForm.author}
                      onChange={(e) =>
                        updateExcForm((prev) => ({ ...prev, author: e.target.value }))
                      }
                      placeholder="如：罗兰·巴特"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="card-exc-source" className={labelClass}>
                      出处
                    </label>
                    <input
                      id="card-exc-source"
                      type="text"
                      value={excForm.source}
                      onChange={(e) =>
                        updateExcForm((prev) => ({ ...prev, source: e.target.value }))
                      }
                      placeholder="如：《恋人絮语》"
                      className={inputClass}
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="card-exc-comment" className={labelClass}>
                    随感
                  </label>
                  <input
                    id="card-exc-comment"
                    type="text"
                    value={excForm.comment}
                    onChange={(e) =>
                      updateExcForm((prev) => ({ ...prev, comment: e.target.value }))
                    }
                    placeholder="一句短评，显示在卡片底部"
                    className={inputClass}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="card-exc-tags" className={labelClass}>
                      标签
                    </label>
                    <input
                      id="card-exc-tags"
                      type="text"
                      value={excForm.tags}
                      onChange={(e) => updateExcForm((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="逗号分隔，如：语言, 情感"
                      className={inputClass}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between items-baseline">
                      <label htmlFor="card-exc-date" className={labelClass}>
                        日期
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          updateExcForm((prev) => ({ ...prev, pubDate: localIsoDate() }))
                        }
                        className="text-xs text-[var(--ochre)] hover:underline cursor-pointer"
                      >
                        设为今日
                      </button>
                    </div>
                    <input
                      id="card-exc-date"
                      type="date"
                      value={excForm.pubDate}
                      onChange={(e) =>
                        updateExcForm((prev) => ({ ...prev, pubDate: e.target.value }))
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-3 py-6">
            <h3 className={groupTitle}>配色</h3>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={cardTheme === key}
                  onClick={() => setCardTheme(key)}
                  className={`py-2 rounded-[var(--corner-sm)] text-xs border transition-shadow cursor-pointer ${
                    cardTheme === key
                      ? 'border-[var(--ochre)] ring-1 ring-[var(--ochre)] ring-offset-2 ring-offset-[var(--paper)]'
                      : 'border-[var(--line)]'
                  }`}
                  style={{ backgroundColor: CARD_THEMES[key].bg, color: CARD_THEMES[key].text }}
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
              title="恢复为初始默认范例"
            >
              重置为范例
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
