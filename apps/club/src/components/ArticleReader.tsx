import { useState } from 'react';
import {
  SlidersHorizontal,
  Sparkles,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  MessageSquare,
} from 'lucide-react';
import type { Article, Comment, ReaderPreferences } from '../types';
import CommentSection from './CommentSection';
import ReadingProgressBar from './ReadingProgressBar';
import ReaderSettingsDrawer from './ReaderSettingsDrawer';
import QuoteCardModal from './QuoteCardModal';

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
  onAddComment: (articleId: string, author: string, content: string) => Promise<void>;
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

  const handleLike = async () => {
    if (!hasLiked) {
      try {
        await onLikeArticle(article.id);
        setHasLiked(true);
        setLikeError('');
      } catch {
        setLikeError('点赞失败，请稍后重试');
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
    compact: 'leading-[1.8]',
    normal: 'leading-[2.1]',
    relaxed: 'leading-[2.4]',
  }[preferences.lineHeight];

  // Convert raw content paragraphs to clean array
  const paragraphs = article.content.split('\n\n').filter((p) => p.trim());

  const handleOpenQuoteWithText = (text: string) => {
    setSelectedQuoteText(text);
    setIsQuoteCardOpen(true);
  };

  return (
    <div
      className={`club-reader-theme-${preferences.theme} min-h-screen bg-[var(--paper)] text-[var(--ink)] transition-colors duration-300`}
    >
      {/* Top Reading Progress Bar */}
      <ReadingProgressBar />

      <div className="max-w-[740px] mx-auto px-6 py-8 md:py-12 animate-fade-in">
        {/* Top Control Bar - Minimalist Ghost Actions */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-3 border-b border-[var(--line)]/40">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span>返回雅集列表</span>
          </button>

          {/* Reader action icons - Refined Ghost Buttons */}
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-serif rounded text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/50 transition-colors cursor-pointer"
              title="生成精美金句书签便签"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">雅集便签</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-serif rounded text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/50 transition-colors cursor-pointer"
              title="排版与阅读偏好设置"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">排版设置</span>
            </button>

            <a
              href="#comments-section"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded text-[var(--ink-faint)] hover:text-[var(--ochre)] hover:bg-[var(--paper-deep)]/50 no-underline transition-colors"
              title="跳转至文友评注"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="text-[11px] font-sans">{comments.length}</span>
            </a>
          </div>
        </div>

        {/* Article Header - Harmonious Breadcrumb Line & Breathing Title */}
        <header className="mb-8">
          {/* Metadata line without bulky candy-bar badges */}
          <div className="flex items-center gap-2 mb-3.5 flex-wrap text-xs font-serif">
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
              <span className="text-[10px] font-serif px-1.5 py-0.2 rounded border border-[var(--cinnabar)]/40 text-[var(--cinnabar)] font-medium">
                卷首精选
              </span>
            )}
          </div>

          <h1 className="font-serif font-medium text-2xl sm:text-3xl md:text-4xl text-inherit leading-[1.3] mb-5 tracking-wide">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-serif text-[var(--ink-faint)] pb-5 border-b border-[var(--line)]/40">
            <div className="flex items-center gap-2.5">
              <span className="font-medium text-[var(--ink-soft)]">{article.author}</span>
              {article.authorSeal && (
                <span className="text-[9px] px-1 py-0.2 rounded border border-[var(--cinnabar)]/60 text-[var(--cinnabar)] font-serif leading-none">
                  {article.authorSeal}
                </span>
              )}
              <span className="opacity-30">·</span>
              <time className="italic opacity-80">{article.pubDate}</time>
            </div>

            <div className="flex items-center gap-2.5 opacity-80">
              <span>{article.wordCount} 字</span>
              <span className="opacity-30">·</span>
              <span>慢读约 {article.readingTime} 分钟</span>
            </div>
          </div>
        </header>

        {/* Golden Quote Epigraph if present - Literary Book Epigraph Style */}
        {article.goldenQuote && (
          <div className="my-8 px-5 py-4 rounded bg-[color-mix(in_srgb,var(--paper-deep)_35%,var(--paper))] border-l-2 border-[var(--ochre)]/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 font-serif">
            <div className="flex items-start gap-1.5">
              <span className="text-lg text-[var(--ochre)] leading-none select-none mt-0.5">“</span>
              <p className="text-xs sm:text-sm font-serif italic text-[var(--ink-soft)] leading-relaxed">
                {article.goldenQuote}
              </p>
              <span className="text-lg text-[var(--ochre)] leading-none select-none mt-0.5">”</span>
            </div>
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || '')}
              className="text-xs font-serif text-[var(--ochre)] hover:underline whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 self-end sm:self-center opacity-85 hover:opacity-100"
            >
              <Sparkles className="w-3 h-3" />
              <span>做成便签</span>
            </button>
          </div>
        )}

        {/* Article Body Content */}
        <article
          className={`prose max-w-none text-inherit ${fontClass} ${fontSizeClass} ${lineHeightClass} tracking-wide mb-14 transition-all duration-200`}
        >
          {paragraphs.map((para, idx) => (
            <p
              key={idx}
              className="mb-6 text-justify indent-8 font-light select-text"
              onDoubleClick={() => handleOpenQuoteWithText(para)}
              title="双击段落可直接生成雅集便签"
            >
              {para}
            </p>
          ))}
        </article>

        {/* Colophon & Like Section - Centered Classical Seal Colophon */}
        <div className="my-14 flex flex-col items-center justify-center text-center">
          <div className="flex items-center justify-center gap-3 w-full max-w-xs mb-3">
            <div className="flex-1 h-[1px] bg-gradient-to-r from-transparent to-[var(--line)] opacity-60"></div>
            <div className="w-10 h-10 rounded border border-[var(--cinnabar)]/70 flex items-center justify-center text-xs font-serif text-[var(--cinnabar)] shadow-2xs bg-[color-mix(in_srgb,var(--cinnabar)_4%,transparent)] select-none">
              {article.authorSeal || '文友'}
            </div>
            <div className="flex-1 h-[1px] bg-gradient-to-l from-transparent to-[var(--line)] opacity-60"></div>
          </div>

          <div className="text-xs font-serif text-[var(--ink-faint)] mb-5">
            <span className="text-[var(--ink-soft)] font-medium mr-1.5">{article.author}</span>
            <span className="italic">· 题跋落款 · 字里相逢，行间留白</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--line)]/70 hover:border-[var(--ochre)] text-xs font-serif transition-all cursor-pointer bg-transparent text-[var(--ink-soft)] hover:text-[var(--ochre)]"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span>雅集便签</span>
            </button>

            <button
              onClick={handleLike}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full border transition-all cursor-pointer active:scale-95 text-xs font-medium ${
                hasLiked
                  ? 'bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] border-[var(--cinnabar)] text-[var(--cinnabar)]'
                  : 'bg-transparent border-[var(--line)]/70 opacity-80 hover:opacity-100 hover:border-[var(--cinnabar)] hover:text-[var(--cinnabar)]'
              }`}
            >
              <Heart
                className={`w-3.5 h-3.5 ${hasLiked ? 'fill-current text-[var(--cinnabar)]' : ''}`}
              />
              <span>{hasLiked ? '已共鸣' : '投递喜欢'}</span>
              <span className="font-serif">({article.likes})</span>
            </button>
            {likeError && (
              <span role="alert" className="text-xs text-[var(--cinnabar)]">
                {likeError}
              </span>
            )}
          </div>
        </div>

        {/* Series Notebook Navigation if article belongs to a series */}
        {article.seriesTitle && seriesArticles.length > 1 && (
          <div className="my-10 pt-6 border-t border-[var(--line)]/40 font-serif">
            <div className="flex items-center justify-between pb-3 mb-2">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--ochre)]" />
                <h4 className="font-medium text-sm text-inherit">
                  专栏文集 · 《{article.seriesTitle}》
                </h4>
              </div>
              <span className="text-xs text-[var(--ink-faint)]">
                共收录 {seriesArticles.length} 卷
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {seriesArticles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectArticle(item)}
                  className={`p-2 rounded transition-all cursor-pointer flex items-center justify-between text-xs ${
                    item.id === article.id
                      ? 'bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] text-[var(--ochre)] font-medium border-l-2 border-[var(--ochre)]'
                      : 'hover:bg-[var(--paper-deep)]/40 opacity-75 hover:opacity-100 text-[var(--ink-soft)]'
                  }`}
                >
                  <div className="flex items-center gap-2 line-clamp-1">
                    <span className="opacity-50 shrink-0">第 {item.seriesOrder || 1} 卷</span>
                    <span className="truncate">{item.title}</span>
                  </div>
                  <span className="opacity-40 shrink-0 ml-2">{item.wordCount} 字</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next Article Navigation - Clean Editorial 2-Column Links */}
        <nav className="grid grid-cols-2 gap-6 my-10 pt-6 border-t border-[var(--line)]/40 font-serif">
          {prevArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(prevArticle)}
              className="cursor-pointer group flex flex-col items-start gap-1"
            >
              <span className="text-xs text-[var(--ochre)] italic flex items-center gap-1 group-hover:-translate-x-0.5 transition-transform">
                <ChevronLeft className="w-3 h-3" /> 上一篇篇章
              </span>
              <span className="text-xs sm:text-sm font-medium text-inherit line-clamp-1 group-hover:text-[var(--ochre)] transition-colors">
                {prevArticle.title}
              </span>
            </button>
          ) : (
            <div className="opacity-30 text-xs italic text-[var(--ink-faint)] flex items-center">
              已是第一篇
            </div>
          )}

          {nextArticle ? (
            <button
              type="button"
              onClick={() => onSelectArticle(nextArticle)}
              className="cursor-pointer group flex flex-col items-end text-right gap-1"
            >
              <span className="text-xs text-[var(--ochre)] italic flex items-center justify-end gap-1 group-hover:translate-x-0.5 transition-transform">
                下一篇篇章 <ChevronRight className="w-3 h-3" />
              </span>
              <span className="text-xs sm:text-sm font-medium text-inherit line-clamp-1 group-hover:text-[var(--ochre)] transition-colors">
                {nextArticle.title}
              </span>
            </button>
          ) : (
            <div className="opacity-30 text-xs italic text-[var(--ink-faint)] flex items-center justify-end text-right">
              已是最新篇
            </div>
          )}
        </nav>

        {/* Comments Section */}
        <div id="comments-section">
          <CommentSection
            comments={comments}
            onAddComment={(author, content) => onAddComment(article.id, author, content)}
            onLikeComment={onLikeComment}
          />
        </div>
      </div>

      {/* Reader Settings Drawer */}
      <ReaderSettingsDrawer
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        preferences={preferences}
        onChange={onPreferencesChange}
        onReset={onResetPreferences}
      />

      {/* Quote Card / Bookmark Modal */}
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
    </div>
  );
}
