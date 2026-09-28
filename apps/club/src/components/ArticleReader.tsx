import { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
  X,
} from 'lucide-react';
import type { Article, Comment, ReaderPreferences } from '../types';
import CommentSection from './CommentSection';
import ReadingProgressBar from './ReadingProgressBar';
import ReaderSettingsDrawer from './ReaderSettingsDrawer';
import QuoteCardModal from './QuoteCardModal';
import SealStamp from './SealStamp';

interface ArticleReaderProps {
  article: Article;
  allArticles: Article[];
  comments: Comment[];
  preferences: ReaderPreferences;
  onPreferencesChange: (prefs: ReaderPreferences) => void;
  onResetPreferences: () => void;
  onBack: () => void;
  onSelectArticle: (article: Article) => void;
  onLikeArticle: (articleId: string) => Promise<void>;
  onAddComment: (
    articleId: string,
    author: string,
    content: string,
    replyToId?: string,
    replyToAuthor?: string,
  ) => Promise<void>;
  onLikeComment: (commentId: string) => void;
}

export default function ArticleReader({
  article,
  allArticles,
  comments,
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
    kai: 'font-[var(--serif-kai)]',
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

  const effectiveAuthorSeal =
    article.authorSeal || (article.author ? article.author.slice(0, 2) : '文友');

  return (
    <div
      className={`club-reader-theme-${preferences.theme} min-h-screen bg-[var(--paper)] text-[var(--ink)] transition-colors duration-300`}
    >
      {/* 顶部阅读进度条 */}
      <ReadingProgressBar />

      <div className="max-w-[760px] mx-auto px-6 py-8 md:py-12 animate-fade-in">
        {/* 顶部控制栏：轻柔通透的雅致工具条 */}
        <nav
          aria-label="文章操作导航"
          className="flex items-center justify-between gap-4 mb-10 pb-3 border-b border-[var(--line)]/50"
        >
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-serif text-[var(--ink-soft)] hover:text-[var(--ochre)] transition-colors cursor-pointer group"
          >
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[var(--ochre)]" />
            <span>返回雅集广场</span>
          </button>

          {/* 阅读器辅助操作 */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/60 transition-colors cursor-pointer"
              title="生成精美金句书签便签"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">雅集便签</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/60 transition-colors cursor-pointer"
              title="排版与阅读偏好设置"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">排版设置</span>
            </button>

            <a
              href="#comments-section"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-serif rounded text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/60 no-underline transition-colors"
              title="跳转至文友题跋评注"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="font-sans text-xs">{comments.length}</span>
            </a>
          </div>
        </nav>

        {/* 文章刊头：东方装帧古典卷册感 */}
        <header className="mb-10 text-left">
          {/* 专题分类与专栏微标 */}
          <div className="flex items-center gap-2 mb-4 flex-wrap text-xs font-serif">
            <span className="text-[var(--ochre)] font-medium tracking-wide">
              「{article.topicName}」
            </span>

            {article.seriesTitle && (
              <>
                <span className="opacity-30 text-[var(--ink-faint)]">/</span>
                <span className="text-[var(--ink-soft)] flex items-center gap-1 font-normal">
                  <BookOpen className="w-3 h-3 text-[var(--bamboo)]" />
                  <span>
                    《{article.seriesTitle}》
                    {article.seriesOrder ? ` · 卷${article.seriesOrder}` : ''}
                  </span>
                </span>
              </>
            )}

            {article.featured && (
              <span className="text-[10px] font-serif px-1.5 py-0.2 rounded border border-[var(--cinnabar)]/50 text-[var(--cinnabar)] font-medium bg-[color-mix(in_srgb,var(--cinnabar)_4%,transparent)]">
                卷首精选
              </span>
            )}
          </div>

          {/* 篇章大标题 */}
          <h1 className="font-serif font-semibold text-2xl sm:text-3xl md:text-4xl text-[var(--ink)] leading-[1.35] mb-6 tracking-wide text-inherit">
            {article.title}
          </h1>

          {/* 著者署名、印章与篇章属性横条 */}
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-serif text-[var(--ink-faint)] pb-6 border-b border-[var(--line)]/50">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-sm text-[var(--ink)]">{article.author}</span>
              <SealStamp text={effectiveAuthorSeal} type="yang" size="xs" />
              <span className="opacity-30">·</span>
              <time className="italic opacity-80">{article.pubDate}</time>
            </div>

            <div className="flex items-center gap-3 opacity-80">
              <span>{article.wordCount} 字</span>
              <span className="opacity-30">·</span>
              <span>预计慢读 {article.readingTime} 分钟</span>
            </div>
          </div>
        </header>

        {/* 核心金句题跋签（古籍宣纸折页笺设计） */}
        {article.goldenQuote && (
          <div className="my-10 p-5 rounded-xs bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))] border-l-[3px] border-[var(--ochre)] flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-serif shadow-[0_1px_6px_rgba(0,0,0,0.02)]">
            <div className="flex items-start gap-2.5">
              <span className="text-xl text-[var(--ochre)] leading-none select-none font-serif mt-0.5">
                “
              </span>
              <blockquote className="text-xs sm:text-sm font-serif italic text-[var(--ink)] leading-relaxed font-normal">
                {article.goldenQuote}
              </blockquote>
              <span className="text-xl text-[var(--ochre)] leading-none select-none font-serif mt-0.5">
                ”
              </span>
            </div>
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || '')}
              className="text-xs font-serif text-[var(--ochre)] hover:underline whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-center opacity-90 hover:opacity-100"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>制作纸签</span>
            </button>
          </div>
        )}

        {/* 正文篇章内容 */}
        <article
          ref={articleRef}
          className={`prose max-w-none text-inherit ${fontClass} ${fontSizeClass} ${lineHeightClass} tracking-wide mb-16 transition-all duration-200`}
        >
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className="mb-7 text-justify indent-8 font-light select-text"
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

        {/* 卷末著者题跋与心念共鸣印鉴 (Colophon & Resonance) */}
        <div className="my-16 py-8 px-6 rounded border border-[var(--line)]/50 bg-[color-mix(in_srgb,var(--paper-deep)_20%,var(--paper))] flex flex-col items-center justify-center text-center">
          {/* 朱砂落款大印 */}
          <div className="mb-3">
            <SealStamp
              text={effectiveAuthorSeal}
              type="yang"
              size="lg"
              title={`著者落款印鉴：${effectiveAuthorSeal}`}
            />
          </div>

          <div className="text-xs font-serif text-[var(--ink-faint)] mb-6">
            <span className="text-[var(--ink)] font-medium mr-1.5">{article.author}</span>
            <span className="italic">题跋落款 · 字里相逢，行间留白</span>
          </div>

          {/* 交互按钮：投递喜欢与生成便签 */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-5 py-2 rounded-full border transition-all cursor-pointer active:scale-95 text-xs font-medium ${
                hasLiked
                  ? 'bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] border-[var(--cinnabar)] text-[var(--cinnabar)] shadow-xs'
                  : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--cinnabar)] hover:text-[var(--cinnabar)] shadow-2xs'
              }`}
            >
              <Heart
                className={`w-4 h-4 transition-transform ${
                  hasLiked ? 'fill-current text-[var(--cinnabar)] scale-110' : ''
                }`}
              />
              <span>{hasLiked ? '与君共鸣' : '投递心念'}</span>
              <span className="font-serif">({article.likes})</span>
            </button>

            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full border border-[var(--line)] hover:border-[var(--ochre)] text-xs font-serif transition-all cursor-pointer bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] shadow-2xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span>雅集纸签</span>
            </button>
          </div>

          {likeError && (
            <span role="alert" className="mt-2 text-xs text-[var(--cinnabar)] font-serif">
              {likeError}
            </span>
          )}
        </div>

        {/* 专栏连载卷册导读（线装书目录质感） */}
        {article.seriesTitle && seriesArticles.length > 1 && (
          <div className="my-12 p-6 rounded border border-[var(--line)]/60 bg-[var(--paper)] font-serif shadow-[0_1px_8px_rgba(0,0,0,0.02)]">
            <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-[var(--line)]/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--ochre)]" />
                <h4 className="font-medium text-sm text-[var(--ink)]">
                  专栏文集 · 《{article.seriesTitle}》
                </h4>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                共成册 {seriesArticles.length} 卷
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {seriesArticles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectArticle(item)}
                  className={`p-2.5 rounded transition-all cursor-pointer flex items-center justify-between text-xs ${
                    item.id === article.id
                      ? 'bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] text-[var(--ochre)] font-semibold border-l-2 border-[var(--ochre)] shadow-2xs'
                      : 'hover:bg-[var(--paper-deep)]/50 text-[var(--ink-soft)] hover:text-[var(--ink)] border-l-2 border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="opacity-50 shrink-0 text-[11px]">
                      第 {item.seriesOrder || 1} 卷
                    </span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="opacity-40 shrink-0 ml-2 text-[10px] font-mono">
                    {item.wordCount}字
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 翻卷前后篇导航卡 */}
        <nav
          aria-label="前后续篇导航"
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-12 pt-8 border-t border-[var(--line)]/50 font-serif"
        >
          {prevArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(prevArticle)}
              className="p-4 rounded border border-[var(--line)]/60 hover:border-[var(--ochre)] bg-[var(--paper)] hover:bg-[var(--paper-deep)]/30 transition-all cursor-pointer group flex flex-col items-start text-left shadow-2xs"
            >
              <span className="text-[11px] text-[var(--ochre)] flex items-center gap-1 group-hover:-translate-x-1 transition-transform mb-1">
                <ChevronLeft className="w-3.5 h-3.5" /> 翻阅前篇
              </span>
              <span className="text-xs sm:text-sm font-medium text-[var(--ink)] line-clamp-1 group-hover:text-[var(--ochre)] transition-colors">
                {prevArticle.title}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded border border-dashed border-[var(--line)]/40 text-xs italic text-[var(--ink-faint)] flex items-center justify-center">
              已是卷首第一篇
            </div>
          )}

          {nextArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(nextArticle)}
              className="p-4 rounded border border-[var(--line)]/60 hover:border-[var(--ochre)] bg-[var(--paper)] hover:bg-[var(--paper-deep)]/30 transition-all cursor-pointer group flex flex-col items-end text-right shadow-2xs"
            >
              <span className="text-[11px] text-[var(--ochre)] flex items-center justify-end gap-1 group-hover:translate-x-1 transition-transform mb-1">
                翻阅续篇 <ChevronRight className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-[var(--ink)] line-clamp-1 group-hover:text-[var(--ochre)] transition-colors">
                {nextArticle.title}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded border border-dashed border-[var(--line)]/40 text-xs italic text-[var(--ink-faint)] flex items-center justify-center text-right">
              已是卷末最新篇
            </div>
          )}
        </nav>

        {/* 文友评注与题跋回响 */}
        <div id="comments-section">
          <CommentSection
            comments={comments}
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
        onClose={() => setIsSettingsOpen(false)}
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
                window.scrollTo({ top: resumeData.y, behavior: 'smooth' });
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
