import { ChevronLeft } from 'lucide-react';
import type { ArticleSummary, PaperTheme } from '../types';
import ArticleHeader from './ArticleHeader';
import './reader.css';

interface ArticleReaderSkeletonProps {
  /** Known from the feed when the reader came from a card; null for a cold route change. */
  summary: ArticleSummary | null;
  theme: PaperTheme;
  onBack: () => void;
}

/** Same frame and header as ArticleReader; only the body lines are replaced when text arrives. */
export default function ArticleReaderSkeleton({
  summary,
  theme,
  onBack,
}: ArticleReaderSkeletonProps) {
  return (
    <div className={`club-reader club-reader-theme-${theme}`}>
      <div className="club-reader__page">
        <nav aria-label="文章操作导航" className="club-reader__toolbar">
          <button onClick={onBack} className="club-reader__back">
            <ChevronLeft size={16} aria-hidden="true" />
            <span>返回雅集广场</span>
          </button>
        </nav>

        {summary ? (
          <ArticleHeader article={summary} />
        ) : (
          <div className="club-reader__skeleton club-reader__skeleton--header" aria-hidden="true">
            <i />
            <i />
            <i />
          </div>
        )}

        <div className="club-reader__skeleton" role="status">
          <span className="sr-only">正在加载篇章…</span>
          {Array.from({ length: 8 }, (_, index) => (
            <i key={index} aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}
