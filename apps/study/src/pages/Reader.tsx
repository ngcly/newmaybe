import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { BOOK_MAP } from '@/data/catalog';
import { loadChapter, loadIndex, type ChapterData } from '@/lib/texts';
import { markChapterRead, isChapterRead } from '@/lib/store';
import {
  getReaderFont,
  setReaderFont,
  getFontSize,
  setFontSize as saveFontSize,
  type ReaderFont,
  getWritingMode,
  setWritingMode,
  type WritingMode,
} from '@/lib/theme';
import { ChevronLeft, ChevronRight, List, Minus, Plus, Check } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function ReaderSkeleton() {
  return (
    <div className="py-6 space-y-8 animate-pulse">
      <div className="flex flex-col items-center space-y-3 mb-10">
        <Skeleton className="h-4 w-32 bg-muted/60" />
        <Skeleton className="h-8 w-64 bg-muted/80" />
        <div className="mt-4 flex items-center justify-center gap-2">
          <span className="h-px w-12 bg-cinnabar/30" />
          <span className="w-1.5 h-1.5 rotate-45 bg-cinnabar/40" />
          <span className="h-px w-12 bg-cinnabar/30" />
        </div>
      </div>
      <div className="space-y-4 max-w-2xl mx-auto">
        <Skeleton className="h-5 w-[92%] bg-muted/50" />
        <Skeleton className="h-5 w-[98%] bg-muted/50" />
        <Skeleton className="h-5 w-[85%] bg-muted/50" />
        <Skeleton className="h-5 w-[95%] bg-muted/50" />
        <Skeleton className="h-5 w-[76%] bg-muted/50" />
        <div className="py-2" />
        <Skeleton className="h-5 w-[90%] bg-muted/50" />
        <Skeleton className="h-5 w-[96%] bg-muted/50" />
        <Skeleton className="h-5 w-[88%] bg-muted/50" />
      </div>
    </div>
  );
}

function notify() {
  window.dispatchEvent(new Event('linxia:update'));
}

// 谱式行（平仄谱、符号谱）识别：谱式符号占绝对多数的行
function isPatternLine(s: string): boolean {
  if (s === '‖') return true;
  const pz = (s.match(/[○平仄＋－｜＝＄‖]/g) || []).length;
  if (pz < 4) return false;
  const rest = s.replace(/[○平仄＋－｜＝＄‖\s，。、．·,（）()]/g, '');
  return pz >= rest.length * 1.5;
}

function paraClass(s: string): string {
  if (s === '—— 注释 ——') return 'reader-divider';
  if (isPatternLine(s)) return 'reader-pattern';
  return '';
}

// 解析并高亮朱砂夹批/括号注释
function renderAnnotatedText(text: string) {
  const regex = /(（[^）]+）|\([^)]+\))/g;
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <span key={i} className="cinnabar-annotation">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function Reader() {
  const { bookId = '', n = '0' } = useParams();
  const num = Math.max(0, parseInt(n, 10) || 0);
  const book = BOOK_MAP[bookId];
  const navigate = useNavigate();
  const [data, setData] = useState<ChapterData | null>(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(false);
  const [fontSize, setFontSize] = useState(getFontSize);
  const [fontFam, setFontFam] = useState<ReaderFont>(getReaderFont);
  const [writingMode, setWritingModeState] = useState<WritingMode>(
    getWritingMode() || 'horizontal',
  );
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    setTotal(0);
    setDone(isChapterRead(bookId, num));
    loadIndex(bookId, controller.signal)
      .then((idx) => setTotal(idx.length))
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setError(true);
      });
    loadChapter(bookId, num, controller.signal)
      .then((d) => {
        setData(d);
        const savedMode = getWritingMode();
        if (savedMode) {
          setWritingModeState(savedMode);
        } else if (d.layout?.writingMode) {
          setWritingModeState(d.layout.writingMode);
        } else {
          setWritingModeState('horizontal');
        }
        window.scrollTo({ top: 0 });
      })
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [bookId, num]);

  useEffect(() => {
    const onScroll = () => {
      const el = bodyRef.current;
      if (!el) return;
      const totalH = el.scrollHeight - window.innerHeight;
      setProgress(totalH > 0 ? Math.min(1, window.scrollY / totalH) : 1);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, [data]);

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        未找到该书
      </div>
    );
  }

  // 元数据驱动的布局属性
  const layoutType = data?.layout?.type;
  const verse = layoutType === 'poetry' || layoutType === 'ci';
  const isCoupletBook = layoutType === 'couplet';

  const tuneName = data?.tune || '';
  const subTitle = data?.title || '';
  const poemAuthor = data?.author || '';
  const watermarkClass = data?.layout?.watermark
    ? `watermark-${data.layout.watermark}`
    : 'watermark-plum';

  return (
    <div ref={bodyRef}>
      {/* 顶部进度条 */}
      <div className="fixed top-14 left-0 right-0 h-0.5 bg-transparent z-30">
        <div
          className="h-full bg-cinnabar/70 transition-all"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
          <Link
            to={`/book/${bookId}`}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cinnabar"
          >
            <List className="w-4 h-4" /> 目录
          </Link>
          <div className="flex items-center gap-3">
            {/* 竖排 / 横排 切换 */}
            <button
              onClick={() => {
                const next: WritingMode = writingMode === 'horizontal' ? 'vertical' : 'horizontal';
                setWritingModeState(next);
                setWritingMode(next);
              }}
              className="px-3 py-1.5 rounded-md border text-xs hover:border-cinnabar/50 hover:text-cinnabar transition-colors"
            >
              {writingMode === 'horizontal' ? '切换竖排' : '切换横排'}
            </button>

            {/* 字体切换 */}
            <div className="flex items-center border rounded-md overflow-hidden bg-surface">
              <button
                onClick={() => {
                  setFontFam('song');
                  setReaderFont('song');
                }}
                className={`px-3 py-1 text-xs transition-colors border-r ${
                  fontFam === 'song'
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/30'
                }`}
              >
                宋体
              </button>
              <button
                onClick={() => {
                  setFontFam('kai');
                  setReaderFont('kai');
                }}
                className={`px-3 py-1 text-xs transition-colors ${
                  fontFam === 'kai'
                    ? 'bg-secondary font-semibold text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/30'
                }`}
              >
                楷体
              </button>
            </div>

            {/* 字号缩放 */}
            <div className="flex items-center border rounded-md overflow-hidden bg-surface">
              <button
                onClick={() => {
                  const next = Math.max(14, fontSize - 1);
                  setFontSize(next);
                  saveFontSize(next);
                }}
                className="p-1.5 hover:bg-secondary/30 text-muted-foreground"
                aria-label="缩小字号"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="px-2 text-xs border-x select-none">{fontSize}</span>
              <button
                onClick={() => {
                  const next = Math.min(24, fontSize + 1);
                  setFontSize(next);
                  saveFontSize(next);
                }}
                className="p-1.5 hover:bg-secondary/30 text-muted-foreground"
                aria-label="放大字号"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 标记已读 */}
            <button
              onClick={() => {
                const next = !done;
                setDone(next);
                markChapterRead(bookId, num, next);
                notify();
              }}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs border transition-colors ${
                done
                  ? 'bg-cinnabar/10 text-cinnabar border-cinnabar/20'
                  : 'bg-surface hover:border-cinnabar/40'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              {done ? '已读' : '标记已读'}
            </button>
          </div>
        </div>

        {error && (
          <div className="py-20 text-center text-destructive">加载失败，请检查网络或刷新重试。</div>
        )}

        {!data && !error && <ReaderSkeleton />}

        {data && (
          <article
            className={`relative p-8 md:p-12 rounded-xl border bg-surface shadow-sm overflow-hidden paper-texture ${watermarkClass}`}
          >
            {/* 标题部分：支持词牌朱砂印章 */}
            <header className="text-center mb-10 relative z-10">
              <p className="text-xs tracking-[0.3em] text-muted-foreground mb-3">
                {poemAuthor ? `${book.title} · ${poemAuthor}` : `${book.title} · ${book.author}`}
              </p>
              {tuneName ? (
                <div className="flex flex-col items-center gap-2">
                  <span className="tune-seal-badge text-lg mb-1">{tuneName}</span>
                  {subTitle && <h1 className="text-2xl font-bold leading-relaxed">{subTitle}</h1>}
                </div>
              ) : (
                <h1 className="text-2xl font-bold leading-relaxed">{data.title}</h1>
              )}
              <div className="mt-4 flex items-center justify-center gap-2">
                <span className="h-px w-12 bg-cinnabar/40" />
                <span className="w-1.5 h-1.5 rotate-45 bg-cinnabar/60" />
                <span className="h-px w-12 bg-cinnabar/40" />
              </div>
            </header>

            {/* 竖排画卷模式 */}
            {writingMode === 'vertical' ? (
              <div className="reader-vertical-wrapper relative z-10">
                <div
                  className={`reader-vertical ${fontFam === 'kai' ? 'reader-kai' : ''}`}
                  style={{ fontSize }}
                >
                  {data.paras.reduce<React.ReactNode[]>((acc, stanza, i) => {
                    const pCls = stanza.length === 1 ? paraClass(stanza[0]) : '';
                    // 插入折页中缝/版心中缝
                    if (i > 0 && i % 8 === 0) {
                      if (isCoupletBook) {
                        acc.push(
                          <div key={`banxin-${i}`} className="banxin-fold shrink-0 select-none">
                            <div className="banxin-fishtail" />
                            <div className="py-2 text-[10px] opacity-70 font-semibold">
                              {book.title}
                            </div>
                            <div className="banxin-fishtail rotate-180" />
                          </div>,
                        );
                      } else {
                        acc.push(
                          <div key={`crease-${i}`} className="crease-line shrink-0 select-none" />,
                        );
                      }
                    }

                    stanza.forEach((line, idx) => {
                      const lineCls = paraClass(line);
                      acc.push(
                        <p
                          key={`${i}-${idx}`}
                          className={`font-medium tracking-widest my-0 mx-4 pl-2 text-justify ${
                            isCoupletBook ? 'border-l border-dashed border-cinnabar/15' : ''
                          } ${pCls || lineCls}`}
                        >
                          {renderAnnotatedText(line)}
                        </p>,
                      );
                    });

                    return acc;
                  }, [])}
                </div>
              </div>
            ) : (
              /* 标准横排模式 */
              <div
                className={`reader-body relative z-10 ${verse ? 'reader-verse text-center' : ''} ${fontFam === 'kai' ? 'reader-kai' : ''}`}
                style={{ fontSize }}
              >
                {data.paras.map((stanza, i) => {
                  const pCls = stanza.length === 1 ? paraClass(stanza[0]) : '';

                  if (isCoupletBook && !pCls) {
                    return (
                      <div key={i} className="couplet-card text-center my-6 py-6 px-8 space-y-4">
                        {stanza.map((line, idx) => (
                          <p
                            key={idx}
                            className="m-0 text-lg md:text-xl font-medium tracking-widest text-foreground/90 leading-relaxed"
                          >
                            {renderAnnotatedText(line)}
                          </p>
                        ))}
                      </div>
                    );
                  }

                  if ((layoutType === 'poetry' || layoutType === 'ci') && !pCls) {
                    return (
                      <div key={i} className="my-8 space-y-3.5 flex flex-col items-center">
                        {stanza.map((line, idx) => {
                          const lineCls = paraClass(line);
                          return (
                            <p
                              key={idx}
                              className={`m-0 text-lg md:text-xl font-medium tracking-widest text-center text-foreground/90 leading-relaxed max-w-xl ${lineCls}`}
                            >
                              {renderAnnotatedText(line)}
                            </p>
                          );
                        })}
                      </div>
                    );
                  }

                  // 默认段落排版
                  return (
                    <div key={i} className="my-6 space-y-3">
                      {stanza.map((line, idx) => (
                        <p key={idx} className={pCls || paraClass(line) || undefined}>
                          {renderAnnotatedText(line)}
                        </p>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </article>
        )}

        <div className="mt-14 flex items-center justify-between border-t pt-6">
          <button
            disabled={num <= 0}
            onClick={() => navigate(`/book/${bookId}/read/${num - 1}`)}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md border hover:border-cinnabar/50 hover:text-cinnabar disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" /> 上一章
          </button>
          <span className="text-xs text-muted-foreground">
            {num + 1}
            {total ? ` / ${total}` : ''}
          </span>
          <button
            disabled={!data || total === 0 || num >= total - 1}
            onClick={() => {
              markChapterRead(bookId, num, true);
              notify();
              navigate(`/book/${bookId}/read/${num + 1}`);
            }}
            className="inline-flex items-center gap-1.5 text-sm px-4 py-2 rounded-md bg-cinnabar text-white hover:bg-cinnabar/90 disabled:opacity-30 disabled:pointer-events-none"
          >
            下一章 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
