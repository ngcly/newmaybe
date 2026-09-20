import { BookOpen, Heart, MessageSquare } from 'lucide-react';
import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
  onSelectTopic?: (topicId: string) => void;
}

export default function ArticleCard({ article, onSelect, onSelectTopic }: ArticleCardProps) {
  return (
    <article className="group bg-[var(--paper)] border border-[var(--line)]/70 hover:border-[var(--ochre)]/60 rounded p-6 sm:p-7 transition-all duration-300 hover:shadow-[0_4px_24px_-6px_rgba(43,39,34,0.07)] dark:hover:shadow-[0_4px_24px_-6px_rgba(0,0,0,0.35)] hover:-translate-y-0.5 flex flex-col justify-between cursor-pointer relative">
      <div onClick={() => onSelect(article)}>
        {/* Card Header: Topic, Author & Meta in a harmonious line */}
        <div className="flex items-center justify-between gap-3 mb-3.5 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectTopic) onSelectTopic(article.topicId);
              }}
              className="text-xs font-serif text-[var(--ochre)] hover:text-[var(--ochre-deep)] transition-colors cursor-pointer font-medium tracking-wide"
            >
              「{article.topicName}」
            </button>

            {article.seriesTitle && (
              <>
                <span className="text-xs text-[var(--ink-faint)] opacity-40">/</span>
                <span className="text-[11px] font-serif text-[var(--ink-soft)] flex items-center gap-1 font-normal">
                  <BookOpen className="w-2.5 h-2.5 text-[var(--bamboo)]" />
                  <span>
                    《{article.seriesTitle}》
                    {article.seriesOrder ? `·卷${article.seriesOrder}` : ''}
                  </span>
                </span>
              </>
            )}

            {article.featured && (
              <span className="text-[10px] font-serif px-1.5 py-0.2 rounded border border-[var(--cinnabar)]/40 text-[var(--cinnabar)] font-medium">
                卷首精选
              </span>
            )}

            <span className="text-xs text-[var(--ink-faint)] opacity-40">·</span>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[var(--ink-soft)] font-serif font-normal">
                {article.author}
              </span>
              {article.authorSeal && (
                <span className="text-[9px] px-1 py-0.2 rounded border border-[var(--cinnabar)]/50 text-[var(--cinnabar)] font-serif leading-none scale-95 inline-block">
                  {article.authorSeal}
                </span>
              )}
            </div>
          </div>

          <time className="text-xs font-serif italic text-[var(--ink-faint)] shrink-0">
            {article.pubDate}
          </time>
        </div>

        {/* Title */}
        <h3 className="font-serif font-medium text-lg sm:text-xl text-[var(--ink)] mb-3 leading-snug group-hover:text-[var(--ochre)] transition-colors tracking-wide">
          {article.title}
        </h3>

        {/* Golden quote snippet: Literary quotation style without heavy background box */}
        {article.goldenQuote && (
          <div className="mb-3.5 pl-3 border-l-2 border-[var(--ochre)]/40 py-0.5 text-xs sm:text-sm font-serif italic text-[var(--ink-soft)] flex items-start gap-1">
            <span className="text-xs font-serif text-[var(--ochre)] leading-none select-none">
              “
            </span>
            <span className="line-clamp-2 leading-relaxed opacity-90">{article.goldenQuote}</span>
            <span className="text-xs font-serif text-[var(--ochre)] leading-none select-none">
              ”
            </span>
          </div>
        )}

        {/* Summary */}
        <p className="text-xs sm:text-sm text-[var(--ink-soft)] line-clamp-2 leading-relaxed font-light mb-5 text-justify font-serif opacity-80">
          {article.summary}
        </p>
      </div>

      {/* Card Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-[var(--line)]/50 text-xs text-[var(--ink-faint)] font-serif">
        <div className="flex items-center gap-2">
          <span>{article.wordCount} 字</span>
          <span className="opacity-40">·</span>
          <span>慢读约 {article.readingTime} 分钟</span>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="flex items-center gap-1 hover:text-[var(--cinnabar-text)] transition-colors">
            <Heart className="w-3.5 h-3.5 text-[var(--cinnabar)]/70 dark:text-[#ff7a6d]" />
            <span className="text-[11px]">{article.likes}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-[var(--ochre)] transition-colors">
            <MessageSquare className="w-3.5 h-3.5 text-[var(--ochre)]/70" />
            <span className="text-[11px]">{article.commentsCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
