import { useState, useEffect, useRef } from 'react';

type Tab = 'poster' | 'inspiration' | 'assets';
type ThemeType = 'paper' | 'dark' | 'ochre';

interface Prompt {
  category: string;
  text: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('poster');

  // 海报参数状态
  const [title, setTitle] = useState('思考的经纬');
  const [subtitle, setSubtitle] = useState('newmaybe.com 数字花园图谱上线');
  const [quote, setQuote] = useState('我们都是尚未写完的句子，留白处，才是温柔所在。');
  const [author, setAuthor] = useState('林');
  const [watermark, setWatermark] = useState('留');
  const [theme, setTheme] = useState<ThemeType>('paper');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 灵感生成器状态
  const prompts: Prompt[] = [
    { category: '随笔', text: '描述一个您很久没有回去、但突然在某个下雨天记起的街道拐角。' },
    { category: '观察', text: '写下您在深夜安静的高铁上，环顾四周陌生人面孔时所感受到的孤独与温暖。' },
    { category: '拾遗', text: '为一本您最近读完的书写三句最简短的总结，且不包含书中的核心专业词汇。' },
    { category: '诗歌', text: '用“风”、“墨水”和“未寄出的信”三个意象，写四行短句。' },
    { category: '念头', text: '回忆您童年时期对“未来”最抽象的一次幻想，并对比当下。' },
    { category: '记忆', text: '定义一个只属于您自己、别人无法在词典中查到的情感词汇，并给出详尽的注解。' }
  ];
  const [currentPrompt, setCurrentPrompt] = useState<Prompt>(prompts[0]);

  // 资产素材库数据
  const assets = [
    { title: '默认 OG 分享封面 (Default OG)', path: '/public/og-default.png', type: '图片' },
    { title: '品牌 Logo 矢量图 (Favicon SVG)', path: '/public/favicon.svg', type: '矢量图' },
    { title: '背景噪点 SVG 覆盖层 (Noise Pattern)', path: 'data:image/svg+xml;...', type: 'CSS图案' },
    { title: '水墨风诗歌背景水印 - 雨', path: 'src/content/posts/ (watermark: 雨)', type: '字符资产' },
    { title: '自托管中文书体 (Noto Serif SC)', path: 'node_modules/@fontsource/noto-serif-sc', type: '字体' },
    { title: '古典英文衬线体 (Cormorant Garamond)', path: 'node_modules/@fontsource/cormorant-garamond', type: '字体' }
  ];
  const [copiedAssetIdx, setCopiedAssetIdx] = useState<number | null>(null);

  // 1. Canvas 实时渲染排版海报
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 清除画布
    const width = 1200;
    const height = 630;
    ctx.clearRect(0, 0, width, height);

    // 主题色彩映射
    const colors = {
      paper: { bg: '#F7F3EC', text: '#2B2722', accent: '#A8643C', line: '#D9CFBF', watermark: 'rgba(168, 100, 60, 0.045)' },
      dark: { bg: '#1E1B18', text: '#E8E0D5', accent: '#C4814E', line: '#3A3430', watermark: 'rgba(232, 224, 213, 0.045)' },
      ochre: { bg: '#A8643C', text: '#F7F3EC', accent: '#2B2722', line: '#8A4F2E', watermark: 'rgba(43, 39, 34, 0.08)' }
    }[theme];

    // A. 绘制背景
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // B. 绘制内缩边框线
    ctx.strokeStyle = colors.line;
    ctx.lineWidth = 1;
    ctx.strokeRect(40, 40, width - 80, height - 80);

    // C. 绘制巨大背景水印字 (留白禅意)
    if (watermark) {
      ctx.fillStyle = colors.watermark;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'normal 380px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(watermark, width / 2, height / 2 - 15);
    }

    // D. 绘制顶部信息 (Category / Branding)
    ctx.fillStyle = colors.accent;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
    ctx.fillText('newmaybe.com · Editorial Studio', 80, 80);

    // E. 绘制主标题 (Title)
    ctx.fillStyle = colors.text;
    ctx.font = 'normal 64px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText(title, 80, 140);

    // F. 绘制副标题 (Subtitle)
    ctx.fillStyle = colors.accent;
    ctx.font = 'normal 24px "Noto Serif SC", "Songti SC", serif';
    ctx.fillText(subtitle, 80, 230);

    // G. 绘制中间装饰性横线
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    ctx.moveTo(80, 290);
    ctx.lineTo(400, 290);
    ctx.stroke();

    // H. 绘制引言正文 (Quote)
    ctx.fillStyle = colors.text;
    ctx.font = 'italic 32px "Noto Serif SC", "Songti SC", serif';
    
    // 多行排版处理
    const maxQuoteWidth = 900;
    const words = quote.split('');
    let line = '';
    let y = 350;
    const lineHeight = 50;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n];
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxQuoteWidth && n > 0) {
        ctx.fillText(line, 80, y);
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, 80, y);

    // I. 绘制作者与落款印章 (Stamp)
    if (author) {
      const stampX = width - 180;
      const stampY = height - 140;

      // 绘制传统的印章矩形红色底
      ctx.fillStyle = theme === 'ochre' ? '#2B2722' : '#A8643C';
      ctx.fillRect(stampX, stampY, 50, 50);

      // 印章中的白字 (作者单字落款)
      ctx.fillStyle = theme === 'ochre' ? '#F7F3EC' : '#F7F3EC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(author.slice(0, 1), stampX + 25, stampY + 25);
    }
  }, [title, subtitle, quote, author, watermark, theme]);

  // 2. 一键下载 PNG 图片
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title || 'poster'}-${theme}-og.png`;
    link.href = url;
    link.click();
  };

  // 3. 切换灵感命题
  const handleNextPrompt = () => {
    const nextIdx = (prompts.findIndex(p => p.text === currentPrompt.text) + 1) % prompts.length;
    setCurrentPrompt(prompts[nextIdx]);
  };

  // 4. 复制资产路径
  const handleCopyAsset = (path: string, idx: number) => {
    navigator.clipboard.writeText(path);
    setCopiedAssetIdx(idx);
    setTimeout(() => setCopiedAssetIdx(null), 2000);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[var(--paper)]">
      {/* 左侧工作区导航 */}
      <aside className="w-full md:w-72 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500">
        <div className="mb-8">
          <a href="https://newmaybe.com" className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
            newmaybe<span className="text-[var(--ochre)] font-serif">.studio</span>
          </a>
          <p className="text-xs text-[var(--ink-faint)] mt-2">创作层 · 媒体与素材资产工坊</p>
        </div>

        {/* 标签栏选择 */}
        <nav className="flex flex-row md:flex-col gap-2 flex-grow">
          <button
            onClick={() => setActiveTab('poster')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
              activeTab === 'poster'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            新可能排版封面海报
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
              activeTab === 'inspiration'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            灵感写作命题库
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
              activeTab === 'assets'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            共享素材资产画廊
          </button>
        </nav>

        {/* 返回主站 */}
        <div className="mt-8 pt-4 border-t border-[var(--line)] hidden md:block">
          <a href="https://newmaybe.com" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline">
            ← 返回主展厅 newmaybe.com
          </a>
        </div>
      </aside>

      {/* 右侧工作台 */}
      <main className="flex-grow p-6 md:p-12 overflow-y-auto">
        
        {/* 模块一：海报生成器 */}
        {activeTab === 'poster' && (
          <div className="max-w-6xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">新可能排版海报生成器</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">在前端通过 Canvas 像素级绘制 1200×630 分辨率的高清海报，可直接下载用作文章的 OG 分享图或海报。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 控制输入 (5 columns) */}
              <div className="lg:col-span-5 flex flex-col gap-5 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
                
                {/* 预设配色切换 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">主题色板 Template</label>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setTheme('paper')}
                      className={`flex-grow py-2 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'paper' ? 'bg-[#F7F3EC] text-[#2B2722] border-[#A8643C] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      米纸底墨字 📄
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`flex-grow py-2 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'dark' ? 'bg-[#1E1B18] text-[#E8E0D5] border-[#C4814E] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      暗夜白字 🌙
                    </button>
                    <button
                      onClick={() => setTheme('ochre')}
                      className={`flex-grow py-2 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'ochre' ? 'bg-[#A8643C] text-[#F7F3EC] border-[#2B2722] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)]'
                      }`}
                    >
                      赭石印泥 🔴
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">大标题 (Title)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="p-2.5 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">副标题/描述 (Subtitle)</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="p-2.5 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">引言/正文 (Quote)</label>
                    <textarea
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="p-2.5 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm h-24 focus:border-[var(--ochre)] outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[var(--ink-soft)] font-medium">印款签名 (Stamp)</label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder="落款字，如“林”"
                        className="p-2.5 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[var(--ink-soft)] font-medium">背景巨幅水印</label>
                      <input
                        type="text"
                        value={watermark}
                        onChange={(e) => setWatermark(e.target.value)}
                        maxLength={1}
                        placeholder="单字，如“雨”"
                        className="p-2.5 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-colors cursor-pointer mt-3"
                >
                  导出并下载高清海报 PNG
                </button>
              </div>

              {/* 右侧渲染画布 (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">画布渲染预览 (Canvas Render)</span>
                <canvas
                  ref={canvasRef}
                  width="1200"
                  height="630"
                  className="w-full h-auto border border-[var(--line)] rounded shadow-sm bg-[var(--paper-deep)]"
                />
              </div>

            </div>
          </div>
        )}

        {/* 模块二：灵感库 */}
        {activeTab === 'inspiration' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">文学写作灵感启发</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">当您坐下写文章或笔记发现大脑一片空白时，点击获取一条为您定制的灵感或写作命题。</p>
            </div>

            <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-8 md:p-12 flex flex-col justify-between min-h-[300px] shadow-sm">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)] border border-[var(--line)] px-2.5 py-1 rounded bg-[var(--paper)]">
                  分类：{currentPrompt.category}
                </span>
                <p className="font-serif text-2xl leading-relaxed text-[var(--ink)] mt-8 text-justify">
                  “ {currentPrompt.text} ”
                </p>
              </div>
              
              <div className="mt-12 flex justify-between items-center">
                <span className="text-xs text-[var(--ink-faint)]">灵感来源于慢阅读与生活触觉</span>
                <button
                  onClick={handleNextPrompt}
                  className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-5 py-2.5 rounded text-sm transition-colors cursor-pointer font-medium"
                >
                  换一条灵感 🍃
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 模块三：资产管理 */}
        {activeTab === 'assets' && (
          <div className="max-w-5xl mx-auto flex flex-col gap-6">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">共享素材资产画廊</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">此处汇总了 newmaybe.com 各域名共享的核心媒体资产、图标与字体配置库。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              {assets.map((asset, idx) => (
                <div key={idx} className="bg-[var(--paper-deep)] border border-[var(--line)] rounded p-5 flex flex-col justify-between shadow-sm">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-serif text-[var(--ochre)] italic font-semibold">{asset.type}</span>
                      <span className="text-[10px] bg-[var(--paper)] text-[var(--ink-faint)] px-2 py-0.5 rounded border border-[var(--line)]">Active</span>
                    </div>
                    <h3 className="text-base font-semibold text-[var(--ink)] mb-2 font-serif">{asset.title}</h3>
                    <code className="block bg-[var(--paper)] p-2 text-xs border border-[var(--line)] rounded text-[var(--ink-soft)] font-mono break-all">
                      {asset.path}
                    </code>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[var(--line)] flex justify-end">
                    <button
                      onClick={() => handleCopyAsset(asset.path, idx)}
                      className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-3 py-1.5 rounded text-xs transition-colors cursor-pointer"
                    >
                      {copiedAssetIdx === idx ? '已复制 ✔' : '复制引用代码'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
