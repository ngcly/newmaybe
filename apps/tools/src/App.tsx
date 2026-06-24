import { useState } from 'react';

type Tab = 'formatter' | 'exporter';
type CardType = 'fragment' | 'excerpt';

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('formatter');

  // 排版工具状态
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [formatStats, setFormatStats] = useState<{ spaces: number; symbols: number } | null>(null);
  const [copyStatsMsg, setCopyStatsMsg] = useState(false);

  // 导出工具状态
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [fragForm, setFragForm] = useState({
    content: '我们都是尚未写完的句子，留白处，才是温柔所在。',
    mood: '凌晨三点',
    location: '咸宁',
    pubDate: new Date().toISOString().split('T')[0],
  });
  const [excForm, setExcForm] = useState({
    content: '语言是一次皮肤的接触：我用我的语言去摩擦另一个人。',
    author: '罗兰·巴特',
    source: '《恋人絮语》',
    comment: '赋予语言以身体的触感，这是最温柔的浪漫。',
    pubDate: new Date().toISOString().split('T')[0],
    tags: '语言, 情感',
  });
  const [exportSuccess, setExportSuccess] = useState(false);

  // 1. 排版优化器核心逻辑
  const handleFormat = () => {
    let text = inputText;
    let spacesCount = 0;
    let symbolsCount = 0;

    if (!text) {
      setOutputText('');
      setFormatStats(null);
      return;
    }

    // A. 中英文混排空格优化（如 "字A" -> "字 A", "A字" -> "A 字"）
    // 通过正则匹配中文字符与英文字母/数字相邻的情况
    const cnRegex = /[\u4e00-\u9fa5]/;
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

    // B. 中文语境下的英文标点纠正（紧跟中文字符的英文标点转换为中文全角标点）
    const punctuationMap: Record<string, string> = {
      ',': '，',
      '.': '。',
      '?': '？',
      '!': '！',
      ':': '：',
      ';': '；'
    };

    // 如果英文标点前后有中文，则进行替换
    let finalProcessed = formattedText.replace(/([\u4e00-\u9fa5])([,.\?!:;])|([,.\?!:;])([\u4e00-\u9fa5])/g, (match, p1, p2, p3, p4) => {
      symbolsCount++;
      if (p1 && p2) {
        return p1 + (punctuationMap[p2] || p2);
      }
      if (p3 && p4) {
        return (punctuationMap[p3] || p3) + p4;
      }
      return match;
    });

    // C. 连续的多余空行/空格整理
    finalProcessed = finalProcessed.replace(/ {2,}/g, ' '); // 缩减连续空格为单空格

    setOutputText(finalProcessed);
    setFormatStats({ spaces: spacesCount, symbols: symbolsCount });
  };

  // 2. 导出 Markdown 文件
  const handleExportMarkdown = () => {
    let mdContent = '';
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
        ? excForm.tags.split(',').map(t => t.trim()).filter(Boolean)
        : [];
      
      mdContent = `---
author: ${excForm.author}
source: ${excForm.source}
pubDate: ${excForm.pubDate}
tags: [${tagList.map(t => `"${t}"`).join(', ')}]
comment: ${excForm.comment}
---
${excForm.content}
`;
    }

    navigator.clipboard.writeText(mdContent);
    setExportSuccess(true);
    setTimeout(() => setExportSuccess(false), 2000);
  };

  const handleCopyFormattedText = () => {
    navigator.clipboard.writeText(outputText);
    setCopyStatsMsg(true);
    setTimeout(() => setCopyStatsMsg(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* 侧边栏/导航栏 */}
      <aside className="w-full md:w-72 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500">
        <div className="mb-8">
          <a href="https://newmaybe.com" className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
            newmaybe<span className="text-[var(--ochre)] font-serif">.</span>
          </a>
          <p className="text-xs text-[var(--ink-faint)] mt-2">使用心智 · 思考加工厂</p>
        </div>

        {/* 菜单切换 */}
        <nav className="flex flex-row md:flex-col gap-2 flex-grow">
          <button
            onClick={() => setActiveTab('formatter')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
              activeTab === 'formatter'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            中英文混排排版优化
          </button>
          <button
            onClick={() => setActiveTab('exporter')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
              activeTab === 'exporter'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            念头/拾遗卡片生成器
          </button>
        </nav>

        {/* 底部返回链接 */}
        <div className="mt-8 pt-4 border-t border-[var(--line)] hidden md:block">
          <a href="https://newmaybe.com" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline">
            ← 返回主展厅 newmaybe.com
          </a>
        </div>
      </aside>

      {/* 右侧主交互面板 */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        
        {/* 模块 1：排版优化 */}
        {activeTab === 'formatter' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">中英文混排排版优化</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">自动在中英字符、数字间插入间隔空格，规范全半角符号，建立舒缓的中英文阅读质感。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 输入框 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)]">输入待清洗文本</label>
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="在此输入需要整理排版的文字...例如：今天在读Roland Barthes的《恋人絮语》,觉得里面的句子很有触感,于是记录在Newmaybe上。"
                  className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper-deep)] rounded text-[var(--ink)] font-serif text-base focus:border-[var(--ochre)] outline-none resize-none transition-colors"
                />
                <button
                  onClick={handleFormat}
                  className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-colors cursor-pointer"
                >
                  一键洗练排版
                </button>
              </div>

              {/* 输出框 */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">优化后文本</label>
                <div className="relative">
                  <textarea
                    value={outputText}
                    readOnly
                    placeholder="优化后的精美排版文本将显示在这里..."
                    className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper-deep)] rounded text-[var(--ink)] font-serif text-base outline-none resize-none"
                  />
                  {outputText && (
                    <button
                      onClick={handleCopyFormattedText}
                      className="absolute bottom-4 right-4 bg-[var(--paper)] hover:bg-[var(--paper-deep)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      {copyStatsMsg ? '已复制 ✔' : '复制文本'}
                    </button>
                  )}
                </div>

                {formatStats && (
                  <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded p-4 text-xs text-[var(--ink-soft)] flex gap-6">
                    <div>盘古空格添加：<span className="font-semibold text-[var(--ochre)]">{formatStats.spaces}</span> 处</div>
                    <div>标点符号标准化：<span className="font-semibold text-[var(--ochre)]">{formatStats.symbols}</span> 处</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 模块 2：卡片生成器 */}
        {activeTab === 'exporter' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">念头/拾遗卡片生成器</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">可视化撰写灵感片段，高仿真预览主站卡片样式，一键导出格式化好的 Markdown 源码。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 左侧控制输入 (5 columns) */}
              <div className="lg:col-span-5 flex flex-col gap-6 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
                
                {/* 类别切换 */}
                <div className="flex gap-2 p-1 bg-[var(--paper)] border border-[var(--line)] rounded">
                  <button
                    onClick={() => setCardType('fragment')}
                    className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all ${
                      cardType === 'fragment' ? 'bg-[var(--ochre)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    念头 (Fragment)
                  </button>
                  <button
                    onClick={() => setCardType('excerpt')}
                    className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all ${
                      cardType === 'excerpt' ? 'bg-[var(--ochre)] text-[var(--paper)]' : 'text-[var(--ink-soft)]'
                    }`}
                  >
                    拾遗 (Excerpt)
                  </button>
                </div>

                {/* 表单渲染 */}
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
                        <label className="text-xs text-[var(--ink-soft)] font-medium">此刻氛围/心情</label>
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
                        <label className="text-xs text-[var(--ink-soft)] font-medium">书籍/篇名出处</label>
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
                        <label className="text-xs text-[var(--ink-soft)] font-medium">标签 (以逗号分隔)</label>
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

                <button
                  onClick={handleExportMarkdown}
                  className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-colors cursor-pointer mt-2"
                >
                  {exportSuccess ? '已复制 Markdown 源码！✔' : '生成并复制 Markdown 源码'}
                </button>
              </div>

              {/* 右侧实时卡片预览 (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">实时卡片预览 (Live Preview)</span>
                
                {/* 高仿真的主站明信片卡片呈现 */}
                <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-8 md:p-12 min-h-80 flex flex-col justify-between relative shadow-sm transition-colors duration-500">
                  
                  {cardType === 'fragment' ? (
                    <>
                      {/* Fragment 卡片 */}
                      <div className="absolute top-4 right-6 text-xs text-[var(--ink-faint)] italic font-serif">
                        {fragForm.pubDate}
                      </div>
                      <div className="flex-grow flex items-center justify-start py-8">
                        <p className="font-serif text-lg leading-relaxed text-[var(--ink-soft)] whitespace-pre-line text-justify">
                          {fragForm.content}
                        </p>
                      </div>
                      <div className="flex justify-between items-baseline border-t border-[var(--line)]/60 pt-4 mt-4 text-xs text-[var(--ink-faint)] font-serif">
                        <span>{fragForm.location ? `📍 ${fragForm.location}` : ''}</span>
                        <span>{fragForm.mood ? `${fragForm.mood}` : ''}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Excerpt 卡片 */}
                      <div className="absolute top-4 left-6 text-[var(--ochre)] opacity-15 text-5xl font-serif leading-none select-none">“</div>
                      <div className="flex-grow flex flex-col justify-between py-6">
                        <p className="font-serif text-lg leading-relaxed text-[var(--ink)] text-justify whitespace-pre-line relative z-10">
                          {excForm.content}
                        </p>
                        <div className="text-right mt-6 flex flex-col items-end gap-1">
                          <span className="text-sm font-medium text-[var(--ink-soft)]">— {excForm.author}</span>
                          {excForm.source && <span className="text-xs text-[var(--ink-faint)] italic">{excForm.source}</span>}
                        </div>
                      </div>

                      {excForm.comment && (
                        <div className="border-t border-dashed border-[var(--line)] pt-4 mt-4">
                          <span className="block text-[10px] text-[var(--ochre)] tracking-wider uppercase mb-1">随感</span>
                          <p className="text-xs text-[var(--ink-soft)] text-justify">{excForm.comment}</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

      </main>
    </div>
  );
}
