import { useState, useEffect, useRef, useCallback } from 'react';
import {
  PenTool,
  Eye,
  RotateCcw,
  X,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Sliders,
  CloudRain,
  Wind,
  Send,
  Check,
} from 'lucide-react';
import type { Topic, Article } from '../types';
import { zenAudio } from '../lib/zenAudio';

interface WriterModalProps {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitArticle: (
    newArticle: Omit<Article, 'id' | 'likes' | 'commentsCount' | 'summary'>,
  ) => Promise<void>;
}

const STORAGE_DRAFT_KEY = 'newmaybe_club_writer_draft';
const STORAGE_FONT_SIZE_KEY = 'newmaybe_club_writer_fontsize';

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
    // Retain draft in state if storage fails
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

  // 禅意功能状态
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window === 'undefined') return 20;
    try {
      const saved = localStorage.getItem(STORAGE_FONT_SIZE_KEY);
      if (saved) return Number(saved);
    } catch {
      /* ignore */
    }
    return 20;
  });
  const [isRainActive, setIsRainActive] = useState(false);
  const [isWindActive, setIsWindActive] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState<string>('');

  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null);

  // 挂载与卸载时清理白噪音
  useEffect(() => {
    return () => {
      zenAudio.stopAll();
    };
  }, []);

  // 动态保存字号偏好
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_FONT_SIZE_KEY, String(fontSize));
    } catch {
      /* ignore */
    }
  }, [fontSize]);

  // 沉浸打字状态逻辑：输入时自动淡出周边界面，停笔 2.5 秒或晃动鼠标时优雅浮现
  const handleTypingActivity = useCallback(() => {
    setIsTyping(true);
    if (typingTimerRef.current) {
      clearTimeout(typingTimerRef.current);
    }
    typingTimerRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 2500);
  }, []);

  // 监听鼠标移动，及时恢复界面元素显示
  useEffect(() => {
    const handleMouseMove = () => {
      setIsTyping(false);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (isSubmitting) return;
    zenAudio.stopAll();
    setIsRainActive(false);
    setIsWindActive(false);
    persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
    onClose();
  }, [
    isSubmitting,
    title,
    author,
    authorSeal,
    topicId,
    seriesTitle,
    goldenQuote,
    content,
    onClose,
  ]);

  // 键盘快捷键监听 (Esc 退出或关闭抽屉)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isDrawerOpen) {
          setIsDrawerOpen(false);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDrawerOpen, handleClose]);

  // 草稿自动存盘
  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
      const now = new Date();
      setLastSavedTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [isOpen, title, author, authorSeal, topicId, seriesTitle, goldenQuote, content]);

  if (!isOpen) return null;

  // 字数与阅读时长统计
  const cleanText = content.trim();
  const wordCount = cleanText ? cleanText.replace(/[\s\p{P}]/gu, '').length : 0;
  const readingTime = Math.max(1, Math.ceil(wordCount / 140));
  const chosenTopic = topics.find((t) => t.id === topicId) || topics[0];
  const effectiveSeal = authorSeal.trim() || (author.trim() ? author.trim().slice(0, 2) : '文友');

  const handleToggleRain = () => {
    const active = zenAudio.toggleRain();
    setIsRainActive(active);
  };

  const handleToggleWind = () => {
    const active = zenAudio.toggleWind();
    setIsWindActive(active);
  };

  const handleClearDraft = () => {
    if (window.confirm('确定要清空当前草稿内容吗？此操作不可逆。')) {
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
      setIsDrawerOpen(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim()) {
      setActiveTab('edit');
      titleInputRef.current?.focus();
      setSubmitError('请先题写文章标题');
      return;
    }
    if (!content.trim()) {
      setActiveTab('edit');
      contentTextareaRef.current?.focus();
      setSubmitError('正文尚无落墨，请先安放您的文字');
      return;
    }
    if (isSubmitting) return;

    const today = new Date().toISOString().split('T')[0];
    setIsSubmitting(true);
    setSubmitError('');

    try {
      await onSubmitArticle({
        title: title.trim(),
        content: content.trim(),
        author: author.trim() || '文友',
        authorSeal: effectiveSeal,
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

      zenAudio.stopAll();
      try {
        localStorage.removeItem(STORAGE_DRAFT_KEY);
      } catch {
        /* ignore */
      }
      onClose();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '投稿失败，请稍后重试');
      persistDraft({ title, author, authorSeal, topicId, seriesTitle, goldenQuote, content });
    } finally {
      setIsSubmitting(false);
    }
  };

  // 打字沉浸时，顶部控制栏与底部状态栏徐徐隐退
  const shouldFadeChrome = isTyping && !isDrawerOpen && activeTab === 'edit';

  return (
    <div className="fixed inset-0 z-50 bg-[var(--paper)] text-[var(--ink)] flex flex-col overflow-hidden select-text animate-fade-in">
      {/* 顶部控制与沉浸导航栏 */}
      <header
        className={`shrink-0 z-30 px-4 sm:px-8 py-3 border-b border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md flex flex-wrap lg:flex-nowrap items-center justify-between gap-x-3 gap-y-2 transition-opacity duration-700 ease-in-out ${
          shouldFadeChrome ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        {/* 左侧：返回与禅意书房标识 */}
        <div className="flex flex-1 items-center gap-3 min-w-0">
          <button
            type="button"
            onClick={handleClose}
            className="flex shrink-0 items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-serif text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)] transition-colors cursor-pointer"
            title="存为草稿并返回"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">暂存退出</span>
          </button>

          <div className="h-4 w-[1px] bg-[var(--line)] hidden sm:block" />

          <div className="flex items-center gap-2 truncate">
            <span className="font-serif font-medium text-sm text-[var(--ink)] tracking-wide truncate">
              文友雅集 · 禅意写作室
            </span>
            {lastSavedTime && (
              <span className="hidden md:inline-block text-[11px] font-serif text-[var(--ink-faint)]">
                · {lastSavedTime} 自动暂存
              </span>
            )}
          </div>
        </div>

        {/* 中间：撰写 / 预览 双模切换 */}
        <div className="flex items-center border border-[var(--line)] rounded-sm p-0.5 bg-[var(--paper-deep)] text-xs font-serif shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('edit')}
            className={`flex items-center gap-1 px-3 py-1 rounded-xs transition-all cursor-pointer ${
              activeTab === 'edit'
                ? 'bg-[var(--paper)] text-[var(--ochre)] font-semibold shadow-2xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>撰写</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1 px-3 py-1 rounded-xs transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-[var(--paper)] text-[var(--ochre)] font-semibold shadow-2xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>排版预览</span>
          </button>
        </div>

        {/* 右侧：白噪音、字号、印跋抽屉与发布 */}
        <div className="flex w-full lg:w-auto items-center justify-between lg:justify-start gap-2 sm:gap-3 shrink-0">
          {/* 字号滑块调节 (仅撰写模式) */}
          {activeTab === 'edit' && (
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded border border-[var(--line)]/60 bg-[var(--paper-deep)]/60 text-xs font-serif text-[var(--ink-soft)]">
              <Sliders className="w-3 h-3 text-[var(--ink-faint)]" />
              <span>字号</span>
              <input
                type="range"
                min={16}
                max={28}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="w-16 h-1 accent-[var(--ochre)] cursor-pointer"
                title={`当前字号: ${fontSize}px`}
                aria-label="调节正文字号"
              />
              <span className="text-[10px] w-6 font-mono text-[var(--ink-faint)]">{fontSize}</span>
            </div>
          )}

          {/* 白噪音引擎：雨声与微风 */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleToggleRain}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded transition-all cursor-pointer border ${
                isRainActive
                  ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] font-medium shadow-2xs'
                  : 'text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ochre)] hover:text-[var(--ochre)] bg-[var(--paper)]'
              }`}
              title="切换实时雨声白噪音（Web Audio 原生合成）"
            >
              <CloudRain className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">雨声</span>
            </button>
            <button
              type="button"
              onClick={handleToggleWind}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-serif rounded transition-all cursor-pointer border ${
                isWindActive
                  ? 'bg-[var(--ochre)] text-[var(--paper)] border-[var(--ochre)] font-medium shadow-2xs'
                  : 'text-[var(--ink-soft)] border-[var(--line)] hover:border-[var(--ochre)] hover:text-[var(--ochre)] bg-[var(--paper)]'
              }`}
              title="切换清凉微风白噪音（Web Audio 原生合成）"
            >
              <Wind className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">微风</span>
            </button>
          </div>

          {/* 印跋与收录设置抽屉触发 */}
          <button
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-serif rounded border transition-colors cursor-pointer ${
              isDrawerOpen
                ? 'bg-[var(--paper-deep)] border-[var(--ochre)] text-[var(--ochre)]'
                : 'border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)] hover:text-[var(--ink)] bg-[var(--paper)]'
            }`}
            title="配置投稿专题、专栏连载、笔名印章与题跋金句"
          >
            <BookOpen className="w-3.5 h-3.5 text-[var(--ochre)]" />
            <span className="hidden sm:inline">文卷印跋</span>
            <span className="px-1 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[9px] font-serif leading-none">
              {effectiveSeal}
            </span>
          </button>

          {/* 发布按钮 */}
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isSubmitting || !title.trim() || !content.trim()}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shadow-xs active:scale-95"
            title="发布到文友雅集"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{isSubmitting ? '发布中…' : '发布篇章'}</span>
          </button>
        </div>
      </header>

      {/* 草稿恢复提示横条 (轻量呼吸感) */}
      {hasRestoredDraft && (
        <div className="shrink-0 flex items-center justify-between px-6 py-1.5 bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border-b border-[color-mix(in_srgb,var(--ochre)_20%,transparent)] text-xs font-serif text-[var(--ochre)]">
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3 h-3" />
            <span>已自动为您恢复上次未完草稿</span>
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleClearDraft}
              className="flex items-center gap-1 text-[var(--ink-faint)] hover:text-[var(--cinnabar)] transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>清空草稿</span>
            </button>
            <button
              type="button"
              onClick={() => setHasRestoredDraft(false)}
              className="text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* 错误提示横条 */}
      {submitError && (
        <div
          role="alert"
          className="shrink-0 flex items-center justify-between px-6 py-2 bg-[color-mix(in_srgb,var(--cinnabar)_10%,transparent)] border-b border-[var(--cinnabar)]/30 text-xs font-serif text-[var(--cinnabar)]"
        >
          <span>⚠️ {submitError}</span>
          <button
            type="button"
            onClick={() => setSubmitError('')}
            className="text-[var(--cinnabar)] hover:opacity-70 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 主体视区 */}
      <main className="flex-1 flex flex-col overflow-y-auto relative">
        {activeTab === 'edit' ? (
          /* 禅意宣纸书写空间 */
          <div className="flex-1 flex flex-col justify-start max-w-3xl w-full mx-auto px-6 sm:px-12 py-8 sm:py-12">
            {/* 顶栏轻量元信息注脚（点击可唤起抽屉） */}
            <div className="flex flex-wrap items-center gap-2 mb-4 text-xs font-serif text-[var(--ink-faint)] select-none">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-[var(--paper-deep)] text-[var(--ochre)] transition-colors cursor-pointer"
                title="更换专题"
              >
                <span>{chosenTopic.icon}</span>
                <span>{chosenTopic.name}</span>
              </button>
              {seriesTitle && (
                <>
                  <span>·</span>
                  <button
                    type="button"
                    onClick={() => setIsDrawerOpen(true)}
                    className="hover:underline text-[var(--ink-soft)] cursor-pointer"
                  >
                    《{seriesTitle}》
                  </button>
                </>
              )}
              <span>·</span>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(true)}
                className="flex items-center gap-1 hover:text-[var(--ink)] cursor-pointer"
              >
                <span>{author || '文友'}</span>
                <span className="px-1 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[9px]">
                  {effectiveSeal}
                </span>
              </button>
              <span className="ml-auto text-[11px] text-[var(--ink-faint)] italic hidden sm:inline">
                慢笔深思，安放此刻呼吸
              </span>
            </div>

            {/* 大标题无框输入 */}
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                handleTypingActivity();
              }}
              onFocus={handleTypingActivity}
              placeholder="在此处题写文章标题..."
              className="w-full text-2xl sm:text-3xl lg:text-4xl font-serif font-bold text-[var(--ink)] placeholder:text-[var(--ink-faint)]/40 bg-transparent border-none outline-none pb-4 border-b border-transparent focus:border-[var(--line)]/50 transition-colors tracking-wide"
            />

            {/* 金句预览提醒（如已填写） */}
            {goldenQuote && (
              <div
                onClick={() => setIsDrawerOpen(true)}
                className="mt-4 p-3 rounded-xs border-l-2 border-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_6%,transparent)] text-xs font-serif italic text-[var(--ink-soft)] cursor-pointer group"
                title="点击编辑题跋金句"
              >
                <span className="text-[var(--ochre)] font-normal mr-1">“题跋金句”</span>
                {goldenQuote}
              </div>
            )}

            {/* 禅意正文书写纸张 */}
            <div className="flex-1 flex flex-col mt-6">
              <textarea
                ref={contentTextareaRef}
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  handleTypingActivity();
                }}
                onFocus={handleTypingActivity}
                style={{ fontSize: `${fontSize}px`, lineHeight: 2.05 }}
                placeholder="在此落墨起笔... 输入时所有工具条将徐徐隐去，停止输入或晃动鼠标即可再次唤醒。两行回车即为分段。"
                className="w-full flex-1 min-h-[460px] bg-transparent border-none outline-none resize-none font-serif text-[var(--ink)] placeholder:text-[var(--ink-faint)]/40 text-justify tracking-wide transition-all"
              />
            </div>
          </div>
        ) : (
          /* 排版预览模式 (完整模拟文友雅集阅读排版) */
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 sm:px-10 py-10 sm:py-16">
            <div className="flex items-center gap-2 text-xs font-serif text-[var(--ochre)] mb-4">
              <span>
                {chosenTopic.icon} {chosenTopic.name}
              </span>
              {seriesTitle && (
                <span className="text-[var(--bamboo)]">· 专栏连载《{seriesTitle}》</span>
              )}
            </div>

            <h1 className="font-serif font-bold text-2xl sm:text-3xl text-[var(--ink)] leading-snug mb-5">
              {title || '（文章标题预览）'}
            </h1>

            <div className="flex items-center gap-3 text-xs font-serif text-[var(--ink-faint)] pb-5 border-b border-[var(--line)] mb-6">
              <span className="text-[var(--ink)]">{author || '文友'}</span>
              <span className="px-1.5 py-0.2 rounded border border-[var(--cinnabar)] text-[var(--cinnabar)] text-[10px]">
                {effectiveSeal}
              </span>
              <span>·</span>
              <span>约 {readingTime} 分钟慢读</span>
              <span>·</span>
              <span>{wordCount} 字</span>
            </div>

            {goldenQuote && (
              <div className="p-4 rounded border-l-2 border-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] text-sm font-serif italic text-[var(--ink)] mb-8 leading-relaxed">
                “{goldenQuote}”
              </div>
            )}

            <div
              className="font-serif text-[var(--ink-soft)] space-y-6 text-justify"
              style={{ fontSize: `${fontSize}px`, lineHeight: 2.1 }}
            >
              {content ? (
                content
                  .split('\n\n')
                  .filter((p) => p.trim())
                  .map((para, i) => (
                    <p key={i} className="indent-8 tracking-wide">
                      {para}
                    </p>
                  ))
              ) : (
                <p className="text-[var(--ink-faint)] italic indent-0">
                  正文尚无落墨，请切换至“撰写”页面开始落笔...
                </p>
              )}
            </div>

            <div className="mt-16 pt-8 border-t border-dashed border-[var(--line)] text-center text-xs font-serif text-[var(--ink-faint)]">
              — 文友雅集 · 慢节奏阅读排版预览 —
            </div>
          </div>
        )}
      </main>

      {/* 底部禅意状态栏 */}
      <footer
        className={`shrink-0 px-6 sm:px-12 py-3 border-t border-[var(--line)] bg-[var(--paper)]/90 backdrop-blur-md flex flex-wrap gap-x-4 gap-y-1 items-center justify-between text-xs font-serif text-[var(--ink-faint)] transition-opacity duration-700 ease-in-out ${
          shouldFadeChrome ? 'opacity-0 pointer-events-none' : 'opacity-100 pointer-events-auto'
        }`}
      >
        <div className="flex items-center gap-4">
          <span className="text-[var(--ink-soft)] font-medium">字数：{wordCount}</span>
          <span>·</span>
          <span>预计 {readingTime} 分钟慢读</span>
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">空行即自动分段</span>
        </div>

        <div className="hidden md:flex items-center gap-2 italic text-[var(--ink-faint)]">
          <span>提笔沉思，字落心安</span>
        </div>

        <div className="flex items-center gap-3">
          <span>{lastSavedTime ? `已自动存盘 (${lastSavedTime})` : '本地自动暂存已就绪'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500/80 inline-block animate-pulse" />
        </div>
      </footer>

      {/* 右侧滑出：文卷印跋与收录设置抽屉 */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end animate-fade-in">
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-xs transition-opacity"
            onClick={() => setIsDrawerOpen(false)}
          />

          {/* 抽屉主板 */}
          <div
            className="relative w-full max-w-md bg-[var(--paper)] border-l border-[var(--line)] shadow-2xl h-full flex flex-col z-10 animate-slide-in-right overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 抽屉头部 */}
            <div className="shrink-0 p-5 border-b border-[var(--line)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[var(--ochre)]" />
                <h3 className="font-serif font-semibold text-base text-[var(--ink)]">
                  文卷与印跋设置
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-1 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 抽屉表单设置项 */}
            <div className="flex-1 p-5 space-y-6">
              {/* 1. 投稿专题分类 */}
              <div>
                <label className="block text-xs font-serif font-medium text-[var(--ink)] mb-2">
                  投稿专题分类 <span className="text-[var(--cinnabar)]">*</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {topics.map((t) => {
                    const isSelected = t.id === topicId;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setTopicId(t.id)}
                        className={`p-2.5 rounded border text-left flex items-start gap-2 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-[color-mix(in_srgb,var(--ochre)_10%,transparent)] border-[var(--ochre)] text-[var(--ochre)] shadow-2xs font-medium'
                            : 'border-[var(--line)] hover:border-[var(--ochre)]/50 text-[var(--ink-soft)] bg-[var(--paper-deep)]/40'
                        }`}
                      >
                        <span className="text-base">{t.icon}</span>
                        <div className="min-w-0">
                          <div className="text-xs font-serif truncate">{t.name}</div>
                          <div className="text-[10px] text-[var(--ink-faint)] truncate">
                            {t.desc}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. 收录专栏文集 */}
              <div>
                <label className="block text-xs font-serif font-medium text-[var(--ink)] mb-1.5 flex items-center gap-1">
                  <span>收录文集 / 专栏连载</span>
                  <span className="text-[10px] text-[var(--ink-faint)]">（选填）</span>
                </label>
                <input
                  type="text"
                  value={seriesTitle}
                  onChange={(e) => setSeriesTitle(e.target.value)}
                  placeholder="如：林下夜语、旧书微光..."
                  className="w-full px-3 py-2 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                />
                <p className="text-[11px] font-serif text-[var(--ink-faint)] mt-1">
                  填写后将在文集连载流中成卷聚合展示。
                </p>
              </div>

              {/* 3. 笔名与朱砂印章 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-serif font-medium text-[var(--ink)] mb-1.5">
                    笔名署名
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="默认：文友"
                    className="w-full px-3 py-2 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-serif font-medium text-[var(--ink)] mb-1.5">
                    朱砂印章 (两字)
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      maxLength={2}
                      value={authorSeal}
                      onChange={(e) => setAuthorSeal(e.target.value)}
                      placeholder="默认取前两字"
                      className="w-full px-3 py-2 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
                    />
                    <div
                      className="w-8 h-8 rounded border border-[var(--cinnabar)] flex items-center justify-center text-[10px] font-serif text-[var(--cinnabar)] shrink-0 shadow-2xs bg-[color-mix(in_srgb,var(--cinnabar)_5%,transparent)] select-none"
                      title="印章落款效果预览"
                    >
                      {effectiveSeal}
                    </div>
                  </div>
                </div>
              </div>

              {/* 4. 核心金句 / 题跋引言 */}
              <div>
                <label className="block text-xs font-serif font-medium text-[var(--ink)] mb-1.5 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[var(--ochre)]" />
                  <span>核心金句 / 题跋引言</span>
                  <span className="text-[10px] text-[var(--ink-faint)]">（选填）</span>
                </label>
                <textarea
                  rows={2}
                  value={goldenQuote}
                  onChange={(e) => setGoldenQuote(e.target.value)}
                  placeholder="提炼一句触动人心的金句，将用于读者便签与卡片摘录展示..."
                  className="w-full px-3 py-2 text-xs font-serif italic bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-none"
                />
              </div>

              {/* 5. 草稿管理 */}
              <div className="pt-4 border-t border-[var(--line)]">
                <button
                  type="button"
                  onClick={handleClearDraft}
                  className="flex items-center gap-1.5 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--cinnabar)] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>清空当前草稿并重置</span>
                </button>
              </div>
            </div>

            {/* 抽屉底部完成按钮 */}
            <div className="shrink-0 p-4 border-t border-[var(--line)] bg-[var(--paper)]">
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="w-full py-2 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Check className="w-4 h-4" />
                <span>确认文卷设置</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
