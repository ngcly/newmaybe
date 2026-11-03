import { articleHref } from '../lib/article-url';
import { ArrowUpRight, Heart, MessageSquare } from 'lucide-react';
import type { ArticleSummary } from '../types';
import SealStamp from './SealStamp';
import TitleText from './TitleText';

interface ArticleCardProps {
  article: ArticleSummary;
  /** Mark featured pieces, unless the list on screen already is the featured selection. */
  showFeaturedFlag?: boolean;
  onSelect: (article: ArticleSummary) => void;
  onSelectTopic?: (topicId: string) => void;
}

/** Four layers: who and where, the title, one excerpt, and how long and how received. */
export default function ArticleCard({
  article,
  showFeaturedFlag = false,
  onSelect,
  onSelectTopic,
}: ArticleCardProps) {
  return (
    <article className="club-article-card">
      <div className="club-article-meta">
        <div className="club-article-author">
          <span>{article.author}</span>
          {article.authorSeal && <SealStamp text={article.authorSeal} size="xs" />}
          <span aria-hidden="true">·</span>
          <time dateTime={article.pubDate}>{article.pubDate.replaceAll('-', '.')}</time>
          {showFeaturedFlag && article.featured && (
            <>
              <span aria-hidden="true">·</span>
              <span className="club-article-flag">卷首精选</span>
            </>
          )}
        </div>
        <button
          className="club-article-topic"
          onClick={() => onSelectTopic?.(article.topicId)}
          aria-label={`筛选专题：${article.topicName}`}
        >
          {article.topicName}
        </button>
      </div>
      <div className="club-article-title-row">
        <h3>
          <a
            href={articleHref(article.id)}
            onClick={(event) => {
              if (
                event.metaKey ||
                event.ctrlKey ||
                event.shiftKey ||
                event.altKey ||
                event.button !== 0
              )
                return;
              event.preventDefault();
              onSelect(article);
            }}
          >
            <TitleText text={article.title} />
          </a>
        </h3>
        <ArrowUpRight aria-hidden="true" className="club-article-arrow" />
      </div>
      {article.goldenQuote ? (
        <blockquote className="club-article-quote">{article.goldenQuote}</blockquote>
      ) : (
        <p className="club-article-summary">{article.summary}</p>
      )}
      <div className="club-article-footer">
        <div className="club-article-reading">
          {article.seriesTitle && (
            <>
              <span className="club-article-series">
                {article.seriesTitle}
                {article.seriesOrder ? ` · 卷${article.seriesOrder}` : ''}
              </span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>慢读约 {article.readingTime} 分钟</span>
        </div>
        <div className="club-article-reactions">
          <span>
            <Heart aria-hidden="true" />
            {article.likes}
            <span className="sr-only"> 次喜欢</span>
          </span>
          <span>
            <MessageSquare aria-hidden="true" />
            {article.commentsCount}
            <span className="sr-only"> 条评注</span>
          </span>
        </div>
      </div>
    </article>
  );
}
