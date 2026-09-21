import { useState, useEffect } from 'react';
import { PenTool, Eye, RotateCcw, X, Sparkles, BookOpen } from 'lucide-react';
import type { Topic, Article } from '../types';

interface WriterModalProps {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitArticle: (
    newArticle: Omit<Article, 'id' | 'likes' | 'commentsCount' | 'summary'>,
  ) => Promise<void>;
}

const STORAGE_DRAFT_KEY = 'newmaybe_club_writer_draft';

interface WriterDraft {
  title: string;
  author: string;
  authorSeal: string;
  topicId: string;
  seriesTitle: string;
  goldenQuote: string;
  content: string;
}

function getStoredDraft(defaultTopicId: string): WriterDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const saved = localStorage.getItem(STORAGE_DRAFT_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.title || parsed.content) {
        return {
          title: parsed.title || '',
          author: parsed.author || '',
          authorSeal: parsed.authorSeal || '',
          topicId: parsed.topicId || defaultTopicId,
          seriesTitle: parsed.seriesTitle || '',
          goldenQuote: parsed.goldenQuote || '',
          content: parsed.content || '',
        };
      }
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistDraft(draft: WriterDraft): void {
  try {
    if (draft.title || draft.content) {
      localStorage.setItem(STORAGE_DRAFT_KEY, JSON.stringify(draft));
    } else {
      localStorage.removeItem(STORAGE_DRAFT_KEY);
    }
  } catch {
    // The open editor still retains the draft if local storage is unavailable.
  }
}

export default function WriterModal({
  topics,
  isOpen,
  onClose,
  onSubmitArticle,
}: WriterModalProps) {
  const [initialDraft] = useState(() => getStoredDraft(topics[0]?.id || 'deep-night'));
  const [activeTab, setActiveTab] = useState<'edit' | 'preview'>('edit');
  const [title, setTitle] = useState(() => initialDraft?.title || '');
  const [author, setAuthor] = useState(() => initialDraft?.author || '');
  const [authorSeal, setAuthorSeal] = useState(() => initialDraft?.authorSeal || '');
  const [topicId, setTopicId] = useState(
    () => initialDraft?.topicId || topics[0]?.id || 'deep-night',
  );
  const [seriesTitle, setSeriesTitle] = useState(() => initialDraft?.seriesTitle || '');
  const [goldenQuote, setGoldenQuote] = useState(() => initialDraft?.goldenQuote || '');
  const [content, setContent] = useState(() => initialDraft?.content || '');
  const [hasRestoredDraft, setHasRestoredDraft] = useState(() => Boolean(initialDraft));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Debounced save while editing; closing flushes the latest draft immediately.
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen, title, author, authorSeal, topicId, seriesTitle, goldenQuote, content]);

  if (!isOpen) return null;

  const wordCount = content.trim().length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 130));
  const chosenTopic = topics.find((t) => t.id === topicId) || topics[0];

  const handleClose = () => {
    if (isSubmitting) return;
    persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
    onClose();
  };

  const handleClearDraft = () => {
    if (window.confirm('确定要清空当前草稿内容吗？')) {
      setTitle('');
      setAuthor('');
      setAuthorSeal('');
      setSeriesTitle('');
      setGoldenQuote('');
      setContent('');
      persistDraft({
        title: '',
        author: '',
        authorSeal: '',
        topicId,
        seriesTitle: '',
        goldenQuote: '',
        content: '',
      });
      setHasRestoredDraft(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || isSubmitting) return;

    const today = new Date().toISOString().split('T')[0];

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onSubmitArticle({
        title: title.trim(),
        content: content.trim(),
        author: author.trim() || '文友',
        authorSeal: authorSeal.trim() || (author.trim() ? author.trim().slice(0, 2) : '未定'),
        topicId: chosenTopic.id,
        topicName: chosenTopic.name,
        pubDate: today,
        readingTime,
        wordCount,
        isUserCreated: true,
        seriesTitle: seriesTitle.trim() || undefined,
        goldenQuote: goldenQuote.trim() || undefined,
        featured: false,
      });
      try {
        localStorage.removeItem(STORAGE_DRAFT_KEY);
      } catch {
        // Publishing succeeded even if local storage is unavailable.
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '投稿失败，请稍后重试');
      persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="fixed inset-0" onClick={handleClose} />
      <div
        className="relative w-full max-w-3xl bg-[var(--paper)] border border-[var(--line)] rounded-sm shadow-2xl p-6 sm:p-8 max-h-[92vh] overflow-y-auto flex flex-col justify-between z-10 animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded bg-[color-mix(in_srgb,var(--ochre)_12%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_30%,transparent)] flex items-center justify-center text-[var(--ochre)]">
                <PenTool className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-serif font-semibold text-lg sm:text-xl text-[var(--ink)]">
                  文案雅室 · 沉浸撰写
                </h2>
                <span className="text-[11px] font-serif text-[var(--ink-faint)]">
                  慢笔深思，草稿已开启自动本地暂存
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Edit / Preview Toggle */}
              <div className="flex items-center border border-[var(--line)] rounded p-0.5 bg-[var(--paper-deep)] text-xs font-serif">
                <button
                  type="button"
                  onClick={() => setActiveTab('edit')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeTab === 'edit'
                      ? 'bg-[var(--paper)] text-[var(--ochre)] font-semibold shadow-xs'
                      : 'text-[var(--ink-soft)]'
                  }`}
                >
                  <PenTool className="w-3 h-3" />
                  <span>撰写</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('preview')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded transition-all cursor-pointer ${
                    activeTab === 'preview'
                      ? 'bg-[var(--paper)] text-[var(--ochre)] font-semibold shadow-xs'
                      : 'text-[var(--ink-soft)]'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>排版预览</span>
                </button>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1 text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Restored draft banner */}
          {hasRestoredDraft && (
            <div className="flex items-center justify-between px-3.5 py-2 rounded bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_25%,transparent)] text-xs font-serif text-[var(--ochre)]">
              <span>✨ 已自动为您恢复上次撰写的未完草稿</span>
              <button
                type="button"
                onClick={handleClearDraft}
                className="flex items-center gap-1 text-[var(--ink-faint)] hover:text-[var(--cinnabar)] transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>清空草稿</span>
              </button>
            </div>
          )}

          {activeTab === 'edit' ? (
            <>
              {/* Title input */}
              <div>
                <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                  文章标题 <span className="text-[var(--cinnabar)]">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="给此刻的心绪起一个名字..."
                  className="w-full px-3.5 py-2 text-base font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                />
              </div>

              {/* Topic, Series, Author, Seal row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                    投稿专题 <span className="text-[var(--cinnabar)]">*</span>
                  </label>
                  <select
                    value={topicId}
                    onChange={(e) => setTopicId(e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors cursor-pointer"
                  >
                    {topics.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.icon} {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-[var(--ochre)]" />
                    <span>收录文集/专栏</span>
                  </label>
                  <input
                    type="text"
                    value={seriesTitle}
                    onChange={(e) => setSeriesTitle(e.target.value)}
                    placeholder="选填，如：林下夜语"
                    className="w-full px-2.5 py-2 text-xs bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                    笔名署名
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="默认：文友"
                    className="w-full px-2.5 py-2 text-xs bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                    朱砂印章 (2字)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      value={authorSeal}
                      onChange={(e) => setAuthorSeal(e.target.value)}
                      placeholder="默认前两字"
                      className="w-full px-2.5 py-2 text-xs bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                    />
                    <div className="w-8 h-8 rounded border border-[var(--cinnabar)] flex items-center justify-center text-[10px] font-serif text-[var(--cinnabar)] shrink-0 shadow-xs bg-[color-mix(in_srgb,var(--cinnabar)_5%,transparent)]">
                      {authorSeal || (author ? author.slice(0, 2) : '文友')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Golden Quote */}
              <div>
                <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--ochre)]" />
                  <span>核心金句 / 题跋引言（选填，用于读者便签展示）</span>
                </label>
                <input
                  type="text"
                  value={goldenQuote}
                  onChange={(e) => setGoldenQuote(e.target.value)}
                  placeholder="提炼一句触动人心的金句..."
                  className="w-full px-3.5 py-2 text-xs font-serif italic bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                />
              </div>

              {/* Content Body */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-serif text-[var(--ink-faint)]">
                    正文篇章 <span className="text-[var(--cinnabar)]">*</span>
                  </label>
                  <span className="text-[11px] font-serif text-[var(--ink-faint)]">
                    {wordCount} 字 · 预计 {readingTime} 分钟慢读 · 支持空行分段
                  </span>
                </div>
                <textarea
                  required
                  rows={9}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="在此安放您的长文叙事、随笔感悟或行旅札记... 每一段之间请空一行。"
                  className="w-full px-3.5 py-3 text-sm font-serif leading-relaxed bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-y"
                />
              </div>
            </>
          ) : (
            /* Live Preview Mode */
            <div className="border border-[var(--line)] rounded p-6 bg-[color-mix(in_srgb,var(--paper-deep)_25%,var(--paper))] min-h-[360px]">
              <div className="max-w-[620px] mx-auto space-y-5">
                <div className="flex items-center gap-2 text-xs font-serif text-[var(--ochre)]">
                  <span>
                    {chosenTopic.icon} {chosenTopic.name}
                  </span>
                  {seriesTitle && (
                    <span className="text-emerald-700">· 专栏连载《{seriesTitle}》</span>
                  )}
                </div>

                <h1 className="font-serif font-bold text-2xl text-[var(--ink)]">
                  {title || '（文章标题预览）'}
                </h1>

                <div className="flex items-center gap-3 text-xs font-serif text-[var(--ink-faint)] pb-3 border-b border-[var(--line)]">
                  <span>{author || '文友'}</span>
                  <span className="px-1.5 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[10px]">
                    {authorSeal || (author ? author.slice(0, 2) : '文友')}
                  </span>
                  <span>·</span>
                  <span>约 {readingTime} 分钟慢读</span>
                  <span>·</span>
                  <span>{wordCount} 字</span>
                </div>

                {goldenQuote && (
                  <div className="p-4 rounded border-l-2 border-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] text-xs font-serif italic text-[var(--ink)]">
                    “{goldenQuote}”
                  </div>
                )}

                <div className="font-serif text-sm leading-[2.1] text-[var(--ink-soft)] space-y-4 text-justify">
                  {content ? (
                    content
                      .split('\n\n')
                      .filter((p) => p.trim())
                      .map((para, i) => (
                        <p key={i} className="indent-6">
                          {para}
                        </p>
                      ))
                  ) : (
                    <p className="text-[var(--ink-faint)] italic indent-0">
                      尚未输入正文，请切换到“撰写”页面落笔...
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          {submitError && (
            <p role="alert" className="text-xs font-serif text-[var(--cinnabar)]">
              {submitError}。草稿已保留，可重试发布。
            </p>
          )}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
            <span className="text-xs font-serif text-[var(--ink-faint)] italic">
              草稿仅存本机；发布后文章公开保存于云端。
            </span>
            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-xs font-serif text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] rounded transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !title.trim() || !content.trim()}
                className="px-5 py-2 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-xs"
              >
                {isSubmitting ? '发布中…' : '发布到文友雅集'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
