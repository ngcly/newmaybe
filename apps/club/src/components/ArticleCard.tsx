import { BookOpen, Heart, MessageSquare, Sparkles } from 'lucide-react';
import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
  onSelectTopic?: (topicId: string) => void;
}

export default function ArticleCard({ article, onSelect, onSelectTopic }: ArticleCardProps) {
  return (
    <article className="group bg-[color-mix(in_srgb,var(--paper-deep)_65%,var(--paper))] border border-[var(--line)] rounded-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--ochre)_40%,var(--line))] hover:shadow-md flex flex-col justify-between cursor-pointer">
      <div onClick={() => onSelect(article)}>
        {/* Card Header: Topic & Author Meta */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTopic) onSelectTopic(article.topicId);
              }}
              className="text-xs font-serif px-2 py-0.5 rounded bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_20%,transparent)] text-[var(--ochre)] hover:border-[var(--ochre)] transition-colors cursor-pointer"
            >
              {article.topicName}
            </button>

            {article.seriesTitle && (
              <span className="text-[11px] font-serif px-1.5 py-0.2 rounded bg-[color-mix(in_srgb,var(--bamboo)_12%,transparent)] border border-[color-mix(in_srgb,var(--bamboo)_25%,transparent)] text-emerald-800 dark:text-emerald-300 flex items-center gap-1 font-medium">
                <BookOpen className="w-2.5 h-2.5" />
                <span>
                  {article.seriesTitle}
                  {article.seriesOrder ? `·卷${article.seriesOrder}` : ''}
                </span>
              </span>
            )}

            {article.featured && (
              <span className="text-[10px] font-serif px-1.5 py-0.2 rounded bg-[var(--cinnabar-text)] text-[var(--paper)] font-medium">
                精选
              </span>
            )}

            <span className="text-xs text-[var(--ink-faint)]">·</span>
            <span className="text-xs text-[var(--ink-soft)] font-medium font-serif">
              {article.author}
            </span>
            {article.authorSeal && (
              <span className="text-[10px] px-1 py-0.2 rounded border border-[var(--cinnabar-text)] dark:border-[#ff7a6d] text-[var(--cinnabar-text)] dark:text-[#ff7a6d] font-serif scale-90">
                {article.authorSeal}
              </span>
            )}
          </div>
          <time className="text-xs font-serif italic text-[var(--ink-faint)]">
            {article.pubDate}
          </time>
        </div>

        {/* Title */}
        <h3 className="font-serif font-semibold text-lg md:text-xl text-[var(--ink)] mb-2.5 leading-snug group-hover:text-[var(--ochre)] transition-colors">
          {article.title}
        </h3>

        {/* Golden quote preview snippet if available */}
        {article.goldenQuote && (
          <div className="mb-3 px-3 py-1.5 rounded-xs border-l-2 border-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_6%,transparent)] text-xs font-serif italic text-[var(--ink-soft)] flex items-start gap-1.5">
            <Sparkles className="w-3 h-3 text-[var(--ochre)] shrink-0 mt-0.5" />
            <span className="line-clamp-1">“{article.goldenQuote}”</span>
          </div>
        )}

        {/* Summary */}
        <p className="text-sm text-[var(--ink-soft)] line-clamp-2 leading-relaxed font-light mb-4 text-justify">
          {article.summary}
        </p>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-dashed border-[var(--line)] text-xs text-[var(--ink-faint)]">
        <div className="flex items-center gap-2 font-serif">
          <span>{article.wordCount} 字</span>
          <span>·</span>
          <span>约 {article.readingTime} 分钟阅读</span>
        </div>
        <div className="flex items-center gap-3 font-serif">
          <span className="flex items-center gap-1 hover:text-[var(--cinnabar-text)] transition-colors">
            <Heart className="w-3.5 h-3.5 text-[var(--cinnabar-text)] dark:text-[#ff7a6d]" />
            <span>{article.likes}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-[var(--ochre)] transition-colors">
            <MessageSquare className="w-3.5 h-3.5 text-[var(--ochre)]/80" />
            <span>{article.commentsCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
