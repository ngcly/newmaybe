import type { Article } from '../types';

interface ArticleCardProps {
  article: Article;
  onSelect: (article: Article) => void;
  onSelectTopic?: (topicId: string) => void;
}

export default function ArticleCard({ article, onSelect, onSelectTopic }: ArticleCardProps) {
  return (
    <article className="group bg-[color-mix(in_srgb,var(--paper-deep)_65%,var(--paper))] border border-[var(--line)] rounded-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[color-mix(in_srgb,var(--ochre)_35%,var(--line))] hover:shadow-md flex flex-col justify-between cursor-pointer">
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
            <span className="text-xs text-[var(--ink-faint)]">·</span>
            <span className="text-xs text-[var(--ink-soft)] font-medium">{article.author}</span>
            {article.authorSeal && (
              <span className="text-[10px] px-1 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar-text)] font-serif scale-90">
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
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 hover:text-[var(--cinnabar)] transition-colors">
            <span>❤️</span>
            <span>{article.likes}</span>
          </span>
          <span className="flex items-center gap-1 hover:text-[var(--ochre)] transition-colors">
            <span>💬</span>
            <span>{article.commentsCount}</span>
          </span>
        </div>
      </div>
    </article>
  );
}
