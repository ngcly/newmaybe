import { useState } from 'react';
import type { Article, Comment } from '../types';
import CommentSection from './CommentSection';

interface ArticleReaderProps {
  article: Article;
  comments: Comment[];
  onBack: () => void;
  onLikeArticle: (articleId: string) => void;
  onAddComment: (articleId: string, author: string, content: string) => void;
  onLikeComment: (commentId: string) => void;
}

export default function ArticleReader({
  article,
  comments,
  onBack,
  onLikeArticle,
  onAddComment,
  onLikeComment,
}: ArticleReaderProps) {
  const [hasLiked, setHasLiked] = useState(false);

  const handleLike = () => {
    if (!hasLiked) {
      onLikeArticle(article.id);
      setHasLiked(true);
    }
  };

  // Convert raw content paragraphs to clean JSX
  const paragraphs = article.content.split('\n\n').filter((p) => p.trim());

  return (
    <div className="max-w-[760px] mx-auto px-6 py-8 md:py-12 animate-fade-in">
      {/* Back Button */}
      <div className="mb-8">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
        >
          <span>←</span>
          <span>返回文友广场</span>
        </button>
      </div>

      {/* Article Header */}
      <header className="mb-10 pb-8 border-b border-[var(--line)]">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs font-serif px-2.5 py-0.5 rounded bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_25%,transparent)] text-[var(--ochre)]">
            {article.topicName}
          </span>
          <span className="text-xs text-[var(--ink-faint)] font-serif">· 专题收录</span>
        </div>

        <h1 className="font-serif font-bold text-2xl md:text-3xl lg:text-4xl text-[var(--ink)] leading-tight mb-6 tracking-wide">
          {article.title}
        </h1>

        <div className="flex flex-wrap items-center justify-between gap-4 text-xs font-serif text-[var(--ink-soft)]">
          <div className="flex items-center gap-3">
            <span className="font-medium text-[var(--ink)]">{article.author}</span>
            {article.authorSeal && (
              <span className="px-1.5 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[11px] font-serif">
                {article.authorSeal}
              </span>
            )}
            <span className="text-[var(--ink-faint)]">·</span>
            <time className="text-[var(--ink-faint)] italic">{article.pubDate}</time>
          </div>

          <div className="flex items-center gap-3 text-[var(--ink-faint)]">
            <span>{article.wordCount} 字</span>
            <span>·</span>
            <span>约 {article.readingTime} 分钟慢读</span>
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="prose max-w-none text-[var(--ink-soft)] font-serif text-lg leading-[2.1] tracking-wide mb-14">
        {paragraphs.map((para, idx) => (
          <p key={idx} className="mb-6 text-justify indent-8 font-light text-[var(--ink)]/90">
            {para}
          </p>
        ))}
      </article>

      {/* Colophon & Like Button */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-8 border-y border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))] px-6 rounded">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded border border-[var(--cinnabar)] flex items-center justify-center text-xs font-serif text-[var(--cinnabar)] shadow-xs">
            {article.authorSeal || '文友'}
          </div>
          <div className="text-xs font-serif">
            <div className="text-[var(--ink)] font-medium">{article.author} · 题跋</div>
            <div className="text-[var(--ink-faint)] italic">以字会友，共守留白。</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-full border transition-all cursor-pointer active:scale-95 shadow-sm text-sm font-medium ${
              hasLiked
                ? 'bg-[color-mix(in_srgb,var(--cinnabar)_12%,transparent)] border-[var(--cinnabar)] text-[var(--cinnabar)]'
                : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--cinnabar)] hover:text-[var(--cinnabar)]'
            }`}
          >
            <span>{hasLiked ? '❤️ 已共鸣' : '🤍 投递喜欢'}</span>
            <span className="font-serif">({article.likes})</span>
          </button>
        </div>
      </div>

      {/* Comments Section */}
      <CommentSection
        comments={comments}
        onAddComment={(author, content) => onAddComment(article.id, author, content)}
        onLikeComment={onLikeComment}
      />
    </div>
  );
}
