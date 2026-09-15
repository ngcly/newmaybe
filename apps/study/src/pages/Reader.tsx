import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
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
  getShowAnnotation,
  setShowAnnotation as saveShowAnnotation,
  getZenMode,
  setZenMode as saveZenMode,
} from '@/lib/theme';
import { ChevronLeft, ChevronRight, Minimize2 } from 'lucide-react';
import { ReaderSkeleton } from '@/components/ReaderSkeleton';
import { ReaderSettingsDrawer } from '@/components/ReaderSettingsDrawer';
import { ReaderToolbar } from '@/components/ReaderToolbar';
import { notify, paraClass, renderAnnotatedText } from '@/lib/reader-utils';

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
  const [showAnnotation, setShowAnnotationState] = useState(getShowAnnotation);
  const [zenMode, setZenModeState] = useState(getZenMode);
  const [showSettingsDrawer, setShowSettingsDrawer] = useState(false);
  const [done, setDone] = useState(false);
  const [progress, setProgress] = useState(0);

  const bodyRef = useRef<HTMLDivElement>(null);
  const verticalScrollRef = useRef<HTMLDivElement>(null);

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
        window.scrollTo({ top: 0, behavior: 'instant' });
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
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [data]);

  // 键盘快捷键监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 避免在输入框中触发
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'Escape') {
        if (zenMode) {
          setZenModeState(false);
          saveZenMode(false);
        }
        if (showSettingsDrawer) {
          setShowSettingsDrawer(false);
        }
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (writingMode === 'vertical' && verticalScrollRef.current) {
          // 竖排模式向左滚动（古籍从右往左读，左滚是往后）
          verticalScrollRef.current.scrollBy({ left: -320, behavior: 'smooth' });
        } else if (num > 0) {
          navigate(`/book/${bookId}/read/${num - 1}`);
        }
      } else if (e.key === 'ArrowRight' && !e.altKey && !e.ctrlKey && !e.metaKey) {
        if (writingMode === 'vertical' && verticalScrollRef.current) {
          verticalScrollRef.current.scrollBy({ left: 320, behavior: 'smooth' });
        } else if (data && total > 0 && num < total - 1) {
          markChapterRead(bookId, num, true);
          notify();
          navigate(`/book/${bookId}/read/${num + 1}`);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [bookId, num, data, total, writingMode, zenMode, showSettingsDrawer, navigate]);

  // 竖排模式下桌面端鼠标滚轮横向平滑翻卷支持
  useEffect(() => {
    if (writingMode !== 'vertical') return;
    const el = verticalScrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (e.deltaY !== 0 && Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        // 自右向左古籍翻卷：向下滚动 deltaY > 0 往左翻（查看后续篇章内容）
        el.scrollBy({ left: -e.deltaY, behavior: 'auto' });
        e.preventDefault();
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [writingMode, data]);

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

  // 竖排滚动控制
  const scrollVertical = (offset: number) => {
    if (verticalScrollRef.current) {
      verticalScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const toggleWritingMode = () => {
    const next: WritingMode = writingMode === 'horizontal' ? 'vertical' : 'horizontal';
    setWritingModeState(next);
    setWritingMode(next);
  };

  const toggleAnnotation = () => {
    const next = !showAnnotation;
    setShowAnnotationState(next);
    saveShowAnnotation(next);
  };

  const toggleZen = () => {
    const next = !zenMode;
    setZenModeState(next);
    saveZenMode(next);
  };

  const toggleDone = () => {
    if (!data || error || total === 0 || num >= total) return;
    const next = !done;
    setDone(next);
    markChapterRead(bookId, num, next);
    notify();
  };

  return (
    <div ref={bodyRef} className={`relative min-h-screen ${zenMode ? 'zen-active' : ''}`}>
      {/* 顶部进度条 */}
      <div className="fixed top-0 md:top-14 left-0 right-0 h-0.5 bg-transparent z-40">
        <div
          className="h-full bg-cinnabar/80 transition-all duration-150"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* 专注模式退出浮动按钮 */}
      {zenMode && (
        <button
          onClick={toggleZen}
          className="fixed top-4 right-4 z-50 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-paper/80 backdrop-blur border text-xs shadow-sm hover:border-cinnabar/50 hover:text-cinnabar transition-all opacity-40 hover:opacity-100"
          title="退出禅定模式 (Esc)"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>退出禅定</span>
        </button>
      )}

      <div className={`mx-auto max-w-3xl px-4 ${zenMode ? 'py-6 md:py-12' : 'py-6 md:py-8'}`}>
        {/* 控制工具栏 */}
        <ReaderToolbar
          bookId={bookId}
          bookTitle={book.title}
          num={num}
          total={total}
          zenMode={zenMode}
          writingMode={writingMode}
          onToggleWritingMode={toggleWritingMode}
          fontFam={fontFam}
          onFontFamChange={(f) => {
            setFontFam(f);
            setReaderFont(f);
          }}
          fontSize={fontSize}
          onFontSizeChange={(s) => {
            setFontSize(s);
            saveFontSize(s);
          }}
          showAnnotation={showAnnotation}
          onToggleAnnotation={toggleAnnotation}
          onToggleZen={toggleZen}
          done={done}
          onToggleDone={toggleDone}
          canMarkRead={Boolean(data && !error && total > 0 && num < total)}
          onOpenSettings={() => setShowSettingsDrawer(true)}
        />

        {/* 移动端排版设置底部抽屉 */}
        <ReaderSettingsDrawer
          isOpen={showSettingsDrawer}
          onClose={() => setShowSettingsDrawer(false)}
          writingMode={writingMode}
          onWritingModeChange={(mode) => {
            setWritingModeState(mode);
            setWritingMode(mode);
          }}
          fontFam={fontFam}
          onFontFamChange={(font) => {
            setFontFam(font);
            setReaderFont(font);
          }}
          fontSize={fontSize}
          onFontSizeChange={(size) => {
            setFontSize(size);
            saveFontSize(size);
          }}
          showAnnotation={showAnnotation}
          onToggleAnnotation={toggleAnnotation}
          onToggleZen={toggleZen}
        />

        {error && (
          <div className="py-20 text-center text-destructive">加载失败，请检查网络或刷新重试。</div>
        )}

        {!data && !error && <ReaderSkeleton />}

        {data && (
          <article
            className={`relative p-6 sm:p-8 md:p-12 rounded-xl border bg-surface shadow-sm overflow-hidden paper-texture transition-all ${watermarkClass} ${
              !showAnnotation ? 'hide-annotation' : ''
            }`}
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
              <div className="relative group/vertical z-10">
                {/* 竖排左右悬浮滚动按键 */}
                <button
                  onClick={() => scrollVertical(-300)}
                  className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 z-20 w-8 h-14 items-center justify-center rounded-r-md bg-paper/80 backdrop-blur border border-l-0 shadow-sm text-muted-foreground hover:text-cinnabar hover:bg-paper transition-all opacity-0 group-hover/vertical:opacity-90"
                  title="向左翻卷"
                  aria-label="向左翻卷"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => scrollVertical(300)}
                  className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 z-20 w-8 h-14 items-center justify-center rounded-l-md bg-paper/80 backdrop-blur border border-r-0 shadow-sm text-muted-foreground hover:text-cinnabar hover:bg-paper transition-all opacity-0 group-hover/vertical:opacity-90"
                  title="向右翻卷"
                  aria-label="向右翻卷"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <div
                  ref={verticalScrollRef}
                  className="reader-vertical-wrapper relative scroll-smooth"
                >
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
                            <div
                              key={`crease-${i}`}
                              className="crease-line shrink-0 select-none"
                            />,
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
                      <div
                        key={i}
                        className="couplet-card text-center my-6 py-6 px-4 sm:px-8 space-y-4"
                      >
                        {stanza.map((line, idx) => (
                          <p
                            key={idx}
                            className="m-0 text-base sm:text-lg md:text-xl font-medium tracking-widest text-foreground/90 leading-relaxed"
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
                              className={`m-0 text-base sm:text-lg md:text-xl font-medium tracking-widest text-center text-foreground/90 leading-relaxed max-w-xl ${lineCls}`}
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

        {/* 底部翻章导航 */}
        <div className="mt-12 flex items-center justify-between border-t pt-6">
          <button
            disabled={num <= 0}
            onClick={() => navigate(`/book/${bookId}/read/${num - 1}`)}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-md border hover:border-cinnabar/50 hover:text-cinnabar disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> 上一章
          </button>
          <span className="text-xs text-muted-foreground font-medium">
            第 {num + 1} 章 {total ? `· 共 ${total} 章` : ''}
          </span>
          <button
            disabled={!data || total === 0 || num >= total - 1}
            onClick={() => {
              markChapterRead(bookId, num, true);
              notify();
              navigate(`/book/${bookId}/read/${num + 1}`);
            }}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm px-3.5 py-2 rounded-md bg-cinnabar text-white hover:bg-cinnabar/90 disabled:opacity-30 disabled:pointer-events-none shadow-xs transition-colors"
          >
            下一章 <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
