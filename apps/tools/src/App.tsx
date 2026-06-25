import { useState, useEffect } from 'react';

type Tab = 'formatter' | 'exporter';
type CardType = 'fragment' | 'excerpt';
type ExportFormat = 'text' | 'markdown' | 'notion';
type CardTheme = 'paper' | 'dark' | 'ochre' | 'bamboo';

const resolveSubdomain = (url: string) => {
  const isDev = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (!isDev) return url;
  
  if (url.startsWith('https://newmaybe.com')) {
    return 'http://localhost:4321';
  }
  if (url.startsWith('https://graph.newmaybe.com')) {
    return 'http://localhost:4322';
  }
  if (url.startsWith('https://tools.newmaybe.com')) {
    return 'http://localhost:4323';
  }
  if (url.startsWith('https://ai.newmaybe.com')) {
    return 'http://localhost:4324';
  }
  if (url.startsWith('https://lab.newmaybe.com')) {
    return 'http://localhost:4325';
  }
  if (url.startsWith('https://studio.newmaybe.com')) {
    return 'http://localhost:4326';
  }
  return url;
};

const CARD_THEMES = {
  paper: {
    bg: '#F7F3EC',
    text: '#2B2722',
    accent: '#A8643C',
    line: '#D9CFBF',
    textSoft: '#5A544C',
    textFaint: '#8C8275',
  },
  dark: {
    bg: '#1E1B18',
    text: '#E8E0D5',
    accent: '#C4814E',
    line: '#3A3430',
    textSoft: '#B5AFA5',
    textFaint: '#7A746E',
  },
  ochre: {
    bg: '#A8643C',
    text: '#F7F3EC',
    accent: '#2B2722',
    line: '#8A4F2E',
    textSoft: '#E6DCCF',
    textFaint: '#C4814E',
  },
  bamboo: {
    bg: '#EAF2EC',
    text: '#1C2E24',
    accent: '#6B8E7B',
    line: '#C5D6C9',
    textSoft: '#3C5245',
    textFaint: '#7F9E8B',
  }
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('formatter');

  // 从 URL query 参数中恢复传递来的内容，以支持 AI 域的卡片联动跳转
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const contentParam = params.get('content');
    if (contentParam) {
      setFragForm(prev => ({ ...prev, content: contentParam }));
      setExcForm(prev => ({ ...prev, content: contentParam }));
      setInputText(contentParam);
      setActiveTab('exporter');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 排版工具状态
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [formatStats, setFormatStats] = useState<{ chars: number; spaces: number; symbols: number } | null>(null);
  const [copyStatsMsg, setCopyStatsMsg] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('text');

  // 导出工具状态
  const [cardType, setCardType] = useState<CardType>('fragment');
  const [cardTheme, setCardTheme] = useState<CardTheme>('paper');
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
  const [imageExportSuccess, setImageExportSuccess] = useState(false);

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

    const originalLength = text.length;

    // A. 中英文混排空格优化（如 "字A" -> "字 A", "A字" -> "A 字"）
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
    setFormatStats({ chars: originalLength, spaces: spacesCount, symbols: symbolsCount });
  };

  // 2. Notion JSON 格式转换
  const convertToNotionJSON = (text: string) => {
    const paragraphs = text.split(/\n+/).filter(p => p.trim());
    const blocks = paragraphs.map(p => ({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          {
            type: 'text',
            text: {
              content: p
            }
          }
        ]
      }
    }));
    return JSON.stringify(blocks, null, 2);
  };

  // 3. 复制排版好的文本
  const handleCopyFormattedText = () => {
    let textToCopy = outputText;
    if (exportFormat === 'markdown') {
      textToCopy = outputText.split('\n\n').map(p => `> ${p}`).join('\n>\n');
    } else if (exportFormat === 'notion') {
      textToCopy = convertToNotionJSON(outputText);
    }
    navigator.clipboard.writeText(textToCopy);
    setCopyStatsMsg(true);
    setTimeout(() => setCopyStatsMsg(false), 2000);
  };

  // 4. 导出 Markdown 源码
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

  // 5. 辅助文本折行函数
  const wrapText = (
    ctx: CanvasRenderingContext2D,
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number
  ): number => {
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
        const metrics = ctx.measureText(testLine);
        const testWidth = metrics.width;
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
  };

  // 6. Canvas 绘制与 PNG 下载
  const handleDownloadCard = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const themeColors = CARD_THEMES[cardTheme];
    
    // 1. 绘制背景
    ctx.fillStyle = themeColors.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // 2. 绘制内缩边框线
    ctx.strokeStyle = themeColors.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    
    if (cardType === 'fragment') {
      // 3. 绘制发布日期
      ctx.fillStyle = themeColors.textFaint;
      ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(fragForm.pubDate, canvas.width - 60, 60);
      
      // 4. 绘制念头正文
      ctx.fillStyle = themeColors.textSoft;
      ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const maxWidth = canvas.width - 120;
      const startX = 60;
      const startY = 120;
      wrapText(ctx, fragForm.content, startX, startY, maxWidth, 38);
      
      // 5. 绘制底部修饰线与元数据
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
      // Excerpt 拾遗卡片
      // 3. 绘制巨大引言号
      ctx.fillStyle = themeColors.accent;
      ctx.globalAlpha = 0.15;
      ctx.font = 'normal 90px "Cormorant Garamond", Georgia, serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText('“', 50, 45);
      ctx.globalAlpha = 1.0;
      
      // 4. 绘制引言正文
      ctx.fillStyle = themeColors.text;
      ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      
      const maxWidth = canvas.width - 120;
      const startX = 60;
      const startY = 110;
      const endY = wrapText(ctx, excForm.content, startX, startY, maxWidth, 38);
      
      // 5. 绘制出处作者
      ctx.fillStyle = themeColors.textSoft;
      ctx.font = '16px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'right';
      
      let authorY = endY + 15;
      if (authorY > canvas.height - 180) {
        authorY = canvas.height - 170;
      }
      
      ctx.fillText(`— ${excForm.author}`, canvas.width - 60, authorY);
      if (excForm.source) {
        ctx.fillStyle = themeColors.textFaint;
        ctx.font = 'italic 14px "Noto Serif SC", "Songti SC", serif';
        ctx.fillText(excForm.source, canvas.width - 60, authorY + 22);
      }
      
      // 6. 随感评论
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
        wrapText(ctx, excForm.comment, 60, commentStartY + 35, maxWidth, 22);
      }
    }
    
    // 导出下载
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `newmaybe-card-${cardType}-${cardTheme}.png`;
    link.href = url;
    link.click();
    
    setImageExportSuccess(true);
    setTimeout(() => setImageExportSuccess(false), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* 侧边栏/导航栏 */}
      <aside className="w-full md:w-72 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500">
        <div className="mb-8">
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
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
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline">
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
                  className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer"
                >
                  一键洗练排版
                </button>
              </div>

              {/* 输出框 */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">优化后文本</label>
                  <div className="flex gap-1.5">
                    {(['text', 'markdown', 'notion'] as const).map(fmt => (
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
                    value={exportFormat === 'notion' ? (outputText ? convertToNotionJSON(outputText) : '') : (exportFormat === 'markdown' ? (outputText ? outputText.split('\n\n').map(p => `> ${p}`).join('\n>\n') : '') : outputText)}
                    readOnly
                    placeholder="优化后的精美排版文本将显示在这里..."
                    className="w-full h-80 p-4 border border-[var(--line)] bg-[var(--paper-deep)] rounded text-[var(--ink)] font-serif text-base outline-none resize-none"
                  />
                  {outputText && (
                    <button
                      onClick={handleCopyFormattedText}
                      className="absolute bottom-4 right-4 bg-[var(--paper)] hover:bg-[var(--paper-deep)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer shadow-sm hover:shadow-md"
                    >
                      {copyStatsMsg ? '已复制 ✔' : '复制文本'}
                    </button>
                  )}
                </div>

                {formatStats && (
                  <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded p-4 text-xs text-[var(--ink-soft)] flex gap-6">
                    <div>字数统计：<span className="font-semibold text-[var(--ochre)]">{formatStats.chars}</span> 字</div>
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
              <p className="text-sm text-[var(--ink-soft)] mt-1">可视化撰写灵感片段，高仿真预览主站卡片样式，支持切换多款底色，并可一键导出图片与源码。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 左侧控制输入 (5 columns) */}
              <div className="lg:col-span-5 flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
                
                {/* 类别切换 */}
                <div className="flex gap-2 p-1 bg-[var(--paper)] border border-[var(--line)] rounded">
                  <button
                    onClick={() => setCardType('fragment')}
                    className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                      cardType === 'fragment' ? 'bg-[var(--ochre)] text-[var(--paper)] border-none' : 'text-[var(--ink-soft)] bg-transparent border-none'
                    }`}
                  >
                    念头 (Fragment)
                  </button>
                  <button
                    onClick={() => setCardType('excerpt')}
                    className={`flex-grow py-1.5 text-xs font-semibold rounded transition-all cursor-pointer ${
                      cardType === 'excerpt' ? 'bg-[var(--ochre)] text-[var(--paper)] border-none' : 'text-[var(--ink-soft)] bg-transparent border-none'
                    }`}
                  >
                    拾遗 (Excerpt)
                  </button>
                </div>

                {/* 卡片主题色板选择 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">卡片配色主题 Theme</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setCardTheme('paper')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        cardTheme === 'paper' ? 'bg-[#F7F3EC] text-[#2B2722] border-[#A8643C] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      米纸底 (Cream) 📄
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardTheme('dark')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        cardTheme === 'dark' ? 'bg-[#1E1B18] text-[#E8E0D5] border-[#C4814E] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      黛墨底 (Dark) 🌙
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardTheme('ochre')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        cardTheme === 'ochre' ? 'bg-[#A8643C] text-[#F7F3EC] border-[#2B2722] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      赭石底 (Ochre) 🔴
                    </button>
                    <button
                      type="button"
                      onClick={() => setCardTheme('bamboo')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        cardTheme === 'bamboo' ? 'bg-[#EAF2EC] text-[#1C2E24] border-[#6B8E7B] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      竹青底 (Bamboo) 🍃
                    </button>
                  </div>
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

              {/* 右侧实时卡片预览 (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">实时卡片预览 (Live Preview)</span>
                
                {/* 高仿真的主站明信片卡片呈现 */}
                <div 
                  style={{
                    backgroundColor: CARD_THEMES[cardTheme].bg,
                    color: CARD_THEMES[cardTheme].text,
                    borderColor: CARD_THEMES[cardTheme].line
                  }}
                  className="border rounded p-8 md:p-12 min-h-80 flex flex-col justify-between relative shadow-sm transition-all duration-300"
                >
                  
                  {cardType === 'fragment' ? (
                    <>
                      {/* Fragment 卡片 */}
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
                          borderColor: CARD_THEMES[cardTheme].line + '99'
                        }}
                        className="flex justify-between items-baseline border-t pt-4 mt-4 text-xs font-serif"
                      >
                        <span>{fragForm.location ? `📍 ${fragForm.location}` : ''}</span>
                        <span>{fragForm.mood ? `${fragForm.mood}` : ''}</span>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Excerpt 卡片 */}
                      <div 
                        style={{ color: CARD_THEMES[cardTheme].accent }}
                        className="absolute top-4 left-6 opacity-15 text-5xl font-serif leading-none select-none"
                      >
                        “
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
        )}

      </main>
    </div>
  );
}
