import { loadDraft, saveDraft, INITIAL_SAVE_STATUS } from '../../lib/draft-storage';
import { useState } from 'react';
import type { ExportFormat } from './types';

const STORAGE_KEY_FORMATTER = 'newmaybe:studio:draft:formatter:v2';

const SAMPLE_TEXT =
  '今天在读Roland Barthes的《恋人絮语》,觉得里面的句子很有触感,比如"语言是一次皮肤的接触",于是记录在Newmaybe数字花园上。项目使用React19与TailwindCSS构建,拥有100%的极简东方质感。';

function convertToNotionJSON(text: string) {
  const paragraphs = text.split(/\n+/).filter((p) => p.trim());
  const blocks = paragraphs.map((p) => ({
    object: 'block',
    type: 'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: p } }],
    },
  }));
  return JSON.stringify(blocks, null, 2);
}

export default function TextFormatter() {
  const [inputText, setInputText] = useState(() =>
    loadDraft(STORAGE_KEY_FORMATTER, '', (value) => value),
  );
  const [outputText, setOutputText] = useState('');
  const [saveStatus, setSaveStatus] = useState(INITIAL_SAVE_STATUS);
  const [formatStats, setFormatStats] = useState<{
    originalChars: number;
    formattedChars: number;
    spaces: number;
    symbols: number;
  } | null>(null);
  const [copyMsg, setCopyMsg] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('text');

  const handleInputChange = (text: string) => {
    setInputText(text);
    setSaveStatus(saveDraft(STORAGE_KEY_FORMATTER, text, (value) => value));
  };

  const handleFillSample = () => {
    handleInputChange(SAMPLE_TEXT);
  };

  const handleClear = () => {
    handleInputChange('');
    setOutputText('');
    setFormatStats(null);
  };

  const handleFormat = () => {
    const text = inputText;
    let spacesCount = 0;
    let symbolsCount = 0;

    if (!text.trim()) {
      setOutputText('');
      setFormatStats(null);
      return;
    }

    const cnRegex = /[一-龥]/;
    const enRegex = /[A-Za-z0-9]/;

    let formattedText = '';
    for (let i = 0; i < text.length; i++) {
      formattedText += text[i];
      if (i < text.length - 1) {
        const current = text[i];
        const next = text[i + 1];
        if (
          (cnRegex.test(current) && enRegex.test(next)) ||
          (enRegex.test(current) && cnRegex.test(next))
        ) {
          formattedText += ' ';
          spacesCount++;
        }
      }
    }

    const punctuationMap: Record<string, string> = {
      ',': '，',
      '.': '。',
      '?': '？',
      '!': '！',
      ':': '：',
      ';': '；',
    };

    let finalProcessed = formattedText.replace(
      /([一-龥])([,.?!:;])|([,.?!:;])([一-龥])/g,
      (_match, p1?: string, p2?: string, p3?: string, p4?: string) => {
        symbolsCount++;
        if (p1 && p2) return p1 + (punctuationMap[p2] || p2);
        if (p3 && p4) return (punctuationMap[p3] || p3) + p4;
        return _match;
      },
    );

    finalProcessed = finalProcessed.replace(/ {2,}/g, ' ');

    setOutputText(finalProcessed);
    setFormatStats({
      originalChars: text.length,
      formattedChars: finalProcessed.length,
      spaces: spacesCount,
      symbols: symbolsCount,
    });
  };

  const handleCopy = () => {
    let textToCopy = outputText;
    if (exportFormat === 'markdown') {
      textToCopy = outputText
        .split('\n\n')
        .map((p) => `> ${p}`)
        .join('\n>\n');
    } else if (exportFormat === 'notion') {
      textToCopy = convertToNotionJSON(outputText);
    }
    void navigator.clipboard.writeText(textToCopy);
    setCopyMsg(true);
    setTimeout(() => setCopyMsg(false), 2200);
  };

  const handleDownloadFile = () => {
    let content = outputText;
    let filename = 'formatted-text.txt';
    if (exportFormat === 'markdown') {
      content = outputText
        .split('\n\n')
        .map((p) => `> ${p}`)
        .join('\n>\n');
      filename = 'formatted-quote.md';
    } else if (exportFormat === 'notion') {
      content = convertToNotionJSON(outputText);
      filename = 'notion-blocks.json';
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const displayText = (() => {
    if (!outputText) return '';
    if (exportFormat === 'notion') return convertToNotionJSON(outputText);
    if (exportFormat === 'markdown') {
      return outputText
        .split('\n\n')
        .map((p) => `> ${p}`)
        .join('\n>\n');
    }
    return outputText;
  })();

  const formatNames: Record<ExportFormat, string> = {
    text: '纯文本',
    markdown: 'Markdown 引用',
    notion: 'Notion JSON',
  };

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6">
      {/* Header with 3-Stage Pipeline */}
      <div className="flex flex-col gap-2">
        <div className="inline-flex items-center gap-2 text-xs font-serif text-[var(--ink-faint)]">
          <span className="text-[var(--ochre)] font-medium">阶段 1：待洗文本</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 2：调阅统计</span>
          <span>➔</span>
          <span className="text-[var(--ochre)] font-medium">阶段 3：成果导出</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2">
          <h2 className="text-2xl font-medium text-[var(--ink)]">中英文混排排版优化</h2>
          <span className="text-xs text-[var(--ink-faint)]">
            盘古之白 · 全半角标点智能归位 · 多格式交付
          </span>
        </div>
        <p className="text-sm text-[var(--ink-soft)]">
          在中英字符与数字交界处插入恰如其分的留白呼吸空格，纠正全半角标点挤压，建立舒缓雅致的阅读节奏。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* ======================================================== */}
        {/* STAGE 1: INPUT TEXTAREA (Col 1-6)                        */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                1
              </span>
              <span className="text-sm font-medium text-[var(--ink)]">输入待清洗文本</span>
            </div>
            <div className="flex items-center gap-2">
              <span
                role={saveStatus.saved || saveStatus === INITIAL_SAVE_STATUS ? 'status' : 'alert'}
                className="text-[11px] text-[var(--ink-faint)] flex items-center gap-1"
              >
                {saveStatus.message}
              </span>
              <button
                type="button"
                onClick={handleFillSample}
                className="text-[11px] text-[var(--ochre)] hover:underline cursor-pointer"
              >
                范例
              </button>
              <button
                type="button"
                onClick={handleClear}
                className="text-[11px] text-[var(--ink-faint)] hover:text-[var(--cinnabar)] cursor-pointer"
              >
                清空
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-baseline">
              <label className="text-xs text-[var(--ink-soft)] font-medium">原始文本</label>
              <span className="text-[11px] text-[var(--ink-faint)]">{inputText.length} 字符</span>
            </div>
            <textarea
              aria-label="输入待清洗文本"
              value={inputText}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="在此粘贴或输入需要清洗排版的文本...例如：今天在读Roland Barthes的《恋人絮语》,觉得里面的句子很有触感,于是记录在Newmaybe上。"
              className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm leading-relaxed focus:border-[var(--ochre)] outline-none resize-none transition-colors"
            />
          </div>

          {/* Primary Action Button for Step 1 */}
          <button
            type="button"
            onClick={handleFormat}
            disabled={!inputText.trim()}
            className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--paper)] py-3 px-4 rounded-md font-medium text-sm transition-all hover:scale-[1.005] active:scale-[0.995] shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span>一键洗练排版 (盘古留白 + 规范标点)</span>
          </button>
        </div>

        {/* ======================================================== */}
        {/* STAGE 2 & 3: PREVIEW, STATS & EXPORT (Col 7-12)          */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 flex flex-col gap-6">
          {/* Stage 2 Box */}
          <div className="flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                  2
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">调阅与统计指标</span>
              </div>
              {/* Format selection */}
              <div className="flex gap-1 bg-[var(--paper)] border border-[var(--line)] rounded p-0.5">
                {(['text', 'markdown', 'notion'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setExportFormat(fmt)}
                    className={`px-2.5 py-1 rounded text-xs transition-all cursor-pointer font-medium ${
                      exportFormat === fmt
                        ? 'bg-[var(--ochre)] text-[var(--paper)] shadow-xs'
                        : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
                    }`}
                  >
                    {fmt === 'text' && '纯文本'}
                    {fmt === 'markdown' && 'Markdown'}
                    {fmt === 'notion' && 'Notion'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-baseline">
                <label className="text-xs text-[var(--ink-soft)] font-medium">
                  洗练呈现 ({formatNames[exportFormat]})
                </label>
                <span className="text-[11px] text-[var(--ink-faint)]">
                  {outputText ? `${outputText.length} 字符` : '尚未洗练'}
                </span>
              </div>
              <textarea
                aria-label="排版结果"
                value={displayText}
                readOnly
                placeholder="点击左侧「一键洗练排版」后，规整优美的排版文本将呈现在此..."
                className="w-full h-64 p-4 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm leading-relaxed outline-none resize-none"
              />
            </div>

            {/* Metrics */}
            {formatStats ? (
              <div className="grid grid-cols-3 gap-2 bg-[var(--paper)] border border-[var(--line)] rounded p-3 text-center">
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--ink-faint)] font-serif">洗练后字符</span>
                  <span className="font-semibold text-sm text-[var(--ochre)]">
                    {formatStats.formattedChars}
                  </span>
                </div>
                <div className="flex flex-col border-x border-[var(--line)]">
                  <span className="text-[10px] text-[var(--ink-faint)] font-serif">
                    盘古空格插入
                  </span>
                  <span className="font-semibold text-sm text-[var(--bamboo)]">
                    +{formatStats.spaces} 处
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] text-[var(--ink-faint)] font-serif">标点规范化</span>
                  <span className="font-semibold text-sm text-[var(--cinnabar)]">
                    {formatStats.symbols} 处
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-[var(--paper)]/50 border border-dashed border-[var(--line)] rounded p-3 text-center text-xs text-[var(--ink-faint)] font-serif">
                待运行排版后，将在此展示中英文留白与标点矫正数据
              </div>
            )}
          </div>

          {/* Stage 3 Box: Deliver & Export */}
          <div className="flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-5 sm:p-6 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-bold font-serif">
                  3
                </span>
                <span className="text-sm font-medium text-[var(--ink)]">成果导出与复制</span>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                当前格式：{formatNames[exportFormat]}
              </span>
            </div>

            {/* Action Hierarchy */}
            <div className="flex flex-col gap-2.5">
              {/* PRIMARY ACTION */}
              <button
                type="button"
                onClick={handleCopy}
                disabled={!outputText}
                className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] disabled:opacity-50 disabled:cursor-not-allowed text-[var(--paper)] py-3.5 px-6 rounded-md font-medium text-sm sm:text-base transition-all hover:scale-[1.005] active:scale-[0.995] shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2"
              >
                {copyMsg ? (
                  <>
                    <span className="text-lg">✔</span>
                    <span>已复制 {formatNames[exportFormat]} 到剪贴板！</span>
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
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                    <span>复制排版结果 ({formatNames[exportFormat]})</span>
                  </>
                )}
              </button>

              {/* SECONDARY ACTION */}
              <button
                type="button"
                onClick={handleDownloadFile}
                disabled={!outputText}
                className="w-full bg-transparent hover:bg-[var(--paper)] border border-[var(--line)] disabled:opacity-40 disabled:cursor-not-allowed text-[var(--ink-soft)] hover:text-[var(--ink)] py-2.5 px-4 rounded-md text-xs font-medium transition-all cursor-pointer flex items-center justify-center gap-1.5"
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                <span>
                  下载为文件 (
                  {exportFormat === 'markdown'
                    ? '.md'
                    : exportFormat === 'notion'
                      ? '.json'
                      : '.txt'}
                  )
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
