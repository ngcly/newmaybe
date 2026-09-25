import { useState, useEffect, useRef } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import { Sparkles, Clock, BookOpen, Flame, Search } from 'lucide-react';
import type { Article, Comment, ReaderPreferences, FeedFilter } from './types';
import { TOPICS } from './data/topics';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from './data/initialArticles';
import { ClubAPI } from './lib/api';
import Navbar from './components/Navbar';
import ArticleCard from './components/ArticleCard';
import TopicCard from './components/TopicCard';
import ArticleReader from './components/ArticleReader';
import WriterModal from './components/WriterModal';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

const STORAGE_ARTICLES_KEY = 'newmaybe_club_articles';
const STORAGE_COMMENTS_KEY = 'newmaybe_club_comments';
const STORAGE_PREFS_KEY = 'newmaybe_club_reader_prefs';

const DEFAULT_PREFERENCES: ReaderPreferences = {
  theme: 'paper',
  font: 'song',
  fontSize: 'md',
  lineHeight: 'normal',
};

export default function App() {
  const [currentTab, setCurrentTab] = useState<'plaza' | 'topics'>('plaza');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isWriterOpen, setIsWriterOpen] = useState(false);
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

  // Articles state with initial local cache
  const [articles, setArticles] = useState<Article[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ARTICLES;
    try {
      const saved = localStorage.getItem(STORAGE_ARTICLES_KEY);
      if (saved) {
        const parsed: Article[] = JSON.parse(saved);
        const merged = parsed.map((item) => {
          const init = INITIAL_ARTICLES.find((a) => a.id === item.id);
          return init ? { ...init, ...item } : item;
        });
        INITIAL_ARTICLES.forEach((init) => {
          if (!merged.some((m) => m.id === init.id)) {
            merged.push(init);
          }
        });
        return merged;
      }
    } catch {
      /* ignore */
    }
    return INITIAL_ARTICLES;
  });

  // Comments state
  const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>(() => {
    if (typeof window === 'undefined') return INITIAL_COMMENTS;
    try {
      const saved = localStorage.getItem(STORAGE_COMMENTS_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      /* ignore */
    }
    return INITIAL_COMMENTS;
  });

  // Keep the complete article collection independent of the current view filters.
  useEffect(() => {
    let active = true;
    const version = feedMutationVersion.current;
    ClubAPI.fetchArticles().then((cloudArticles) => {
      if (!active || feedMutationVersion.current !== version) return;
      setArticles(cloudArticles);
    });

    return () => {
      active = false;
    };
  }, [syncVersion]);

  // Fetch comments from Cloudflare D1 when an article is opened
  const activeArticleId = selectedArticle?.id;
  useEffect(() => {
    if (activeArticleId) window.scrollTo(0, 0);
  }, [activeArticleId]);

  useEffect(() => {
    if (!activeArticleId) return;
    let active = true;
    const version = articleMutationVersions.current[activeArticleId] || 0;
    ClubAPI.fetchArticle(activeArticleId).then(({ article: refreshed, comments }) => {
      if (!active || (articleMutationVersions.current[activeArticleId] || 0) !== version) return;
      if (refreshed) {
        setSelectedArticle((prev) => (prev?.id === refreshed.id ? refreshed : prev));
      }
      if (Array.isArray(comments)) {
        setCommentsMap((prev) => ({ ...prev, [activeArticleId]: comments }));
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

  // Persist articles
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_ARTICLES_KEY, JSON.stringify(articles));
    } catch {
      /* ignore */
    }
  }, [articles]);

  // Persist comments
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_COMMENTS_KEY, JSON.stringify(commentsMap));
    } catch {
      /* ignore */
    }
  }, [commentsMap]);

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
  }, {});
  const seriesList = Object.values(seriesMap);

  // Filtered articles
  const searchedArticles = articles.filter((a) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
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

  const handleAddComment = async (articleId: string, author: string, content: string) => {
    markMutation(articleId);
    try {
      const saved = await ClubAPI.addComment(articleId, author, content);
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

  const handleLikeComment = (commentId: string) => {
    const articleId = activeArticleId;
    if (articleId) markMutation(articleId);
    ClubAPI.likeComment(commentId)
      .then(() => {
        setCommentsMap((prev) => {
          const next = { ...prev };
          for (const key of Object.keys(next)) {
            next[key] = next[key].map((c) =>
              c.id === commentId ? { ...c, likes: c.likes + 1 } : c,
            );
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => {
        if (articleId) finishMutation(articleId);
      });
  };

  const handleSubmitArticle = async (
    newArticleData: Omit<Article, 'id' | 'likes' | 'commentsCount' | 'summary'>,
  ) => {
    feedMutationVersion.current += 1;
    try {
      const saved = await ClubAPI.createArticle(newArticleData);
      setArticles((prev) => [saved, ...prev.filter((a) => a.id !== saved.id)]);
      setSelectedTopicId(null);
      setCurrentTab('plaza');
      setSelectedArticle(saved);
    } finally {
      feedMutationVersion.current += 1;
      setSyncVersion((version) => version + 1);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper)] text-[var(--ink)]">
      {/* Navbar */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          setSelectedArticle(null);
          setCurrentTab(tab);
        }}
        onOpenWriter={() => setIsWriterOpen(true)}
        resolveSubdomain={resolveSubdomain}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {selectedArticle ? (
          <ArticleReader
            key={selectedArticle.id}
            article={selectedArticle}
            allArticles={articles}
            comments={commentsMap[selectedArticle.id] || []}
            preferences={preferences}
            onPreferencesChange={setPreferences}
            onResetPreferences={() => setPreferences(DEFAULT_PREFERENCES)}
            onBack={() => setSelectedArticle(null)}
            onSelectArticle={(art) => setSelectedArticle(art)}
            onLikeArticle={handleLikeArticle}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
          />
        ) : currentTab === 'plaza' ? (
          <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
            {/* Community Hero Intro */}
            <div className="mb-8 pb-6 border-b border-[var(--line)]/60">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-serif text-[var(--ochre)] italic tracking-wider block mb-1">
                    Echoes & Writers Club · 文友雅集
                  </span>
                  <h1 className="font-serif font-semibold text-2xl md:text-3xl text-[var(--ink)] tracking-wide">
                    文友雅集
                    <span className="text-sm font-normal text-[var(--ink-faint)] ml-3 font-serif">
                      字里相逢，行间留白
                    </span>
                  </h1>
                </div>
                <p className="text-xs md:text-sm text-[var(--ink-soft)] max-w-md font-light leading-relaxed font-serif">
                  慢节奏人文随笔与专栏文集社区。以纸墨安放此刻的呼吸，记录那些在时光里未曾褪色的微光。
                </p>
              </div>

              {/* Feed Mode Tabs & Topic Filters - Harmonious and Airy */}
              <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--line)]/50 pb-0">
                {/* 3 Main Feeds as Minimalist Editorial Underline Tabs */}
                <div className="flex min-w-0 items-center gap-3 sm:gap-6 overflow-x-auto [&>button]:shrink-0 [&>button]:whitespace-nowrap">
                  <button
                    onClick={() => {
                      setFeedFilter('featured');
                      setSelectedTopicId(null);
                    }}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-serif transition-all cursor-pointer border-b-2 -mb-[1px] ${
                      feedFilter === 'featured'
                        ? 'text-[var(--ochre)] border-[var(--ochre)] font-medium'
                        : 'text-[var(--ink-soft)] border-transparent hover:text-[var(--ink)]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>卷首精选</span>
                  </button>

                  <button
                    onClick={() => {
                      setFeedFilter('latest');
                      setSelectedTopicId(null);
                    }}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-serif transition-all cursor-pointer border-b-2 -mb-[1px] ${
                      feedFilter === 'latest'
                        ? 'text-[var(--ochre)] border-[var(--ochre)] font-medium'
                        : 'text-[var(--ink-soft)] border-transparent hover:text-[var(--ink)]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>最新录入</span>
                  </button>

                  <button
                    onClick={() => {
                      setFeedFilter('series');
                      setSelectedTopicId(null);
                    }}
                    className={`flex items-center gap-1.5 pb-2.5 text-xs sm:text-sm font-serif transition-all cursor-pointer border-b-2 -mb-[1px] ${
                      feedFilter === 'series'
                        ? 'text-[var(--ochre)] border-[var(--ochre)] font-medium'
                        : 'text-[var(--ink-soft)] border-transparent hover:text-[var(--ink)]'
                    }`}
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>专栏连载 ({seriesList.length})</span>
                  </button>
                </div>

                {/* Search status indicator */}
                {searchQuery && (
                  <div className="flex items-center gap-2 pb-2 text-xs font-serif text-[var(--ochre)]">
                    <Search className="w-3.5 h-3.5" />
                    <span>
                      包含 “{searchQuery}” 的篇章 ({displayedArticles.length})
                    </span>
                    <button
                      onClick={() => setSearchQuery('')}
                      className="shrink-0 whitespace-nowrap underline text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer ml-1"
                    >
                      清空搜索
                    </button>
                  </div>
                )}
              </div>

              {/* Topic Filters Ribbon: Lightweight Text Tags */}
              <div className="flex items-center gap-1.5 mt-3.5 overflow-x-auto pb-1 text-xs font-serif">
                <button
                  onClick={() => setSelectedTopicId(null)}
                  className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap ${
                    selectedTopicId === null
                      ? 'text-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] font-medium'
                      : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/50'
                  }`}
                >
                  全部专题
                  <span className="text-[var(--ink-faint)] text-[10px] ml-1 font-sans">
                    ({articles.length})
                  </span>
                </button>
                {TOPICS.map((t) => {
                  const count = articles.filter((a) => a.topicId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopicId(t.id)}
                      className={`px-2.5 py-1 rounded transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        selectedTopicId === t.id
                          ? 'text-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] font-medium'
                          : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/50'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      <span className="text-[var(--ink-faint)] text-[10px] font-sans">
                        ({count})
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout: Main Article Feed + Right Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Articles */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                {displayedArticles.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-[var(--line)] rounded text-sm text-[var(--ink-faint)] font-serif">
                    未找到相关文稿，
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedTopicId(null);
                        setFeedFilter('featured');
                      }}
                      className="text-[var(--ochre)] underline hover:text-[var(--ochre-deep)] ml-1 cursor-pointer"
                    >
                      重置筛选
                    </button>
                    <span className="mx-1">或</span>
                    <button
                      onClick={() => setIsWriterOpen(true)}
                      className="text-[var(--ochre)] underline hover:text-[var(--ochre-deep)] cursor-pointer"
                    >
                      即刻落笔投稿
                    </button>
                  </div>
                ) : (
                  displayedArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onSelect={(art) => setSelectedArticle(art)}
                      onSelectTopic={(topicId) => setSelectedTopicId(topicId)}
                    />
                  ))
                )}
              </div>

              {/* Right Column: Topics & Series & Rules - Deconstructed & Airy */}
              <aside className="lg:col-span-4 flex flex-col gap-6">
                {/* Series Showcase */}
                {seriesList.length > 0 && (
                  <div className="p-5 rounded border border-[var(--line)]/60 bg-[var(--paper)]">
                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]/50">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5 text-[var(--ochre)]" />
                        <h3 className="font-serif font-medium text-xs sm:text-sm text-[var(--ink)]">
                          专栏文集 · 连载推荐
                        </h3>
                      </div>
                      <button
                        onClick={() => setFeedFilter('series')}
                        className="text-xs text-[var(--ochre)] hover:underline font-serif cursor-pointer"
                      >
                        全部连载 →
                      </button>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {seriesList.map((s) => (
                        <div
                          key={s.title}
                          onClick={() => {
                            setSearchQuery(s.title);
                            setFeedFilter('series');
                          }}
                          className="p-2.5 rounded hover:bg-[var(--paper-deep)]/50 transition-colors cursor-pointer flex items-center justify-between group"
                        >
                          <div className="flex flex-col">
                            <span className="text-xs font-serif font-medium text-[var(--ink)] group-hover:text-[var(--ochre)] transition-colors">
                              《{s.title}》
                            </span>
                            <span className="text-[10px] font-serif text-[var(--ink-faint)]">
                              主笔 · {s.author}
                            </span>
                          </div>
                          <span className="text-[11px] font-serif text-[var(--ink-faint)] px-2 py-0.5 rounded border border-[var(--line)]/50">
                            {s.count} 卷连载
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Topic Showcase */}
                <div className="p-5 rounded border border-[var(--line)]/60 bg-[var(--paper)]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]/50">
                    <h3 className="font-serif font-medium text-xs sm:text-sm text-[var(--ink)]">
                      推荐专题分类
                    </h3>
                    <button
                      onClick={() => setCurrentTab('topics')}
                      className="text-xs text-[var(--ochre)] hover:underline font-serif cursor-pointer"
                    >
                      全部专题 →
                    </button>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {TOPICS.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTopicId(t.id)}
                        className="p-2.5 rounded hover:bg-[var(--paper-deep)]/50 transition-colors cursor-pointer flex items-center justify-between group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.icon}</span>
                          <span className="text-xs font-serif font-normal text-[var(--ink)] group-hover:text-[var(--ochre)] transition-colors">
                            {t.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-serif text-[var(--ink-faint)] font-sans">
                          {articles.filter((a) => a.topicId === t.id).length} 篇
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Community Colophon Note */}
                <div className="p-5 rounded border border-dashed border-[color-mix(in_srgb,var(--ochre)_30%,var(--line))] bg-[color-mix(in_srgb,var(--ochre)_3%,transparent)]">
                  <h3 className="font-serif font-medium text-xs sm:text-sm text-[var(--ink)] mb-2 flex items-center gap-1.5">
                    <Flame className="w-3.5 h-3.5 text-[var(--cinnabar)]" />
                    <span>雅集守则 · 留白之约</span>
                  </h3>
                  <ul className="text-xs text-[var(--ink-soft)] space-y-2 leading-relaxed font-light font-serif">
                    <li>· 慢笔深思，不迎合算法流量，安放最真实的体验。</li>
                    <li>· 支持创建个人专栏文集，享受连载成卷的写作乐趣。</li>
                    <li>· 读者评语如题跋，温和互通，共护文雅。</li>
                  </ul>
                  <div className="mt-4 pt-3 border-t border-dashed border-[color-mix(in_srgb,var(--ochre)_25%,var(--line))]">
                    <button
                      onClick={() => setIsWriterOpen(true)}
                      className="w-full py-2 text-xs font-serif text-[var(--ochre)] border border-[var(--ochre)]/40 hover:bg-[var(--ochre)] hover:text-[var(--paper)] rounded transition-all cursor-pointer shadow-2xs"
                    >
                      我要投稿至雅集
                    </button>
                  </div>
                </div>
              </aside>
            </div>
          </div>
        ) : (
          /* Topics View */
          <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
            <div className="mb-10 pb-6 border-b border-[var(--line)]">
              <span className="text-xs font-serif text-[var(--ochre)] italic tracking-wider block mb-1">
                Featured Collections
              </span>
              <h1 className="font-serif font-semibold text-2xl md:text-3xl text-[var(--ink)] tracking-wide">
                专题文集 · 卷册分类
              </h1>
              <p className="text-xs md:text-sm text-[var(--ink-soft)] font-light mt-2 font-serif">
                按不同情境与意象收录的文友篇章，点击任意专题即可进入文集精选。
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {TOPICS.map((topic) => (
                <TopicCard
                  key={topic.id}
                  topic={topic}
                  onSelect={(topicId) => {
                    setSelectedTopicId(topicId);
                    setCurrentTab('plaza');
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-16 border-t border-[var(--line)] py-8 text-center text-xs text-[var(--ink-faint)] font-serif bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))]">
        <div className="max-w-[1080px] mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>newmaybe 文友雅集 · 慢节奏社区阅读与写作空间</span>
          <div className="flex items-center gap-4">
            <a
              href={resolveSubdomain('https://newmaybe.com')}
              className="text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline"
            >
              返回主站
            </a>
            <span>·</span>
            <a
              href={resolveSubdomain('https://studio.newmaybe.com')}
              className="text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline"
            >
              创作工坊
            </a>
          </div>
        </div>
      </footer>

      {/* Writer Modal */}
      {isWriterOpen && (
        <WriterModal
          topics={TOPICS}
          isOpen={isWriterOpen}
          onClose={() => setIsWriterOpen(false)}
          onSubmitArticle={handleSubmitArticle}
        />
      )}
    </div>
  );
}
