import { BookOpen, Sparkles } from 'lucide-react';
import type { ArticleSummary } from '../types';
import SealStamp from './SealStamp';
import TitleText from './TitleText';

interface ArticleHeaderProps {
  article: ArticleSummary;
  /** Absent while the text is still loading; the button keeps its place but is disabled. */
  onMakeCard?: () => void;
}

/** Title block shared by the reader and its loading skeleton, so nothing moves when text arrives. */
export default function ArticleHeader({ article, onMakeCard }: ArticleHeaderProps) {
  const authorSeal = article.authorSeal || (article.author ? article.author.slice(0, 2) : '文友');
  return (
    <>
      <header className="club-reader__header">
        <div className="club-reader__eyebrow">
          <span className="club-reader__topic">{article.topicName}</span>
          {article.seriesTitle && (
            <span className="club-reader__series-label">
              <BookOpen size={13} aria-hidden="true" />
              {article.seriesTitle}
              {article.seriesOrder ? ` · 卷 ${article.seriesOrder}` : ''}
            </span>
          )}
          {article.featured && <span className="club-reader__featured">卷首精选</span>}
        </div>
        <h1 className="club-reader__title">
          <TitleText text={article.title} />
        </h1>
        <div className="club-reader__metadata">
          <div className="club-reader__byline">
            <SealStamp text={authorSeal} type="yang" size="sm" tilt={false} />
            <span className="club-reader__author">{article.author}</span>
            <span className="club-reader__meta-divider" aria-hidden="true">
              /
            </span>
            <time dateTime={article.pubDate}>{article.pubDate}</time>
          </div>
          <div className="club-reader__reading-time">
            <span>{article.wordCount.toLocaleString('zh-CN')} 字</span>
            <span aria-hidden="true">·</span>
            <span>慢读 {article.readingTime} 分钟</span>
          </div>
        </div>
      </header>

      {article.goldenQuote && (
        <aside className="club-reader__quote" aria-label="篇中摘句">
          <span className="club-reader__quote-label">篇中摘句</span>
          <blockquote>{article.goldenQuote}</blockquote>
          <button onClick={onMakeCard} disabled={!onMakeCard} className="club-reader__quote-action">
            <Sparkles size={13} aria-hidden="true" />
            制作纸签
          </button>
        </aside>
      )}
    </>
  );
}
