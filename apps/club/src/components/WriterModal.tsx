import { useState } from 'react';
import type { Topic, Article } from '../types';

interface WriterModalProps {
  topics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSubmitArticle: (newArticle: Omit<Article, 'id' | 'likes' | 'commentsCount'>) => void;
}

export default function WriterModal({
  topics,
  isOpen,
  onClose,
  onSubmitArticle,
}: WriterModalProps) {
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [authorSeal, setAuthorSeal] = useState('');
  const [topicId, setTopicId] = useState(topics[0]?.id || 'deep-night');
  const [content, setContent] = useState('');

  if (!isOpen) return null;

  const wordCount = content.trim().length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 120));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    const chosenTopic = topics.find((t) => t.id === topicId) || topics[0];
    const summary =
      content
        .split('\n')
        .find((l) => l.trim().length > 10)
        ?.slice(0, 80) || content.slice(0, 60);

    const today = new Date().toISOString().split('T')[0];

    onSubmitArticle({
      title: title.trim(),
      summary: summary.trim() + '...',
      content: content.trim(),
      author: author.trim() || '文友',
      authorSeal: authorSeal.trim() || (author.trim() ? author.trim().slice(0, 2) : '未定'),
      topicId: chosenTopic.id,
      topicName: chosenTopic.name,
      pubDate: today,
      readingTime,
      wordCount,
      isUserCreated: true,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl bg-[var(--paper)] border border-[var(--line)] rounded-sm shadow-xl p-6 md:p-8 max-h-[90vh] overflow-y-auto flex flex-col justify-between"
        onClick={(e) => e.stopPropagation()}
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-[var(--line)]">
            <div className="flex items-center gap-2">
              <span className="text-xl">✍️</span>
              <h2 className="font-serif font-semibold text-xl text-[var(--ink)]">
                即刻落笔 · 撰写文稿
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer"
            >
              ✕ 关闭
            </button>
          </div>

          {/* Title */}
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

          {/* Topic & Author row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                投稿专题 <span className="text-[var(--cinnabar)]">*</span>
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full px-3 py-2 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors cursor-pointer"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.icon} {t.name}
                  </option>
                ))}
              </select>
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
                className="w-full px-3 py-2 text-xs bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
                印章字样 (2字)
              </label>
              <input
                type="text"
                maxLength={2}
                value={authorSeal}
                onChange={(e) => setAuthorSeal(e.target.value)}
                placeholder="默认：未定"
                className="w-full px-3 py-2 text-xs bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Body Content */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-serif text-[var(--ink-faint)]">
                正文内容 <span className="text-[var(--cinnabar)]">*</span>
              </label>
              <span className="text-[11px] font-serif text-[var(--ink-faint)]">
                {wordCount} 字 · 预计 {readingTime} 分钟阅读
              </span>
            </div>
            <textarea
              required
              rows={8}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此处写下您的文章、段落与思考... 支持换行分段。"
              className="w-full px-3.5 py-3 text-sm font-serif leading-relaxed bg-[var(--paper-deep)] border border-[var(--line)] rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-y"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between pt-4 border-t border-[var(--line)]">
            <span className="text-xs font-serif text-[var(--ink-faint)] italic">
              字里相逢，行间留白。
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-[var(--ink-soft)] hover:bg-[var(--paper-deep)] rounded transition-colors cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!title.trim() || !content.trim()}
                className="px-5 py-2 text-xs font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-sm"
              >
                发布到文友雅集
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
