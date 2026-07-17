import { useState } from 'react';
import type { ExportFormat } from '../types';

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
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [formatStats, setFormatStats] = useState<{
    chars: number;
    spaces: number;
    symbols: number;
  } | null>(null);
  const [copyMsg, setCopyMsg] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('text');

  const handleFormat = () => {
    const text = inputText;
    let spacesCount = 0;
    let symbolsCount = 0;

    if (!text) {
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
    setFormatStats({ chars: text.length, spaces: spacesCount, symbols: symbolsCount });
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
    setTimeout(() => setCopyMsg(false), 2000);
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

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">中英文混排排版优化</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          自动在中英字符、数字间插入间隔空格，规范全半角符号，建立舒缓的中英文阅读质感。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Input */}
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)]">
            输入待清洗文本
          </label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="在此输入需要整理排版的文字...例如：今天在读Roland Barthes的《恋人絮语》,觉得里面的句子很有触感,于是记录在Newmaybe上。"
            className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper-deep)] rounded text-[var(--ink)] font-serif text-base focus:border-[var(--ochre)] outline-none resize-none transition-colors"
          />
          <button
            onClick={handleFormat}
            className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer"
          >
            一键洗练排版
          </button>
        </div>

        {/* Output */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">
              优化后文本
            </label>
            <div className="flex gap-1.5">
              {(['text', 'markdown', 'notion'] as const).map((fmt) => (
                <button
                  key={fmt}
                  type="button"
                  onClick={() => setExportFormat(fmt)}
                  className={`px-2 py-0.5 rounded text-[10px] border transition-all cursor-pointer font-medium ${
                    exportFormat === fmt
                      ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-sm'
                      : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                  }`}
                >
                  {fmt === 'text' && '纯文本'}
                  {fmt === 'markdown' && 'Markdown'}
                  {fmt === 'notion' && 'Notion JSON'}
                </button>
              ))}
            </div>
          </div>
          <div className="relative">
            <textarea
              value={displayText}
              readOnly
              placeholder="优化后的精美排版文本将显示在这里..."
              className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper-deep)] rounded text-[var(--ink)] font-serif text-base outline-none resize-none"
            />
            {outputText && (
              <button
                onClick={handleCopy}
                className="absolute bottom-4 right-4 bg-[var(--paper)] hover:bg-[var(--paper-deep)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-sm hover:shadow-md"
              >
                {copyMsg ? '已复制 ✔' : '复制文本'}
              </button>
            )}
          </div>

          {formatStats && (
            <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded p-4 text-xs text-[var(--ink-soft)] flex gap-6">
              <div>
                字数统计：
                <span className="font-semibold text-[var(--ochre)]">{formatStats.chars}</span> 字
              </div>
              <div>
                盘古空格添加：
                <span className="font-semibold text-[var(--ochre)]">{formatStats.spaces}</span> 处
              </div>
              <div>
                标点符号标准化：
                <span className="font-semibold text-[var(--ochre)]">{formatStats.symbols}</span> 处
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
