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
  const themeContainerClasses = {
    paper: 'bg-[var(--paper)] text-[var(--ink)]',
    parchment: 'bg-[#f4ecd8] text-[#3b3226] dark:bg-[#28231c] dark:text-[#dfd5c5]',
    bamboo: 'bg-[#edf3ea] text-[#253227] dark:bg-[#1c241e] dark:text-[#d0ded0]',
    ink: 'bg-[#181716] text-[#c8c3bc]',
  }[preferences.theme];

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
    <div className={`min-h-screen transition-colors duration-300 ${themeContainerClasses}`}>
      {/* Top Reading Progress Bar */}
      <ReadingProgressBar />

      <div className="max-w-[780px] mx-auto px-6 py-8 md:py-12 animate-fade-in">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-4 mb-8 pb-4 border-b border-[var(--line)]">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
          >
            <span>←</span>
            <span>返回雅集列表</span>
          </button>

          {/* Reader action icons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-serif rounded border border-[var(--line)] hover:border-[var(--ochre)] text-[var(--ink-soft)] hover:text-[var(--ochre)] transition-all cursor-pointer bg-[color-mix(in_srgb,var(--paper-deep)_50%,transparent)] shadow-xs"
              title="生成精美金句书签便签"
            >
              <Sparkles className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">雅集便签</span>
            </button>

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="inline-flex items-center gap-1 px-3 py-1 text-xs font-serif rounded border border-[var(--line)] hover:border-[var(--ochre)] text-[var(--ink-soft)] hover:text-[var(--ochre)] transition-all cursor-pointer bg-[color-mix(in_srgb,var(--paper-deep)_50%,transparent)] shadow-xs"
              title="排版与阅读偏好设置"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-[var(--ochre)]" />
              <span className="hidden sm:inline">排版设置</span>
            </button>

            <a
              href="#comments-section"
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded border border-[var(--line)] text-[var(--ink-faint)] hover:text-[var(--ink)] no-underline transition-colors"
              title="跳转至文友评注"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{comments.length}</span>
            </a>
          </div>
        </div>

        {/* Article Header */}
        <header className="mb-10 pb-8 border-b border-[var(--line)]">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <span className="text-xs font-serif px-2.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_25%,transparent)] text-[var(--ochre)]">
              {article.topicName}
            </span>
            {article.seriesTitle && (
              <span className="text-xs font-serif px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--bamboo)_15%,transparent)] border border-[color-mix(in_srgb,var(--bamboo)_30%,transparent)] text-emerald-800 dark:text-emerald-300 flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                <span>
                  连载 · 《{article.seriesTitle}》
                  {article.seriesOrder ? ` 第 ${article.seriesOrder} 卷` : ''}
                </span>
              </span>
            )}
            {article.featured && (
              <span className="text-xs font-serif px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] border border-[color-mix(in_srgb,var(--cinnabar)_25%,transparent)] text-[var(--cinnabar)]">
                卷首精选
              </span>
            )}
          </div>

          <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-inherit leading-tight mb-6 tracking-wide">
            {article.title}
          </h1>

          <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-serif opacity-80">
            <div className="flex items-center gap-3">
              <span className="font-medium text-inherit">{article.author}</span>
              {article.authorSeal && (
                <span className="px-1.5 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[11px] font-serif">
                  {article.authorSeal}
                </span>
              )}
              <span className="opacity-40">·</span>
              <time className="italic opacity-80">{article.pubDate}</time>
            </div>

            <div className="flex items-center gap-3 opacity-75">
              <span>{article.wordCount} 字</span>
              <span>·</span>
              <span>约 {article.readingTime} 分钟慢读</span>
            </div>
          </div>
        </header>

        {/* Golden Quote Epigraph if present */}
        {article.goldenQuote && (
          <div className="mb-12 py-3.5 pl-4 pr-5 border-l-2 border-[var(--ochre)]/50 bg-[color-mix(in_srgb,var(--ochre)_3%,transparent)] rounded-r flex items-start justify-between gap-4">
            <div className="flex items-start gap-2">
              <span className="text-xl text-[var(--ochre)] font-serif leading-none select-none">
                “
              </span>
              <p className="text-sm font-serif italic text-inherit leading-relaxed opacity-90">
                {article.goldenQuote}
              </p>
            </div>
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || '')}
              className="text-xs font-serif text-[var(--ochre)] hover:underline whitespace-nowrap cursor-pointer flex items-center gap-1 shrink-0 mt-0.5"
            >
              <Sparkles className="w-3 h-3" />
              <span>做成书签</span>
            </button>
          </div>
        )}

        {/* Article Body Content */}
        <article
          className={`prose max-w-none text-inherit ${fontClass} ${fontSizeClass} ${lineHeightClass} tracking-wide mb-16 transition-all duration-200`}
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

        {/* Colophon & Like Section - Pure Book Colophon without heavy grey fill */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-7 border-y border-[var(--line)]/60 my-12">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded border border-[var(--cinnabar)]/70 flex items-center justify-center text-xs font-serif text-[var(--cinnabar)] shadow-2xs bg-[color-mix(in_srgb,var(--cinnabar)_4%,transparent)]">
              {article.authorSeal || '文友'}
            </div>
            <div className="text-xs font-serif">
              <div className="font-medium text-inherit text-sm mb-0.5">
                {article.author} · 题跋落款
              </div>
              <div className="opacity-60 italic text-[11px]">字里相逢，行间留白，共护文雅。</div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleOpenQuoteWithText(article.goldenQuote || article.summary)}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-[var(--line)]/70 hover:border-[var(--ochre)] text-xs font-serif transition-all cursor-pointer bg-transparent text-inherit"
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
          <div className="mb-12 p-5 rounded border border-[var(--line)]/60 bg-[var(--paper)]">
            <div className="flex items-center justify-between pb-3 mb-3 border-b border-[var(--line)]/50">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--ochre)]" />
                <h4 className="font-serif font-medium text-sm text-inherit">
                  专栏文集 · 《{article.seriesTitle}》
                </h4>
              </div>
              <span className="text-xs font-serif opacity-50">
                共收录 {seriesArticles.length} 卷
              </span>
            </div>
            <div className="space-y-1.5">
              {seriesArticles.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onSelectArticle(item)}
                  className={`p-2.5 rounded transition-all cursor-pointer flex items-center justify-between text-xs font-serif ${
                    item.id === article.id
                      ? 'bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] text-[var(--ochre)] font-medium border-l-2 border-[var(--ochre)]'
                      : 'hover:bg-[var(--paper-deep)]/50 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="opacity-50">第 {item.seriesOrder || 1} 卷</span>
                    <span>{item.title}</span>
                  </div>
                  <span className="opacity-40">{item.wordCount} 字</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Prev / Next Article Navigation Bar */}
        <nav className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-14">
          {prevArticle ? (
            <button
              onClick={() => onSelectArticle(prevArticle)}
              className="p-4 rounded border border-[var(--line)] hover:border-[var(--ochre)] bg-[color-mix(in_srgb,var(--paper-deep)_40%,transparent)] text-left transition-all cursor-pointer group flex flex-col justify-between gap-1 shadow-xs"
            >
              <span className="text-[11px] font-serif opacity-60 flex items-center gap-1 group-hover:text-[var(--ochre)]">
                <ChevronLeft className="w-3 h-3" /> 上一篇篇章
              </span>
              <span className="text-sm font-serif font-medium text-inherit line-clamp-1 group-hover:text-[var(--ochre)]">
                {prevArticle.title}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded border border-dashed border-[var(--line)] text-left opacity-40 text-xs font-serif flex items-center">
              已是第一篇
            </div>
          )}

          {nextArticle ? (
            <button
              onClick={() => onSelectArticle(nextArticle)}
              className="p-4 rounded border border-[var(--line)] hover:border-[var(--ochre)] bg-[color-mix(in_srgb,var(--paper-deep)_40%,transparent)] text-right transition-all cursor-pointer group flex flex-col justify-between gap-1 shadow-xs"
            >
              <span className="text-[11px] font-serif opacity-60 flex items-center justify-end gap-1 group-hover:text-[var(--ochre)]">
                下一篇篇章 <ChevronRight className="w-3 h-3" />
              </span>
              <span className="text-sm font-serif font-medium text-inherit line-clamp-1 group-hover:text-[var(--ochre)]">
                {nextArticle.title}
              </span>
            </button>
          ) : (
            <div className="p-4 rounded border border-dashed border-[var(--line)] text-right opacity-40 text-xs font-serif flex items-center justify-end">
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
