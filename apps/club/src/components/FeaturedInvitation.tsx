import { ArrowUpRight, ArrowRight } from 'lucide-react';
import { currentIssue, featuredHref } from '../lib/featured';

export default function FeaturedInvitation() {
  const issue = currentIssue();
  return (
    <section aria-label="一期一文" className="club-featured">
      <div className="club-featured-edition">
        <span className="club-edition-number" aria-hidden="true">
          {issue?.number || '序'}
        </span>
        <span className="club-edition-caption">
          一期一文 <span>／</span> {issue ? `第 ${issue.number} 期` : '精选特刊'}
        </span>
      </div>
      <div className="club-featured-story">
        <h2>
          <a href={issue ? featuredHref(issue.slug) : '/featured'}>
            {issue?.title || '下一篇，值得静静等待。'}
          </a>
        </h2>
        <p className="club-featured-description">
          {issue?.description || '每期一篇文字，一次独立的阅读体验。首期正在筹备。'}
        </p>
        <div className="club-featured-bottom">
          <span className="club-featured-byline">
            {issue
              ? `${issue.author} · ${issue.publishedAt.replaceAll('-', '.')}`
              : '编辑部 · 敬请期待'}
          </span>
          <a className="club-text-link" href={issue ? featuredHref(issue.slug) : '/featured'}>
            {issue ? '阅读本期' : '走进一期一文'}
            <ArrowUpRight aria-hidden="true" />
          </a>
        </div>
      </div>
      <a href="/featured/archive" className="club-featured-archive">
        <span>往期目录</span>
        <ArrowRight aria-hidden="true" />
      </a>
    </section>
  );
}
