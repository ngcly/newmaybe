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

export default function CardExporter({ initialContent }: CardExporterProps) {
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [cardTheme, setCardTheme] = useState<CardTheme>('paper');
  const [exportScale, setExportScale] = useState<1 | 2 | 3>(2);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [imageExportSuccess, setImageExportSuccess] = useState(false);
  const [savedAt, setSavedAt] = useState<string>('');

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
    setFragForm((prev) => {
      const next = updater(prev);
      saveDraft(STORAGE_KEY_FRAG, next);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSavedAt(timeStr);
      return next;
    });
  };

  const updateExcForm = (updater: (prev: ExcerptForm) => ExcerptForm) => {
    setExcForm((prev) => {
      const next = updater(prev);
      saveDraft(STORAGE_KEY_EXC, next);
      const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setSavedAt(timeStr);
      return next;
    });
  };

  const handleResetDraft = () => {
    if (cardType === 'fragment') {
      const resetData = { ...DEFAULT_FRAG, pubDate: localIsoDate() };
      setFragForm(resetData);
      saveDraft(STORAGE_KEY_FRAG, resetData);
    } else {
      const resetData = { ...DEFAULT_EXC, pubDate: localIsoDate() };
      setExcForm(resetData);
      saveDraft(STORAGE_KEY_EXC, resetData);
    }
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setSavedAt(timeStr);
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

  const themeOptions: [CardTheme, string, string][] = [
    ['paper', '米纸底', '📄'],
    ['dark', '黛墨底', '🌙'],
    ['ochre', '赭石底', '🔴'],
    ['bamboo', '竹青底', '🍃'],
    ['cinnabar', '朱砂底', '🏮'],
    ['withered', '枯木底', '🍂'],
  ];

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Tool Header with Pipeline Rhythm */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-serif text-[var(--ink-faint)]">
          <span className="text-[var(--ochre)] font-medium">阶段 1：输入内容</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 2：调校预览</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 3：成果导出</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-2xl font-medium text-[var(--ink)]">念头/拾遗卡片生成器</h2>
          <span className="text-xs text-[var(--ink-faint)]">
            高仿真纸墨卡片 · 自动暂存 · 多倍率无损导出
          </span>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          按照「撰写内容 ➔ 调校风格 ➔
          导出成果」的工作流，可视化制作文人书签卡片，并在本地安全暂存您的每一道灵感。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* STAGE 1: INPUT CONTROLS (Col 1-5)                        */}
        {/* ======================================================== */}
        <div className="lg:col-span-5 flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
          {/* Step 1 Title & Autosave status */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                1
              </span>
              <span className="text-sm font-medium text-[var(--ink)]">输入内容与实用元数据</span>
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
                title="恢复为初始默认范例"
              >
                [重置]
              </button>
            </div>
          </div>

          {/* Card type toggle */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-[var(--ink-soft)] font-medium">卡片类型 Type</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-[var(--paper)] border border-[var(--line)] rounded-md">
              <button
                type="button"
                onClick={() => setCardType('fragment')}
                className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                  cardType === 'fragment'
                    ? 'bg-[var(--ochre)] text-[var(--paper)] shadow-xs'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)] bg-transparent'
                }`}
              >
                念头 (Fragment) · 随感短章
              </button>
              <button
                type="button"
                onClick={() => setCardType('excerpt')}
                className={`py-1.5 text-xs font-medium rounded transition-all cursor-pointer ${
                  cardType === 'excerpt'
                    ? 'bg-[var(--ochre)] text-[var(--paper)] shadow-xs'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)] bg-transparent'
                }`}
              >
                拾遗 (Excerpt) · 典籍金句
              </button>
            </div>
          </div>

          {/* Form Fields according to CardType */}
          {cardType === 'fragment' ? (
            <div className="flex flex-col gap-4">
              {/* Fragment Content */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    念头正文 (Content)
                  </label>
                  <span className="text-[11px] text-[var(--ink-faint)]">
                    {fragForm.content.length} 字
                    {fragForm.content.length > 120 ? ' · 略长，建议精炼' : ' · 适合 20~100 字'}
                  </span>
                </div>
                <textarea
                  aria-label="念头正文"
                  value={fragForm.content}
                  onChange={(e) => updateFragForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="在此写下这一刻的触动与念头..."
                  className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm leading-relaxed h-32 focus:border-[var(--ochre)] outline-none resize-none transition-colors"
                />
              </div>

              {/* Mood & Location */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    此刻氛围/心绪 (Mood)
                  </label>
                  <input
                    type="text"
                    aria-label="此刻氛围/心情"
                    value={fragForm.mood}
                    onChange={(e) => updateFragForm((prev) => ({ ...prev, mood: e.target.value }))}
                    placeholder="如：凌晨三点 / 晴窗"
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    发生地点 (Location)
                  </label>
                  <input
                    type="text"
                    aria-label="发生地点"
                    value={fragForm.location}
                    onChange={(e) =>
                      updateFragForm((prev) => ({ ...prev, location: e.target.value }))
                    }
                    placeholder="如：咸宁 / 案头"
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Date */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    记录日期 (Date)
                  </label>
                  <button
                    type="button"
                    onClick={() => updateFragForm((prev) => ({ ...prev, pubDate: localIsoDate() }))}
                    className="text-[11px] text-[var(--ochre)] hover:underline cursor-pointer"
                  >
                    设为今日
                  </button>
                </div>
                <input
                  type="date"
                  aria-label="发布日期"
                  value={fragForm.pubDate}
                  onChange={(e) => updateFragForm((prev) => ({ ...prev, pubDate: e.target.value }))}
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* Excerpt Content */}
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    引言金句 (Quote)
                  </label>
                  <span className="text-[11px] text-[var(--ink-faint)]">
                    {excForm.content.length} 字
                  </span>
                </div>
                <textarea
                  aria-label="引言原文"
                  value={excForm.content}
                  onChange={(e) => updateExcForm((prev) => ({ ...prev, content: e.target.value }))}
                  placeholder="在此录入打动你的引言原文..."
                  className="p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm leading-relaxed h-28 focus:border-[var(--ochre)] outline-none resize-none transition-colors"
                />
              </div>

              {/* Author & Source */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    原作者 (Author)
                  </label>
                  <input
                    type="text"
                    aria-label="原作者"
                    value={excForm.author}
                    onChange={(e) => updateExcForm((prev) => ({ ...prev, author: e.target.value }))}
                    placeholder="如：罗兰·巴特"
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    书籍/篇名出处 (Source)
                  </label>
                  <input
                    type="text"
                    aria-label="书籍/篇名出处"
                    value={excForm.source}
                    onChange={(e) => updateExcForm((prev) => ({ ...prev, source: e.target.value }))}
                    placeholder="如：《恋人絮语》"
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Comment */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  个人随感/短评 (Comment)
                </label>
                <input
                  type="text"
                  aria-label="个人短评/随感"
                  value={excForm.comment}
                  onChange={(e) => updateExcForm((prev) => ({ ...prev, comment: e.target.value }))}
                  placeholder="简短随笔，展示在卡片底部虚线下方"
                  className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                />
              </div>

              {/* Tags & Date */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">
                    标签 (以逗号分隔)
                  </label>
                  <input
                    type="text"
                    aria-label="标签（以逗号分隔）"
                    value={excForm.tags}
                    onChange={(e) => updateExcForm((prev) => ({ ...prev, tags: e.target.value }))}
                    placeholder="如：语言, 情感"
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <div className="flex justify-between items-baseline">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">
                      摘录日期 (Date)
                    </label>
                    <button
                      type="button"
                      onClick={() =>
                        updateExcForm((prev) => ({ ...prev, pubDate: localIsoDate() }))
                      }
                      className="text-[11px] text-[var(--ochre)] hover:underline cursor-pointer"
                    >
                      设为今日
                    </button>
                  </div>
                  <input
                    type="date"
                    aria-label="摘录日期"
                    value={excForm.pubDate}
                    onChange={(e) =>
                      updateExcForm((prev) => ({ ...prev, pubDate: e.target.value }))
                    }
                    className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* STAGE 2 & 3: PREVIEW & STYLE + EXPORT (Col 6-12)         */}
        {/* ======================================================== */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Stage 2 Box */}
          <div className="flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                  2
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">
                  调校外观风格与实时预览
                </span>
              </div>
              <span className="text-xs font-serif text-[var(--ink-faint)]">
                800 × 500 px · 16:10 黄金比例
              </span>
            </div>

            {/* High-fidelity Live Card Preview */}
            <div
              style={{
                backgroundColor: CARD_THEMES[cardTheme].bg,
                color: CARD_THEMES[cardTheme].text,
                borderColor: CARD_THEMES[cardTheme].line,
              }}
              className="border rounded-md p-6 sm:p-10 min-h-72 flex flex-col justify-between relative shadow-sm transition-all duration-300 overflow-hidden"
            >
              {cardType === 'fragment' ? (
                <>
                  <div
                    style={{ color: CARD_THEMES[cardTheme].textFaint }}
                    className="absolute top-4 right-6 text-xs italic font-serif"
                  >
                    {fragForm.pubDate}
                  </div>
                  <div className="flex-grow flex items-center justify-start py-6">
                    <p
                      style={{ color: CARD_THEMES[cardTheme].textSoft }}
                      className="font-serif text-base sm:text-lg leading-relaxed whitespace-pre-line text-justify"
                    >
                      {fragForm.content || '请输入正文内容...'}
                    </p>
                  </div>
                  <div
                    style={{
                      color: CARD_THEMES[cardTheme].textFaint,
                      borderColor: CARD_THEMES[cardTheme].line + '99',
                    }}
                    className="flex justify-between items-baseline border-t pt-4 mt-2 text-xs font-serif"
                  >
                    <span>{fragForm.location ? `📍 ${fragForm.location}` : '　'}</span>
                    <span>{fragForm.mood ? `${fragForm.mood}` : '　'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div
                    style={{ color: CARD_THEMES[cardTheme].accent }}
                    className="absolute top-3 left-5 opacity-15 text-5xl font-serif leading-none select-none pointer-events-none"
                  >
                    "
                  </div>
                  <div className="flex-grow flex flex-col justify-between py-4">
                    <p
                      style={{ color: CARD_THEMES[cardTheme].text }}
                      className="font-serif text-base sm:text-lg leading-relaxed text-justify whitespace-pre-line relative z-10"
                    >
                      {excForm.content || '请输入引言原文...'}
                    </p>
                    <div className="text-right mt-4 flex flex-col items-end gap-1">
                      <span
                        style={{ color: CARD_THEMES[cardTheme].textSoft }}
                        className="text-sm font-medium"
                      >
                        — {excForm.author || '无名'}
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
                      className="border-t border-dashed pt-3 mt-3"
                    >
                      <span
                        style={{ color: CARD_THEMES[cardTheme].accent }}
                        className="block text-[10px] tracking-wider uppercase mb-1 font-serif"
                      >
                        随感
                      </span>
                      <p
                        style={{ color: CARD_THEMES[cardTheme].textSoft }}
                        className="text-xs text-justify font-serif"
                      >
                        {excForm.comment}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Theme Picker directly beneath the card */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-xs text-[var(--ink-soft)] font-medium">
                纸墨配色方案 (Palette)
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {themeOptions.map(([key, label, icon]) => {
                  const isActive = cardTheme === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setCardTheme(key)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded text-xs font-medium border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[var(--ochre)] shadow-xs ring-1 ring-[var(--ochre)]'
                          : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ink-soft)]'
                      }`}
                      style={{
                        backgroundColor: CARD_THEMES[key].bg,
                        color: CARD_THEMES[key].text,
                      }}
                    >
                      <span className="text-xs">{icon}</span>
                      <span>{label}</span>
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
                <span className="text-sm font-medium text-[var(--ink)]">成果导出与交付</span>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">主次分明 · 突出高清图片下载</span>
            </div>

            {/* Scale Options */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-[var(--paper)] border border-[var(--line)] rounded-md">
              <span className="text-xs text-[var(--ink-soft)] font-medium">导出图像清晰度：</span>
              <div className="flex gap-1">
                {(
                  [
                    [1, '1x 标准', '800×500'],
                    [2, '2x 超清 · 推荐', '1600×1000'],
                    [3, '3x 印刷级', '2400×1500'],
                  ] as const
                ).map(([scaleVal, label, dim]) => (
                  <button
                    key={scaleVal}
                    type="button"
                    onClick={() => setExportScale(scaleVal)}
                    className={`px-3 py-1 rounded text-xs transition-all cursor-pointer ${
                      exportScale === scaleVal
                        ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium shadow-xs'
                        : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]'
                    }`}
                    title={`分辨率 ${dim}px`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Action Hierarchy: Primary vs Secondary */}
            <div className="flex flex-col gap-2.5 pt-1">
              {/* PRIMARY ACTION: Download Image */}
              <button
                type="button"
                onClick={handleDownloadCard}
                className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3.5 px-6 rounded-md font-medium text-sm sm:text-base transition-all hover:scale-[1.005] active:scale-[0.995] shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {imageExportSuccess ? (
                  <>
                    <span className="text-lg">✔</span>
                    <span>卡片图片已成功导出并下载！</span>
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
                      导出卡片图片 (
                      {exportScale === 1
                        ? '1x 标准 800×500'
                        : exportScale === 2
                          ? '2x 超清 1600×1000'
                          : '3x 印刷级 2400×1500'}{' '}
                      PNG)
                    </span>
                  </>
                )}
              </button>

              {/* SECONDARY ACTION: Copy Markdown Code */}
              <button
                type="button"
                onClick={handleExportMarkdown}
                className="w-full bg-transparent hover:bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)] py-2.5 px-4 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                    strokeWidth={1.75}
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                  />
                </svg>
                <span>
                  {exportSuccess ? '已复制 Markdown 源码！✔' : '复制 Markdown 源码（次要）'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
