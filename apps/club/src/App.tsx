import { useState, useEffect } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import type { Article, Comment } from './types';
import { TOPICS } from './data/topics';
import { INITIAL_ARTICLES, INITIAL_COMMENTS } from './data/initialArticles';
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

export default function App() {
  const [currentTab, setCurrentTab] = useState<'plaza' | 'topics'>('plaza');
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [isWriterOpen, setIsWriterOpen] = useState(false);

  // Articles state
  const [articles, setArticles] = useState<Article[]>(() => {
    if (typeof window === 'undefined') return INITIAL_ARTICLES;
    try {
      const saved = localStorage.getItem(STORAGE_ARTICLES_KEY);
      if (saved) {
        return JSON.parse(saved);
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

  // Filtered articles
  const filteredArticles = selectedTopicId
    ? articles.filter((a) => a.topicId === selectedTopicId)
    : articles;

  // Handlers
  const handleLikeArticle = (articleId: string) => {
    setArticles((prev) => prev.map((a) => (a.id === articleId ? { ...a, likes: a.likes + 1 } : a)));
    if (selectedArticle?.id === articleId) {
      setSelectedArticle((prev) => (prev ? { ...prev, likes: prev.likes + 1 } : null));
    }
  };

  const handleAddComment = (articleId: string, author: string, content: string) => {
    const newComment: Comment = {
      id: 'comm-' + Date.now(),
      articleId,
      author,
      content,
      createdAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      likes: 0,
    };

    setCommentsMap((prev) => ({
      ...prev,
      [articleId]: [newComment, ...(prev[articleId] || [])],
    }));

    setArticles((prev) =>
      prev.map((a) => (a.id === articleId ? { ...a, commentsCount: a.commentsCount + 1 } : a)),
    );
    if (selectedArticle?.id === articleId) {
      setSelectedArticle((prev) =>
        prev ? { ...prev, commentsCount: prev.commentsCount + 1 } : null,
      );
    }
  };

  const handleLikeComment = (commentId: string) => {
    setCommentsMap((prev) => {
      const next = { ...prev };
      for (const key of Object.keys(next)) {
        next[key] = next[key].map((c) => (c.id === commentId ? { ...c, likes: c.likes + 1 } : c));
      }
      return next;
    });
  };

  const handleSubmitArticle = (newArticleData: Omit<Article, 'id' | 'likes' | 'commentsCount'>) => {
    const newArticle: Article = {
      ...newArticleData,
      id: 'article-' + Date.now(),
      likes: 1,
      commentsCount: 0,
    };

    setArticles((prev) => [newArticle, ...prev]);
    setSelectedTopicId(null);
    setCurrentTab('plaza');
    setSelectedArticle(newArticle);
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
      />

      {/* Main Content Area */}
      <main className="flex-grow">
        {selectedArticle ? (
          <ArticleReader
            article={selectedArticle}
            comments={commentsMap[selectedArticle.id] || []}
            onBack={() => setSelectedArticle(null)}
            onLikeArticle={handleLikeArticle}
            onAddComment={handleAddComment}
            onLikeComment={handleLikeComment}
          />
        ) : currentTab === 'plaza' ? (
          <div className="max-w-[1080px] mx-auto px-6 py-8 md:py-12">
            {/* Community Hero Intro */}
            <div className="mb-10 pb-8 border-b border-[var(--line)]">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <span className="text-xs font-serif text-[var(--ochre)] italic tracking-wider block mb-1">
                    Echoes & Writers Club
                  </span>
                  <h1 className="font-serif font-semibold text-2xl md:text-3xl text-[var(--ink)] tracking-wide">
                    文友雅集
                    <span className="text-sm font-normal text-[var(--ink-faint)] ml-3 font-serif">
                      字里相逢，行间留白
                    </span>
                  </h1>
                </div>
                <p className="text-xs md:text-sm text-[var(--ink-soft)] max-w-md font-light leading-relaxed">
                  慢节奏的人文写作与专题文集社区。记录那些还没成形的心绪，以字会友，安放共鸣。
                </p>
              </div>

              {/* Topic Filters Chip Bar */}
              <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1 text-xs font-serif">
                <button
                  onClick={() => setSelectedTopicId(null)}
                  className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap ${
                    selectedTopicId === null
                      ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium shadow-xs'
                      : 'bg-[color-mix(in_srgb,var(--paper-deep)_70%,var(--paper))] text-[var(--ink-soft)] border border-[var(--line)] hover:border-[var(--ochre)]'
                  }`}
                >
                  全部文章 ({articles.length})
                </button>
                {TOPICS.map((t) => {
                  const count = articles.filter((a) => a.topicId === t.id).length;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTopicId(t.id)}
                      className={`px-3 py-1.5 rounded-full transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        selectedTopicId === t.id
                          ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium shadow-xs'
                          : 'bg-[color-mix(in_srgb,var(--paper-deep)_70%,var(--paper))] text-[var(--ink-soft)] border border-[var(--line)] hover:border-[var(--ochre)]'
                      }`}
                    >
                      <span>{t.icon}</span>
                      <span>{t.name}</span>
                      <span className="text-[10px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Layout: Main Article Feed + Right Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Left Column: Articles */}
              <div className="lg:col-span-8 flex flex-col gap-5">
                {filteredArticles.length === 0 ? (
                  <div className="text-center py-16 border border-dashed border-[var(--line)] rounded text-sm text-[var(--ink-faint)] font-serif">
                    该专题下暂无文稿，
                    <button
                      onClick={() => setIsWriterOpen(true)}
                      className="text-[var(--ochre)] underline hover:text-[var(--ochre-deep)] ml-1 cursor-pointer"
                    >
                      点击即刻投稿
                    </button>
                  </div>
                ) : (
                  filteredArticles.map((article) => (
                    <ArticleCard
                      key={article.id}
                      article={article}
                      onSelect={(art) => setSelectedArticle(art)}
                      onSelectTopic={(topicId) => setSelectedTopicId(topicId)}
                    />
                  ))
                )}
              </div>

              {/* Right Column: Topics & Community Rules */}
              <aside className="lg:col-span-4 flex flex-col gap-6">
                {/* Topic Showcase Box */}
                <div className="p-5 rounded border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-deep)_50%,var(--paper))]">
                  <div className="flex items-center justify-between mb-3 pb-2 border-b border-[var(--line)]">
                    <h3 className="font-serif font-medium text-sm text-[var(--ink)]">
                      推荐专题文集
                    </h3>
                    <button
                      onClick={() => setCurrentTab('topics')}
                      className="text-xs text-[var(--ochre)] hover:underline font-serif cursor-pointer"
                    >
                      全部专题 →
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {TOPICS.slice(0, 4).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTopicId(t.id)}
                        className="p-2.5 rounded hover:bg-[var(--paper-deep)] transition-colors cursor-pointer flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{t.icon}</span>
                          <span className="text-xs font-serif font-medium text-[var(--ink)]">
                            {t.name}
                          </span>
                        </div>
                        <span className="text-[11px] font-serif text-[var(--ink-faint)]">
                          {articles.filter((a) => a.topicId === t.id).length} 篇
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Community Vision Box */}
                <div className="p-5 rounded border border-[var(--line)] bg-[color-mix(in_srgb,var(--paper-deep)_50%,var(--paper))]">
                  <h3 className="font-serif font-medium text-sm text-[var(--ink)] mb-2">
                    雅集守则 · 留白之约
                  </h3>
                  <ul className="text-xs text-[var(--ink-soft)] space-y-2 leading-relaxed font-light font-serif">
                    <li>· 慢笔深思，不追求流量与算法的迎合。</li>
                    <li>· 诚实落笔，安放最真实的体验与微光。</li>
                    <li>· 读者评语如题跋，温和互通，共护文雅。</li>
                  </ul>
                  <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)]">
                    <button
                      onClick={() => setIsWriterOpen(true)}
                      className="w-full py-2 text-xs font-serif text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer shadow-xs"
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
              <p className="text-xs md:text-sm text-[var(--ink-soft)] font-light mt-2">
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
          <span>newmaybe 文友雅集 · 慢节奏创作与读者互动空间</span>
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
      <WriterModal
        topics={TOPICS}
        isOpen={isWriterOpen}
        onClose={() => setIsWriterOpen(false)}
        onSubmitArticle={handleSubmitArticle}
      />
    </div>
  );
}
