import { useClubFeed } from './hooks/useClubFeed';
import { usePageMetadata } from './hooks/usePageMetadata';
import { useArticleRoute } from './hooks/useArticleRoute';
import { useState, useEffect, useRef } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import {
  Sparkles,
  Clock,
  BookOpen,
  ArrowUpRight,
  ArrowRight,
  Feather,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import type { Article, ArticleSummary, Comment, ReaderPreferences, FeedFilter } from './types';
import { TOPICS } from './data/topics';
import { ClubAPI, getCachedComments } from './lib/api';
import { initialArticle } from './lib/initial-article';
import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import TopicCard from './components/TopicCard';
import ArticleReader from './components/ArticleReader';
import ArticleReaderSkeleton from './components/ArticleReaderSkeleton';
import FeaturedInvitation from './components/FeaturedInvitation';
import './club.css';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

const STORAGE_PREFS_KEY = 'newmaybe_club_reader_prefs';
const SIDEBAR_SERIES = 4;

/** Scroll an element up to just below the sticky header, unless it already sits near the top. */
function revealUnderNav(element: Element) {
  const navBottom = document.querySelector('.club-nav')?.getBoundingClientRect().bottom ?? 0;
  const top = element.getBoundingClientRect().top;
  const visible = window.visualViewport?.height ?? window.innerHeight;
  if (top >= navBottom && top <= navBottom + visible * 0.25) return;
  window.scrollTo({
    top: window.scrollY + top - navBottom - 16,
    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
  });
}

const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'paper',
  font: 'song',
  fontSize: 'md',
  lineHeight: 'normal',
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<'plaza' | 'topics'>('plaza');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const { articleId: activeArticleId, invalidPath, navigate, path } = useArticleRoute();
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(() =>
    initialArticle(activeArticleId),
  );
  // Bodies read in this session render at once on back/forward or a re-opened card (so the
  // browser can restore the scroll position) while the fresh copy loads; a 404 still removes them.
  const [readArticles, setReadArticles] = useState<Record<string, Article>>(() =>
    selectedArticle ? { [selectedArticle.id]: selectedArticle } : {},
  );
  const [articleLoading, setArticleLoading] = useState(Boolean(activeArticleId));
  // The route whose last request failed for a reason other than 404: keep its text, offer a retry.
  const [failedRoute, setFailedRoute] = useState<string | null>(null);
  // A route change is loading from its first render, so the 404 state never paints in between.
  const [loadingRoute, setLoadingRoute] = useState(activeArticleId);
  if (loadingRoute !== activeArticleId) {
    setLoadingRoute(activeArticleId);
    setArticleLoading(Boolean(activeArticleId));
    const read = activeArticleId ? readArticles[activeArticleId] : undefined;
    if (read && selectedArticle?.id !== activeArticleId) setSelectedArticle(read);
  }
  const articleFailed = Boolean(activeArticleId) && failedRoute === activeArticleId;
  usePageMetadata(
    selectedArticle?.id === activeArticleId ? selectedArticle : null,
    path,
    invalidPath
      ? 404
      : activeArticleId && !articleLoading && selectedArticle?.id !== activeArticleId
        ? articleFailed
          ? 503
          : 404
        : 200,
  );
  const selectArticle = (article: ArticleSummary | null) => {
    const full =
      article && 'content' in article && typeof article.content === 'string'
        ? (article as Article)
        : null;
    setSelectedArticle(full);
    navigate(article?.id || null);
  };
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('featured');
  const [searchQuery, setSearchQuery] = useState('');
  const articleMutationVersions = useRef<Record<string, number>>({});
  const feedMutationVersion = useRef(0);
  const [syncVersion, setSyncVersion] = useState(0);

  const markMutation = (articleId: string) => {
    articleMutationVersions.current[articleId] =
      (articleMutationVersions.current[articleId] || 0) + 1;
    feedMutationVersion.current += 1;
  };

  const finishMutation = (articleId: string) => {
    markMutation(articleId);
    setSyncVersion((version) => version + 1);
  };

  // Reader Preferences
  const [preferences, setPreferences] = useState<ReaderPreferences>(() => {
    if (typeof window === 'undefined') return DEFAULT_PREFERENCES;
    try {
      const saved = localStorage.getItem(STORAGE_PREFS_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_PREFERENCES;
  });

  const query = new URLSearchParams({
    filter: feedFilter,
    q: searchQuery.trim(),
    ...(selectedTopicId ? { topicId: selectedTopicId } : {}),
  }).toString();
  const {
    articles,
    setArticles,
    stats: feedStats,
    loading: feedLoading,
    offline: feedOffline,
    nextOffset,
    loadMore,
  } = useClubFeed(query, syncVersion, feedMutationVersion);

  // Comments state
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(getCachedComments);
  const filterSummary = useRef<HTMLDivElement>(null);
  const feedToolbar = useRef<HTMLDivElement>(null);
  const topicChips = useRef<HTMLDivElement>(null);
  // Bumped when a filter is chosen away from the chip row (a card's topic, the topics page,
  // 全部连载): each request scrolls the list into view once, even if the filter was already set.
  const [revealRequest, setRevealRequest] = useState(0);
  const sidebarInner = useRef<HTMLDivElement>(null);
  const [sidebarFits, setSidebarFits] = useState(false);
  const trimmedQuery = searchQuery.trim();
  const searching = Boolean(trimmedQuery);

  // Searching hides the masthead; when a search starts, also bring the result summary up under
  // the sticky header, so results are never left below the fold (or behind the phone keyboard).
  useEffect(() => {
    if (searching && filterSummary.current) revealUnderNav(filterSummary.current);
  }, [searching]);

  // The chip row is the only sign of the active topic: keep the pressed chip inside the
  // (scrolling, on phones) row whenever the filter or the view changes.
  useEffect(() => {
    const chips = topicChips.current;
    const pressed = chips?.querySelector('[aria-pressed="true"]');
    if (!chips || !pressed) return;
    const row = chips.getBoundingClientRect();
    const chip = pressed.getBoundingClientRect();
    if (chip.left < row.left || chip.right > row.right)
      chips.scrollBy({ left: chip.left - row.left - (row.width - chip.width) / 2 });
  }, [selectedTopicId, feedFilter, currentTab, activeArticleId]);

  useEffect(() => {
    if (revealRequest && feedToolbar.current) revealUnderNav(feedToolbar.current);
  }, [revealRequest]);

  // The sidebar follows the reader only while all of it fits under the header (whose height
  // changes with the search row); otherwise it simply scrolls with the page.
  useEffect(() => {
    const inner = sidebarInner.current;
    const nav = document.querySelector('.club-nav');
    if (!inner || !nav) return;
    const measure = () =>
      setSidebarFits(
        inner.offsetHeight <= window.innerHeight - nav.getBoundingClientRect().height - 37,
      );
    const observer = new ResizeObserver(measure);
    observer.observe(inner);
    observer.observe(nav);
    window.addEventListener('resize', measure);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [currentTab, activeArticleId, invalidPath]);

  // Fetch comments from Cloudflare D1 when an article is opened
  useEffect(() => {
    if (activeArticleId) window.scrollTo(0, 0);
  }, [activeArticleId]);

  useEffect(() => {
    if (!activeArticleId) return;
    // A route change starts a fresh detail request, including direct links.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setArticleLoading(true);
    let active = true;
    const version = articleMutationVersions.current[activeArticleId] || 0;
    ClubAPI.fetchArticle(activeArticleId).then(({ article: refreshed, comments, notFound }) => {
      if (!active || (articleMutationVersions.current[activeArticleId] || 0) !== version) return;
      // A failed refresh keeps text already on screen; only a real 404 removes it.
      if (refreshed || notFound) setSelectedArticle(refreshed);
      setArticleLoading(false);
      setFailedRoute(refreshed || notFound ? null : activeArticleId);
      if (refreshed) {
        setReadArticles((prev) => ({ ...prev, [activeArticleId]: refreshed }));
        setCommentsMap((prev) => ({ ...prev, [activeArticleId]: comments }));
      } else if (notFound) {
        setReadArticles((prev) => {
          const next = { ...prev };
          delete next[activeArticleId];
          return next;
        });
      }
    });

    return () => {
      active = false;
    };
  }, [activeArticleId, syncVersion]);

  // Persist preferences
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_PREFS_KEY, JSON.stringify(preferences));
    } catch {
      /* ignore */
    }
  }, [preferences]);

  // Group all series for sidebar showcase
  const seriesMap = articles.reduce<
    Record<string, { title: string; count: number; author: string }>
  >((acc, cur) => {
    if (cur.seriesTitle) {
      if (!acc[cur.seriesTitle]) {
        acc[cur.seriesTitle] = { title: cur.seriesTitle, count: 0, author: cur.author };
      }
      acc[cur.seriesTitle].count += 1;
    }
    return acc;
  }, Object.create(null));
  const seriesList = feedStats?.series || Object.values(seriesMap);
  const topicCount = (id: string) =>
    feedStats?.topics[id] ?? articles.filter((a) => a.topicId === id).length;

  // Filtered articles
  const searchedArticles = articles.filter((a) => {
    if (!searching) return true;
    const q = trimmedQuery.toLowerCase();
    return (
      a.title.toLowerCase().includes(q) ||
      a.author.toLowerCase().includes(q) ||
      a.summary.toLowerCase().includes(q) ||
      (a.goldenQuote && a.goldenQuote.toLowerCase().includes(q)) ||
      (a.seriesTitle && a.seriesTitle.toLowerCase().includes(q))
    );
  });

  const topicFiltered = selectedTopicId
    ? searchedArticles.filter((a) => a.topicId === selectedTopicId)
    : searchedArticles;

  const displayedArticles = topicFiltered
    .filter((a) => {
      if (feedFilter === 'series') return Boolean(a.seriesTitle);
      return true;
    })
    .sort((a, b) => {
      if (feedFilter === 'featured') {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return b.likes - a.likes;
      }
      if (feedFilter === 'latest') {
        return new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime();
      }
      if (feedFilter === 'series') {
        const sDiff = (a.seriesTitle || '').localeCompare(b.seriesTitle || '');
        if (sDiff !== 0) return sDiff;
        return (a.seriesOrder || 0) - (b.seriesOrder || 0);
      }
      return 0;
    });

  // Handlers
  const handleLikeArticle = async (articleId: string) => {
    markMutation(articleId);
    try {
      const likes = await ClubAPI.likeArticle(articleId);
      if (likes === null) return;
      setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, likes } : a)));
      setSelectedArticle((prev) => (prev?.id === articleId ? { ...prev, likes } : prev));
    } finally {
      finishMutation(articleId);
    }
  };

  const handleAddComment = async (
    articleId: string,
    author: string,
    content: string,
    replyToId?: string,
    replyToAuthor?: string,
  ) => {
    markMutation(articleId);
    try {
      const saved = await ClubAPI.addComment(articleId, author, content, replyToId, replyToAuthor);
      setCommentsMap((prev) => ({
        ...prev,
        [articleId]: [
          saved,
          ...(prev[articleId] || []).filter((comment) => comment.id !== saved.id),
        ],
      }));

      setArticles((prev) =>
        prev.map((a) => (a.id === articleId ? { ...a, commentsCount: a.commentsCount + 1 } : a)),
      );
      setSelectedArticle((prev) =>
        prev?.id === articleId ? { ...prev, commentsCount: prev.commentsCount + 1 } : prev,
      );
    } finally {
      finishMutation(articleId);
    }
  };

  const handleLikeComment = async (commentId: string) => {
    const articleId = activeArticleId;
    if (articleId) markMutation(articleId);
    try {
      const likes = await ClubAPI.likeComment(commentId);
      setCommentsMap((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([key, comments]) => [
            key,
            comments.map((c) => (c.id === commentId ? { ...c, likes } : c)),
          ]),
        ),
      );
    } finally {
      if (articleId) finishMutation(articleId);
    }
  };

  const activeTopic = TOPICS.find((topic) => topic.id === selectedTopicId);
  const hasFilters = Boolean(searching || selectedTopicId || feedFilter === 'series');
  // Counts appear only once they describe the list on screen, never as a "0" while loading.
  const countsReady = !feedLoading && !feedOffline;
  // Topic and series totals are site-wide and arrive with every page, so they stay put while a
  // new filter loads; without server stats they only describe the unfiltered list. Under the
  // series tab or a search they would promise more than a chip delivers, so they step aside.
  const statsReady = feedStats !== undefined && !feedOffline;
  const siteCountsShown = statsReady || (countsReady && !hasFilters);
  const chipCount = (id: string) =>
    siteCountsShown && !searching && feedFilter !== 'series' ? topicCount(id) : null;
  const seriesCount = siteCountsShown ? seriesList.length : null;
  const selectTopicFromElsewhere = (topicId: string) => {
    setRevealRequest((request) => request + 1);
    setSelectedTopicId(topicId);
  };
  const shownTotal = !countsReady
    ? null
    : hasFilters
      ? nextOffset === null && displayedArticles.length > 0
        ? displayedArticles.length
        : null
      : (feedStats?.total ?? (nextOffset === null ? articles.length : null)) || null;
  const resetFilters = () => {
    setSearchQuery('');
    setSelectedTopicId(null);
    setFeedFilter('featured');
  };

  return (
    <div className="club-app">
      <a className="club-skip-link" href="#club-main">
        跳至正文
      </a>
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          selectArticle(null);
          setCurrentTab(tab);
        }}
        onOpenWriter={() => window.location.assign('/me')}
        resolveSubdomain={resolveSubdomain}
        searchQuery={searchQuery}
        onSearchChange={(value) => {
          setSearchQuery(value);
          if (value.trim()) {
            selectArticle(null);
            setCurrentTab('plaza');
          }
        }}
      />

      <main id="club-main" className="club-main" tabIndex={-1}>
        {activeArticleId && selectedArticle?.id === activeArticleId ? (
          <ArticleReader
            key={selectedArticle.id}
            article={selectedArticle}
            allArticles={articles}
            comments={commentsMap[selectedArticle.id] ?? null}
            commentsFailed={articleFailed && !commentsMap[selectedArticle.id]}
            onRetryComments={() => setSyncVersion((version) => version + 1)}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            onResetPreferences={() => setPreferences(DEFAULT_PREFERENCES)}
            onBack={() => selectArticle(null)}
            onSelectArticle={selectArticle}
            onLikeArticle={handleLikeArticle}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
          />
        ) : activeArticleId && !invalidPath && articleLoading ? (
          <ArticleReaderSkeleton
            summary={articles.find((article) => article.id === activeArticleId) ?? null}
            theme={preferences.theme}
            onBack={() => selectArticle(null)}
          />
        ) : activeArticleId || invalidPath ? (
          <div className="club-empty club-page-state">
            <BookOpen aria-hidden="true" />
            <h1>{articleFailed ? '此篇暂时无法读取' : '此篇未能寻得'}</h1>
            <p role="status">
              {articleFailed ? '雅集暂时没有回音，请稍后再试。' : '篇章不存在，或已被作者收回。'}
            </p>
            <div className="club-empty-actions">
              {articleFailed && (
                <button
                  className="club-outline-button"
                  onClick={() => setSyncVersion((version) => version + 1)}
                >
                  <RefreshCw aria-hidden="true" />
                  重新读取
                </button>
              )}
              <button className="club-text-link" onClick={() => selectArticle(null)}>
                返回雅集广场 <ArrowRight aria-hidden="true" />
              </button>
            </div>
          </div>
        ) : currentTab === 'plaza' ? (
          <div className="club-container">
            {searching ? (
              <h1 className="sr-only">文友雅集</h1>
            ) : (
              <>
                <section className="club-hero" aria-labelledby="club-title">
                  <div>
                    <p className="club-eyebrow">NEWMAYBE · A GATHERING OF WORDS</p>
                    <h1 id="club-title">
                      文友雅集
                      <span className="club-title-seal" aria-hidden="true">
                        文以会友
                      </span>
                    </h1>
                    <p className="club-hero-motto">字里相逢，行间留白。</p>
                  </div>
                  <div className="club-hero-note">
                    <span className="club-note-label">给愿意慢下来的人</span>
                    <a href="/me" className="club-text-link">
                      把故事写下来 <ArrowUpRight aria-hidden="true" />
                    </a>
                  </div>
                </section>

                <FeaturedInvitation />
              </>
            )}

            <section className="club-feed-section" aria-labelledby="club-feed-title">
              <h2 id="club-feed-title" className="sr-only">
                翻开新的一页
              </h2>
              <div className="club-feed-toolbar" ref={feedToolbar}>
                <div className="club-feed-tabs" role="group" aria-label="篇章排序">
                  {(
                    [
                      { value: 'featured', label: '卷首精选', Icon: Sparkles },
                      { value: 'latest', label: '最新录入', Icon: Clock },
                      { value: 'series', label: '专栏连载', Icon: BookOpen },
                    ] as const
                  ).map(({ value, label, Icon }) => (
                    <button
                      key={value}
                      aria-pressed={feedFilter === value}
                      onClick={() => {
                        setFeedFilter(value);
                        setSelectedTopicId(null);
                      }}
                    >
                      <Icon aria-hidden="true" />
                      {label}
                      {value === 'series' && seriesCount ? (
                        <span className="club-tab-count">
                          {seriesCount}
                          <span className="sr-only"> 部</span>
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>
                {shownTotal !== null && (
                  <span className="club-feed-total">共 {shownTotal} 篇文字</span>
                )}
              </div>
              <div
                className="club-topic-filters"
                role="group"
                aria-label="按专题筛选"
                ref={topicChips}
              >
                <button
                  onClick={() => setSelectedTopicId(null)}
                  aria-pressed={selectedTopicId === null}
                >
                  全部专题
                </button>
                {TOPICS.map((topic) => {
                  const count = chipCount(topic.id);
                  return (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopicId(topic.id)}
                      onFocus={(event) =>
                        event.currentTarget.scrollIntoView({ inline: 'nearest', block: 'nearest' })
                      }
                      aria-pressed={selectedTopicId === topic.id}
                      aria-label={
                        count
                          ? `${topic.name}，${count} 篇`
                          : count === 0
                            ? `${topic.name}，暂无文章`
                            : topic.name
                      }
                      className={count === 0 ? 'is-empty' : undefined}
                    >
                      {topic.name}
                      {count ? <span aria-hidden="true">{count}</span> : null}
                    </button>
                  );
                })}
              </div>
              <p className="sr-only" aria-live="polite">
                {activeTopic && !searching && countsReady
                  ? `${activeTopic.name}，${nextOffset === null ? displayedArticles.length : (chipCount(activeTopic.id) ?? displayedArticles.length)} 篇`
                  : ''}
              </p>
              {searching && (
                <div className="club-filter-summary" role="status" ref={filterSummary}>
                  <Search aria-hidden="true" />
                  <span>
                    {activeTopic ? `${activeTopic.name} · ` : ''}
                    {`包含“${trimmedQuery}”的篇章`}
                    {!feedLoading && !feedOffline && nextOffset === null
                      ? ` · 共 ${displayedArticles.length} 篇`
                      : ''}
                  </span>
                  <button className="club-text-link" onClick={() => setSearchQuery('')}>
                    清空搜索
                    <X aria-hidden="true" />
                  </button>
                </div>
              )}
              <div className="club-reading-layout">
                <div className="club-feed" aria-busy={feedLoading}>
                  {feedLoading && displayedArticles.length === 0 ? (
                    <div className="club-loading" role="status">
                      <span className="club-loading-label">
                        <BookOpen aria-hidden="true" />
                        正在加载篇章…
                      </span>
                      {[0, 1, 2].map((item) => (
                        <div key={item} className="club-skeleton" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                        </div>
                      ))}
                    </div>
                  ) : feedOffline && displayedArticles.length === 0 ? (
                    <div className="club-empty" role="status">
                      <BookOpen aria-hidden="true" />
                      <h3>篇章暂时未能送达</h3>
                      <p>
                        暂时无法连接雅集，请稍后重试。
                        <br />
                        也可以先翻阅本期特刊，读一段慢时光。
                      </p>
                      <button
                        className="club-outline-button"
                        onClick={() => setSyncVersion((version) => version + 1)}
                      >
                        <RefreshCw aria-hidden="true" />
                        重新加载
                      </button>
                    </div>
                  ) : displayedArticles.length === 0 &&
                    activeTopic &&
                    !searching &&
                    feedFilter !== 'series' ? (
                    <div className="club-empty club-empty--invite">
                      <Feather aria-hidden="true" />
                      <h3>「{activeTopic.name}」还在等第一篇文字</h3>
                      <p>{activeTopic.desc}</p>
                      <div className="club-empty-actions">
                        <a href="/me" className="club-text-link">
                          写下第一篇 <ArrowUpRight aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  ) : displayedArticles.length === 0 ? (
                    <div className="club-empty">
                      <Feather aria-hidden="true" />
                      <h3>{hasFilters ? '未找到相关文稿' : '新的一页，静候落笔'}</h3>
                      <p>
                        {hasFilters
                          ? '换一个关键词或专题，或许会遇见另一段共鸣。'
                          : '每一篇用心写下的文字，都值得被认真读到。'}
                      </p>
                      <div className="club-empty-actions">
                        {hasFilters && (
                          <button className="club-outline-button" onClick={resetFilters}>
                            重置筛选
                          </button>
                        )}
                        <a href="/me" className="club-text-link">
                          即刻落笔投稿 <ArrowUpRight aria-hidden="true" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <>
                      {feedOffline && (
                        <p className="club-feed-notice" role="status">
                          更新暂未完成，当前保留已加载的篇章。
                          <button
                            className="club-text-link"
                            onClick={() => setSyncVersion((version) => version + 1)}
                          >
                            重试
                          </button>
                        </p>
                      )}
                      {displayedArticles.map((article) => (
                        <ArticleCard
                          key={article.id}
                          article={{
                            ...article,
                            commentsCount: commentsMap[article.id]?.length ?? article.commentsCount,
                          }}
                          showFeaturedFlag={feedFilter !== 'featured'}
                          onSelect={selectArticle}
                          onSelectTopic={selectTopicFromElsewhere}
                        />
                      ))}
                    </>
                  )}
                  {nextOffset !== null && displayedArticles.length > 0 && (
                    <button disabled={feedLoading} onClick={loadMore} className="club-load-more">
                      {feedLoading ? '正在加载…' : '加载更多篇章'}
                      <ArrowRight aria-hidden="true" />
                    </button>
                  )}
                  {!feedLoading &&
                    !feedOffline &&
                    displayedArticles.length > 0 &&
                    nextOffset === null && (
                      <p className="club-feed-end">
                        读到这里，歇一歇也好。<span aria-hidden="true">◇</span>
                      </p>
                    )}
                </div>

                <aside className="club-sidebar" aria-label="雅集导览">
                  <div
                    className={`club-sidebar-inner${sidebarFits ? ' is-sticky' : ''}`}
                    ref={sidebarInner}
                  >
                    {seriesList.length > 0 && (
                      <section className="club-sidebar-section">
                        <h3 className="club-sidebar-title">把日子，写成一卷</h3>
                        {seriesList.slice(0, SIDEBAR_SERIES).map((series) => (
                          <button
                            className="club-series-item"
                            key={series.title}
                            onClick={() => {
                              setSearchQuery(series.title);
                              setFeedFilter('series');
                              setSelectedTopicId(null);
                            }}
                          >
                            <BookOpen aria-hidden="true" />
                            <span>
                              <strong>{series.title}</strong>
                              <small>
                                {series.author} · {series.count} 卷连载
                              </small>
                            </span>
                            <ArrowUpRight aria-hidden="true" />
                          </button>
                        ))}
                        {seriesList.length > SIDEBAR_SERIES && (
                          <button
                            className="club-text-link"
                            onClick={() => {
                              setRevealRequest((request) => request + 1);
                              setSearchQuery('');
                              setSelectedTopicId(null);
                              setFeedFilter('series');
                            }}
                          >
                            全部 {seriesList.length} 部连载 <ArrowRight aria-hidden="true" />
                          </button>
                        )}
                      </section>
                    )}
                    <section className="club-editor-note">
                      <Feather aria-hidden="true" />
                      <h3>留白之约</h3>
                      <p>
                        不必追赶热闹，
                        <br />
                        只需诚实地记录与表达。
                      </p>
                      <ul>
                        <li>以原创文字，安放真实体验。</li>
                        <li>让每一次回应，都温和而有分寸。</li>
                        <li>慢笔深思，见字如晤。</li>
                      </ul>
                      <a href="/me" className="club-text-link">
                        我要投稿至雅集 <ArrowUpRight aria-hidden="true" />
                      </a>
                    </section>
                  </div>
                </aside>
              </div>
            </section>
          </div>
        ) : (
          <div className="club-container club-collections">
            <div className="club-collection-intro">
              <p className="club-eyebrow">WORDS, IN GOOD COMPANY</p>
              <h1>
                专题文集 <span>· 卷册分类</span>
              </h1>
              <p>
                每一种心绪，都有一处可以停留的地方。
                <br />
                循着日常、记忆与远方，找到与你同频的文字。
              </p>
            </div>
            <div className="club-topic-grid">
              {TOPICS.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={{ ...topic, articleCount: topicCount(topic.id) }}
                  onSelect={(topicId) => {
                    selectTopicFromElsewhere(topicId);
                    setCurrentTab('plaza');
                  }}
                />
              ))}
            </div>
            <p className="club-collection-colophon">五个专题，无数种看见世界的方式。</p>
          </div>
        )}
      </main>
      <footer className="club-footer">
        <div className="club-container">
          <div>
            <a href="/" className="club-footer-brand">
              newmaybe<span>.club</span>
            </a>
            <p>字里相逢，行间留白。</p>
          </div>
          <nav aria-label="更多空间">
            <a href="/featured">一期一文</a>
            <a href={resolveSubdomain('https://studio.newmaybe.com')}>创作工坊</a>
            <a href={resolveSubdomain('https://newmaybe.com')}>
              返回主站 <ArrowUpRight aria-hidden="true" />
            </a>
          </nav>
          <span className="club-footer-signature">以文会友 · 以字记时</span>
        </div>
      </footer>
    </div>
  );
}
