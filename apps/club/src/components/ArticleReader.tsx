import { useState, useEffect, useRef, useCallback } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  X,
} from 'lucide-react';
import type { Article, ArticleSummary, Comment, ReaderPreferences } from '../types';
import CommentSection from './CommentSection';
import ReadingProgressBar from './ReadingProgressBar';
import ReaderSettingsDrawer from './ReaderSettingsDrawer';
import QuoteCardModal from './QuoteCardModal';
import ArticleHeader from './ArticleHeader';
import TitleText from './TitleText';
import './reader.css';

interface ArticleReaderProps {
  article: Article;
  allArticles: ArticleSummary[];
  comments: Comment[] | null;
  /** The comments could not be fetched; offer a retry instead of an empty list. */
  commentsFailed?: boolean;
  onRetryComments?: () => void;
  preferences: ReaderPreferences;
  onPreferencesChange: (prefs: ReaderPreferences) => void;
  onResetPreferences: () => void;
  onBack: () => void;
  onSelectArticle: (article: ArticleSummary) => void;
  onLikeArticle: (articleId: string) => Promise<void>;
  onAddComment: (
    articleId: string,
    author: string,
    content: string,
    replyToId?: string,
    replyToAuthor?: string,
  ) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
}

export default function ArticleReader({
  article,
  allArticles,
  comments,
  commentsFailed,
  onRetryComments,
  preferences,
  onPreferencesChange,
  onResetPreferences,
  onBack,
  onSelectArticle,
  onLikeArticle,
  onAddComment,
  onLikeComment,
}: ArticleReaderProps) {
  const [hasLiked, setHasLiked] = useState(false);
  const [likeError, setLikeError] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const closeSettings = useCallback(() => setIsSettingsOpen(false), []);
  const [isQuoteCardOpen, setIsQuoteCardOpen] = useState(false);
  const [selectedQuoteText, setSelectedQuoteText] = useState(
    article.goldenQuote || article.summary || '',
  );
  const [selectionBubble, setSelectionBubble] = useState<{
    x: number;
    y: number;
    text: string;
  } | null>(null);
  const [prevArticleId, setPrevArticleId] = useState(article.id);
  const [resumeData, setResumeData] = useState<{ pct: number; y: number } | null>(() => {
    if (typeof window === 'undefined') return null;
    const STORAGE_KEY = `newmaybe:club:read-pos:${article.id}`;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && saved.pct >= 15 && saved.pct <= 90 && window.scrollY < 120) {
          return saved;
        }
      }
    } catch {
      /* ignore */
    }
    return null;
  });
  const [showResume, setShowResume] = useState(() => Boolean(resumeData));
  const articleRef = useRef<HTMLElement | null>(null);

  if (prevArticleId !== article.id) {
    setPrevArticleId(article.id);
    let newResume: { pct: number; y: number } | null = null;
    if (typeof window !== 'undefined') {
      const STORAGE_KEY = `newmaybe:club:read-pos:${article.id}`;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && saved.pct >= 15 && saved.pct <= 90 && window.scrollY < 120) {
            newResume = saved;
          }
        }
      } catch {
        /* ignore */
      }
    }
    setResumeData(newResume);
    setShowResume(Boolean(newResume));
  }

  // 1. 阅读位置持久化与断点续读
  useEffect(() => {
    const STORAGE_KEY = `newmaybe:club:read-pos:${article.id}`;

    let ticking = false;
    const onScroll = () => {
      if (window.scrollY > 350) {
        setShowResume(false);
      }
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => {
          const total = document.documentElement.scrollHeight - window.innerHeight;
          if (total > 0) {
            const pct = Math.round((window.scrollY / total) * 100);
            if (pct > 92) {
              localStorage.removeItem(STORAGE_KEY);
            } else if (pct >= 15) {
              localStorage.setItem(STORAGE_KEY, JSON.stringify({ pct, y: window.scrollY }));
            }
          }
          ticking = false;
        });
      }
    };

    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [article.id]);

  // 2. 划选文字气泡摘录
  useEffect(() => {
    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed) {
        setSelectionBubble(null);
        return;
      }
      const text = sel.toString().trim();
      if (text.length < 2) {
        setSelectionBubble(null);
        return;
      }
      const range = sel.rangeCount > 0 ? sel.getRangeAt(0) : null;
      if (!range || !articleRef.current?.contains(range.commonAncestorContainer)) {
        setSelectionBubble(null);
        return;
      }
      const rect = range.getBoundingClientRect();
      setSelectionBubble({
        x: Math.max(16, Math.min(window.innerWidth - 130, rect.left + rect.width / 2 - 55)),
        y: Math.max(12, rect.top - 46),
        text,
      });
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    return () => document.removeEventListener('selectionchange', handleSelectionChange);
  }, []);

  const handleLike = async () => {
    if (!hasLiked) {
      try {
        await onLikeArticle(article.id);
        setHasLiked(true);
        setLikeError('');
      } catch {
        setLikeError('共鸣失败，请稍后重试');
      }
    }
  };

  // Find previous and next articles
  const currentIdx = allArticles.findIndex((a) => a.id === article.id);
  const prevArticle = currentIdx > 0 ? allArticles[currentIdx - 1] : null;
  const nextArticle =
    currentIdx >= 0 && currentIdx < allArticles.length - 1 ? allArticles[currentIdx + 1] : null;

  // Series articles if in series
  const seriesArticles = article.seriesTitle
    ? allArticles
        .filter((a) => a.seriesTitle === article.seriesTitle)
        .sort((a, b) => (a.seriesOrder || 0) - (b.seriesOrder || 0))
    : [];

  // Theme styling classes mapping
  const fontClass = {
    song: 'font-serif',
    kai: 'font-kai',
    sans: 'font-sans',
  }[preferences.font];

  const fontSizeClass = {
    sm: 'text-base',
    md: 'text-lg',
    lg: 'text-xl',
    xl: 'text-2xl',
  }[preferences.fontSize];

  const lineHeightClass = {
    compact: 'leading-[1.85]',
    normal: 'leading-[2.15]',
    relaxed: 'leading-[2.45]',
  }[preferences.lineHeight];

  // Convert raw content paragraphs to clean array
  const paragraphs = article.content.split('\n\n').filter((p) => p.trim());

  const handleOpenQuoteWithText = (text: string) => {
    setSelectedQuoteText(text);
    setIsQuoteCardOpen(true);
  };

  return (
    <div className={`club-reader club-reader-theme-${preferences.theme}`}>
      <ReadingProgressBar />

      <div className="club-reader__page">
        <nav aria-label="文章操作导航" className="club-reader__toolbar">
          <button onClick={onBack} className="club-reader__back">
            <ChevronLeft size={16} aria-hidden="true" />
            <span>返回雅集广场</span>
          </button>
          <div className="club-reader__tools">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="club-reader__tool"
              title="生成精美金句书签便签"
              aria-label="生成精美金句书签便签"
            >
              <Sparkles size={16} aria-hidden="true" />
              <span>雅集便签</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="club-reader__tool"
              title="排版与阅读偏好设置"
              aria-label="排版与阅读偏好设置"
            >
              <SlidersHorizontal size={16} aria-hidden="true" />
              <span>排版设置</span>
            </button>
            <a
              href="#comments-section"
              className="club-reader__tool"
              title="跳转至文友题跋评注"
              aria-label={`跳转至文友题跋评注，共 ${comments?.length ?? article.commentsCount} 条`}
            >
              <MessageSquare size={16} aria-hidden="true" />
              <span className="club-reader__comment-count">
                {comments?.length ?? article.commentsCount}
              </span>
            </a>
          </div>
        </nav>

        <ArticleHeader
          article={article}
          onMakeCard={() => handleOpenQuoteWithText(article.goldenQuote || '')}
        />

        <article
          ref={articleRef}
          className={`club-reader__body ${fontClass} ${fontSizeClass} ${lineHeightClass}`}
        >
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              onDoubleClick={(e) => {
                e.preventDefault();
                handleOpenQuoteWithText(para);
              }}
              title="双击段落或划选文字即可一键制作「雅集便签」"
            >
              {para}
            </p>
          ))}
        </article>

        <div className="club-reader__colophon">
          <span className="club-reader__end-mark" aria-hidden="true">
            终
          </span>
          <p className="club-reader__signature">
            <span>{article.author}</span> 落笔于此，期待与你相逢。
          </p>
          <div className="club-reader__actions">
            <button
              onClick={handleLike}
              aria-pressed={hasLiked}
              className={`club-reader__action ${hasLiked ? 'is-liked' : ''}`}
            >
              <Heart size={16} className={hasLiked ? 'fill-current' : ''} aria-hidden="true" />
              <span>{hasLiked ? '与君共鸣' : '投递心念'}</span>
              <span className="club-reader__action-count">{article.likes}</span>
            </button>
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="club-reader__action"
            >
              <Sparkles size={15} aria-hidden="true" />
              <span>雅集纸签</span>
            </button>
          </div>
          {likeError && (
            <p role="alert" className="club-reader__error">
              {likeError}
            </p>
          )}
        </div>

        {article.seriesTitle && seriesArticles.length > 1 && (
          <section className="club-reader__series" aria-label={`专栏文集：${article.seriesTitle}`}>
            <div className="club-reader__series-heading">
              <div>
                <span className="club-reader__section-label">专栏文集</span>
                <h2>{article.seriesTitle}</h2>
              </div>
              <span>共 {seriesArticles.length} 卷</span>
            </div>
            <div className="club-reader__series-list">
              {seriesArticles.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectArticle(item)}
                  aria-current={item.id === article.id ? 'page' : undefined}
                  className="club-reader__series-item"
                >
                  <span className="club-reader__series-number">
                    {String(item.seriesOrder || 1).padStart(2, '0')}
                  </span>
                  <span className="club-reader__series-title">
                    <TitleText text={item.title} />
                  </span>
                  {item.id === article.id ? (
                    <span className="club-reader__current">正在读</span>
                  ) : (
                    <ChevronRight size={14} aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>
          </section>
        )}

        <nav aria-label="前后续篇导航" className="club-reader__pagination">
          {prevArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(prevArticle)}
              className="club-reader__adjacent"
            >
              <span className="club-reader__adjacent-label">
                <ChevronLeft size={14} aria-hidden="true" /> 翻阅前篇
              </span>
              <span className="club-reader__adjacent-title">
                <TitleText text={prevArticle.title} />
              </span>
              <span className="club-reader__adjacent-author">{prevArticle.author}</span>
            </button>
          ) : (
            <div className="club-reader__adjacent club-reader__adjacent--empty">已是卷首第一篇</div>
          )}
          {nextArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(nextArticle)}
              className="club-reader__adjacent club-reader__adjacent--next"
            >
              <span className="club-reader__adjacent-label">
                翻阅续篇 <ChevronRight size={14} aria-hidden="true" />
              </span>
              <span className="club-reader__adjacent-title">
                <TitleText text={nextArticle.title} />
              </span>
              <span className="club-reader__adjacent-author">{nextArticle.author}</span>
            </button>
          ) : (
            <div className="club-reader__adjacent club-reader__adjacent--empty">已是卷末最新篇</div>
          )}
        </nav>

        <div id="comments-section" className="club-reader__comments">
          <CommentSection
            comments={comments}
            failed={commentsFailed}
            onRetry={onRetryComments}
            onAddComment={(author, content, replyToId, replyToAuthor) =>
              onAddComment(article.id, author, content, replyToId, replyToAuthor)
            }
            onLikeComment={onLikeComment}
          />
        </div>
      </div>

      {/* 排版与阅读偏好侧边抽屉 */}
      <ReaderSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        preferences={preferences}
        onChange={onPreferencesChange}
        onReset={onResetPreferences}
      />

      {/* 雅集金句纸签弹窗 */}
      {isQuoteCardOpen && (
        <QuoteCardModal
          key={selectedQuoteText}
          isOpen={isQuoteCardOpen}
          onClose={() => setIsQuoteCardOpen(false)}
          articleTitle={article.title}
          author={article.author}
          authorSeal={article.authorSeal}
          initialQuote={selectedQuoteText}
          topicName={article.topicName}
        />
      )}

      {/* 划词摘录气泡 */}
      {selectionBubble && (
        <div
          className="fixed z-50 animate-fade-in pointer-events-auto"
          style={{ left: `${selectionBubble.x}px`, top: `${selectionBubble.y}px` }}
        >
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              handleOpenQuoteWithText(selectionBubble.text);
              setSelectionBubble(null);
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--ochre)] text-[var(--paper)] text-xs font-serif shadow-lg hover:bg-[var(--ochre-deep)] active:scale-95 transition-all cursor-pointer select-none"
            title="将选中文字制作成雅集纸签"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>摘录便签</span>
          </button>
        </div>
      )}

      {/* 断点续读提示条 */}
      {showResume && resumeData && (
        <div className="fixed bottom-6 left-4 right-4 sm:left-auto sm:right-6 z-40 flex items-center justify-between sm:justify-start gap-3 bg-[var(--paper-deep)] border border-[var(--line)] shadow-xl px-4 py-2.5 rounded-lg text-xs font-serif text-[var(--ink)] animate-fade-in backdrop-blur-sm">
          <span>
            上次读到{' '}
            <strong className="text-[var(--ochre)] italic font-semibold">{resumeData.pct}%</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                window.scrollTo({
                  top: resumeData.y,
                  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
                    ? 'auto'
                    : 'smooth',
                });
                setShowResume(false);
              }}
              className="px-2.5 py-1 rounded bg-[var(--ochre)] text-[var(--paper)] text-xs font-serif font-medium hover:bg-[var(--ochre-deep)] transition-colors cursor-pointer"
            >
              继续阅读
            </button>
            <button
              onClick={() => setShowResume(false)}
              className="text-[var(--ink-faint)] hover:text-[var(--ink)] p-1 text-sm leading-none cursor-pointer"
              aria-label="关闭提示"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
