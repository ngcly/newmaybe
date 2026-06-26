import { useState, useEffect, useRef } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';

type Tab = 'poster' | 'inspiration' | 'assets';
type ThemeType = 'paper' | 'dark' | 'ochre' | 'bamboo' | 'sunset';
type RatioType = '9:16' | '4:3' | '1:1' | '1.91:1';
type AlignType = 'left' | 'center';

interface Prompt {
  category: string;
  text: string;
}

interface DailyPoem {
  content: string;
  author: string;
  origin: string;
}

const CATEGORIES = ['随笔', '诗歌', '散文', '观察', '念头', '记忆'] as const;

const _isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

const SIZES = {
  '9:16': { w: 720, h: 1280 },
  '4:3': { w: 960, h: 720 },
  '1:1': { w: 800, h: 800 },
  '1.91:1': { w: 1200, h: 630 },
};

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>('poster');

  // 从 URL query 参数中恢复传递来的内容，以支持 AI 域的卡片联动跳转
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const quoteParam = params.get('quote');
    if (quoteParam) {
      setQuote(quoteParam);
      // 切换到海报生成 tab
      setActiveTab('poster');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // 海报参数状态
  const [title, setTitle] = useState('思考的经纬');
  const [subtitle, setSubtitle] = useState('newmaybe.com 数字花园图谱上线');
  const [quote, setQuote] = useState('我们都是尚未写完的句子，留白处，才是温柔所在。');
  const [author, setAuthor] = useState('林');
  const [watermark, setWatermark] = useState('留');
  const [theme, setTheme] = useState<ThemeType>('paper');
  const [ratio, setRatio] = useState<RatioType>('1.91:1');
  const [align, setAlign] = useState<AlignType>('left');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 今日诗词状态
  const [dailyPoem, setDailyPoem] = useState<DailyPoem | null>(null);

  // AI 写作命题状态
  const [aiPrompt, setAiPrompt] = useState<Prompt | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('随笔');
  const [copiedPromptMsg, setCopiedPromptMsg] = useState(false);

  // 今日诗词：按日缓存，并使用官方 JS-SDK 避免前端直接 Fetch 导致的 CORS Preflight 403 跨域错误
  useEffect(() => {
    const today = new Date().toDateString();
    try {
      const cached = localStorage.getItem('jinrishici_poem');
      if (cached) {
        const { date, poem } = JSON.parse(cached) as { date: string; poem: DailyPoem };
        if (date === today) { setDailyPoem(poem); return; }
      }
    } catch {}

    const loadPoemFromSDK = () => {
      const sdk = (window as any).jinrishici;
      if (sdk) {
        sdk.load((result: any) => {
          if (result && result.status === 'success') {
            const poem: DailyPoem = {
              content: result.data.content,
              author: result.data.origin.author,
              origin: result.data.origin.title,
            };
            setDailyPoem(poem);
            localStorage.setItem('jinrishici_poem', JSON.stringify({ date: today, poem }));
          }
        });
      }
    };

    if ((window as any).jinrishici) {
      loadPoemFromSDK();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.jinrishici.com/v2/browser/jinrishici.js';
      script.charset = 'utf-8';
      script.onload = loadPoemFromSDK;
      document.head.appendChild(script);
    }
  }, []);

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
    const { w: width, h: height } = SIZES[ratio];
    canvas.width = width;
    canvas.height = height;
    ctx.clearRect(0, 0, width, height);

    // 主题色彩映射
    const colors = {
      paper: { bg: '#F7F3EC', text: '#2B2722', accent: '#A8643C', line: '#D9CFBF', watermark: 'rgba(168, 100, 60, 0.045)' },
      dark: { bg: '#1E1B18', text: '#E8E0D5', accent: '#C4814E', line: '#3A3430', watermark: 'rgba(232, 224, 213, 0.045)' },
      ochre: { bg: '#A8643C', text: '#F7F3EC', accent: '#2B2722', line: '#8A4F2E', watermark: 'rgba(43, 39, 34, 0.08)' },
      bamboo: { bg: '#EAF2EC', text: '#1C2E24', accent: '#6B8E7B', line: '#C5D6C9', watermark: 'rgba(28, 46, 36, 0.045)' },
      sunset: { bg: '#F7ECE6', text: '#2E221B', accent: '#C97B6B', line: '#E5D0C5', watermark: 'rgba(46, 34, 27, 0.045)' }
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
      const watermarkSize = Math.min(width, height) * 0.55;
      ctx.font = `normal ${watermarkSize}px "Noto Serif SC", "Songti SC", serif`;
      ctx.fillText(watermark, width / 2, height / 2);
    }

    // D. 绘制顶部信息 (Category / Branding)
    ctx.fillStyle = colors.accent;
    ctx.textBaseline = 'top';
    ctx.font = 'italic 20px "Cormorant Garamond", Georgia, serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText('newmaybe.com · Editorial Studio', width / 2, 80);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText('newmaybe.com · Editorial Studio', 80, 80);
    }

    // E. 绘制主标题 (Title)
    const titleY = height * 0.22;
    const subtitleY = titleY + 90;
    const lineY = subtitleY + 60;
    const quoteStartY = lineY + 60;

    ctx.fillStyle = colors.text;
    ctx.font = 'normal 64px "Noto Serif SC", "Songti SC", serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(title, width / 2, titleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(title, 80, titleY);
    }

    // F. 绘制副标题 (Subtitle)
    ctx.fillStyle = colors.accent;
    ctx.font = 'normal 24px "Noto Serif SC", "Songti SC", serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
      ctx.fillText(subtitle, width / 2, subtitleY);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(subtitle, 80, subtitleY);
    }

    // G. 绘制中间装饰性横线
    ctx.strokeStyle = colors.line;
    ctx.beginPath();
    if (align === 'center') {
      ctx.moveTo(width / 2 - 160, lineY);
      ctx.lineTo(width / 2 + 160, lineY);
    } else {
      ctx.moveTo(80, lineY);
      ctx.lineTo(400, lineY);
    }
    ctx.stroke();

    // H. 绘制引言正文 (Quote)
    ctx.fillStyle = colors.text;
    ctx.font = 'italic 32px "Noto Serif SC", "Songti SC", serif';
    if (align === 'center') {
      ctx.textAlign = 'center';
    } else {
      ctx.textAlign = 'left';
    }
    
    // 多行排版处理
    const maxQuoteWidth = width - 160;
    const words = quote.split('');
    let line = '';
    let y = quoteStartY;
    const lineHeight = 50;

    for (let n = 0; n < words.length; n++) {
      let testLine = line + words[n];
      let metrics = ctx.measureText(testLine);
      let testWidth = metrics.width;
      if (testWidth > maxQuoteWidth && n > 0) {
        if (align === 'center') {
          ctx.fillText(line, width / 2, y);
        } else {
          ctx.fillText(line, 80, y);
        }
        line = words[n];
        y += lineHeight;
      } else {
        line = testLine;
      }
    }
    if (align === 'center') {
      ctx.fillText(line, width / 2, y);
    } else {
      ctx.fillText(line, 80, y);
    }

    // I. 绘制作者与落款印章 (Stamp)
    if (author) {
      const stampSize = 50;
      const stampX = width - 80 - stampSize;
      const stampY = height - 80 - stampSize;

      // 绘制传统的印章矩形底色
      ctx.fillStyle = (theme === 'ochre' || theme === 'sunset') ? '#2B2722' : colors.accent;
      ctx.fillRect(stampX, stampY, stampSize, stampSize);

      // 印章中的白字 (作者单字落款)
      ctx.fillStyle = '#F7F3EC';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 24px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(author.slice(0, 1), stampX + stampSize / 2, stampY + stampSize / 2);
    }
  }, [title, subtitle, quote, author, watermark, theme, ratio, align]);

  // 2. 一键下载 PNG 图片
  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${title || 'poster'}-${theme}-${ratio.replace(':', '_')}.png`;
    link.href = url;
    link.click();
  };

  // 3. 联动复制前往 Zen Writer
  const handleCopyToZenWriter = () => {
    if (!aiPrompt) return;
    navigator.clipboard.writeText(aiPrompt.text);
    setCopiedPromptMsg(true);
    setTimeout(() => {
      setCopiedPromptMsg(false);
      window.open(`${resolveSubdomain('https://lab.newmaybe.com/zen-writer')}?draft=${encodeURIComponent(aiPrompt.text)}`, '_blank');
    }, 1200);
  };

  // 4. AI 生成写作命题
  const handleGeneratePrompt = async () => {
    setAiLoading(true);
    setAiPrompt(null);
    try {
      const endpoint = resolveSubdomain('https://ai.newmaybe.com') + '/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: '你是一位中文文学写作教练，擅长随笔、诗歌、散文创作。请根据用户指定的写作分类，生成一条具体、有画面感的写作命题。只返回命题本身，50-80字，不加任何前缀或解释，以句号结尾。',
            },
            {
              role: 'user',
              content: `请为"${selectedCategory}"分类生成一条写作命题。`,
            },
          ],
        }),
      });
      const data = await res.json() as { text?: string };
      if (data.text) {
        setAiPrompt({ category: selectedCategory, text: data.text.trim() });
      }
    } catch {
      // 网络不可用时提供一条后备命题
      setAiPrompt({ category: selectedCategory, text: '在一个没有手机信号的山中小屋里，用一封信记录下这24小时内所有细微的感受与念头。' });
    } finally {
      setAiLoading(false);
    }
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
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
            newmaybe<span className="text-[var(--ochre)] font-serif">.studio</span>
          </a>
          <p className="text-xs text-[var(--ink-faint)] mt-2">创作层 · 媒体与素材资产工坊</p>
        </div>

        {/* 标签栏选择 */}
        <nav className="flex flex-row md:flex-col gap-2 flex-grow">
          <button
            onClick={() => setActiveTab('poster')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'poster'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            新可能排版封面海报
          </button>
          <button
            onClick={() => setActiveTab('inspiration')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'inspiration'
                ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
            }`}
          >
            灵感写作命题库
          </button>
          <button
            onClick={() => setActiveTab('assets')}
            className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all cursor-pointer ${
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
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline">
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
              <p className="text-sm text-[var(--ink-soft)] mt-1">在前端通过 Canvas 像素级绘制高清多比例海报，支持自定义配色方案及文本对齐方式，可一键下载。</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* 控制输入 (5 columns) */}
              <div className="lg:col-span-5 flex flex-col gap-4 bg-[var(--paper-deep)] border border-[var(--line)] rounded p-6">
                
                {/* 预设配色切换 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">主题色板 Color Scheme</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    <button
                      type="button"
                      onClick={() => setTheme('paper')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'paper' ? 'bg-[#F7F3EC] text-[#2B2722] border-[#A8643C] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                      }`}
                    >
                      米纸底 (Cream) 📄
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'dark' ? 'bg-[#1E1B18] text-[#E8E0D5] border-[#C4814E] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                      }`}
                    >
                      暗夜白字 🌙
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('ochre')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'ochre' ? 'bg-[#A8643C] text-[#F7F3EC] border-[#2B2722] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                      }`}
                    >
                      赭石底 (Ochre) 🔴
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('bamboo')}
                      className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'bamboo' ? 'bg-[#EAF2EC] text-[#1C2E24] border-[#6B8E7B] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                      }`}
                    >
                      竹青底 (Bamboo) 🍃
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme('sunset')}
                      className={`col-span-2 py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                        theme === 'sunset' ? 'bg-[#F7ECE6] text-[#2E221B] border-[#C97B6B] shadow-sm' : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                      }`}
                    >
                      晚霞底 (Sunset) 🌅
                    </button>
                  </div>
                </div>

                {/* 海报比例选择 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">海报尺寸比例 Ratio</label>
                  <div className="grid grid-cols-4 gap-1.5 mt-1">
                    {(['9:16', '4:3', '1:1', '1.91:1'] as const).map(r => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setRatio(r)}
                        className={`py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          ratio === r
                            ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-sm'
                            : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                        }`}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 文本对齐方式 */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs text-[var(--ink-soft)] font-medium">排版对齐方式 Alignment</label>
                  <div className="flex gap-2 mt-1">
                    {(['left', 'center'] as const).map(a => (
                      <button
                        key={a}
                        type="button"
                        onClick={() => setAlign(a)}
                        className={`flex-grow py-1.5 rounded text-xs font-semibold border transition-all cursor-pointer ${
                          align === a
                            ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] shadow-sm'
                            : 'bg-transparent text-[var(--ink-soft)] border-[var(--line)] hover:bg-[var(--paper)]'
                        }`}
                      >
                        {a === 'left' ? '居左对齐 ⫷' : '居中对齐 ⫸'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">大标题 (Title)</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">副标题/描述 (Subtitle)</label>
                    <input
                      type="text"
                      value={subtitle}
                      onChange={(e) => setSubtitle(e.target.value)}
                      className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-[var(--ink-soft)] font-medium">引言/正文 (Quote)</label>
                    <textarea
                      value={quote}
                      onChange={(e) => setQuote(e.target.value)}
                      className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm h-24 focus:border-[var(--ochre)] outline-none resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[var(--ink-soft)] font-medium">印款签名 (Stamp)</label>
                      <input
                        type="text"
                        value={author}
                        onChange={(e) => setAuthor(e.target.value)}
                        placeholder={'落款字，如“林”'}
                        className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-[var(--ink-soft)] font-medium">背景巨幅水印</label>
                      <input
                        type="text"
                        value={watermark}
                        onChange={(e) => setWatermark(e.target.value)}
                        maxLength={1}
                        placeholder={'单字，如"雨"'}
                        className="p-2 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleDownload}
                  className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] py-3 px-4 rounded font-medium text-sm transition-all hover:scale-[1.01] active:scale-[0.99] shadow-sm hover:shadow cursor-pointer mt-2"
                >
                  导出并下载高清海报 PNG
                </button>
              </div>

              {/* 右侧渲染画布 (7 columns) */}
              <div className="lg:col-span-7 flex flex-col gap-3 w-full">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ink-faint)]">画布渲染预览 (Canvas Render)</span>
                <div className="w-full flex justify-center items-center bg-[var(--paper-deep)] border border-[var(--line)] rounded p-4 shadow-sm overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full max-w-[500px] h-auto border border-[var(--line)]/50 rounded shadow-md bg-[var(--paper)]"
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* 模块二：灵感库 */}
        {activeTab === 'inspiration' && (
          <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
            <div>
              <h2 className="text-2xl font-medium text-[var(--ink)]">文学写作灵感启发</h2>
              <p className="text-sm text-[var(--ink-soft)] mt-1">今日诗词为你铺垫情绪，AI 为你生成专属写作命题，一键直达禅意写作空间。</p>
            </div>

            {/* 今日诗词 */}
            <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg px-8 py-6 shadow-sm">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)]">今日诗词</span>
              {dailyPoem ? (
                <div className="mt-4">
                  <p className="font-serif text-xl leading-loose text-[var(--ink)] tracking-wider">
                    {dailyPoem.content}
                  </p>
                  <p className="text-xs text-[var(--ink-faint)] mt-3">
                    {dailyPoem.author} · 《{dailyPoem.origin}》
                  </p>
                </div>
              ) : (
                <p className="font-serif text-base text-[var(--ink-faint)] mt-4 animate-pulse">正在拾取今日诗意…</p>
              )}
            </div>

            {/* AI 写作命题 */}
            <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-8 md:p-10 flex flex-col gap-6 shadow-sm">
              {/* 分类选择 */}
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3.5 py-1.5 rounded text-sm transition-colors cursor-pointer ${
                      selectedCategory === cat
                        ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium'
                        : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)]'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* 命题展示区 */}
              <div className="min-h-[120px] flex items-center">
                {aiLoading ? (
                  <p className="font-serif text-lg text-[var(--ink-faint)] animate-pulse">AI 正在生成命题…</p>
                ) : aiPrompt ? (
                  <div>
                    <p className="font-serif text-2xl leading-relaxed text-[var(--ink)] text-justify">
                      "{aiPrompt.text}"
                    </p>
                    <span className="inline-block mt-3 text-xs text-[var(--ink-faint)] border border-[var(--line)] px-2 py-0.5 rounded">
                      {aiPrompt.category} · 由 AI 生成
                    </span>
                  </div>
                ) : (
                  <p className="font-serif text-base text-[var(--ink-faint)]">选择分类后点击「生成命题」，AI 将为你定制一条写作任务。</p>
                )}
              </div>

              {/* 操作按钮 */}
              <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-[var(--line)]">
                <button
                  onClick={handleGeneratePrompt}
                  disabled={aiLoading}
                  className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] disabled:opacity-50 text-[var(--paper)] px-5 py-2.5 rounded text-sm transition-all cursor-pointer font-medium hover:scale-[1.02] active:scale-[0.98]"
                >
                  {aiLoading ? '生成中…' : '生成命题 ✦'}
                </button>
                {aiPrompt && (
                  <button
                    onClick={handleCopyToZenWriter}
                    className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-5 py-2.5 rounded text-sm transition-colors cursor-pointer font-medium"
                  >
                    {copiedPromptMsg ? '已复制，前往写作中… ✍' : '复制并前往禅意写作空间 ↗'}
                  </button>
                )}
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
