import { useState } from 'react';
import { Heart } from 'lucide-react';
import type { Comment } from '../types';

interface CommentSectionProps {
  comments: Comment[];
  onAddComment: (author: string, content: string) => Promise<void>;
  onLikeComment: (commentId: string) => void;
}

export default function CommentSection({
  comments,
  onAddComment,
  onLikeComment,
}: CommentSectionProps) {
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setIsSubmitting(true);
    setSubmitError('');
    const author = authorName.trim() || '文友';
    try {
      await onAddComment(author, commentText.trim());
      setCommentText('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '评注发表失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-12 pt-10 border-t border-[var(--line)]/60">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-baseline gap-2">
          <h3 className="font-serif font-medium text-lg sm:text-xl text-[var(--ink)]">
            文友评注与回响
          </h3>
          <span className="text-xs font-serif text-[var(--ink-faint)]">({comments.length} 条)</span>
        </div>
        <span className="text-xs text-[var(--ink-faint)] font-serif italic">
          慢读 · 静思 · 共鸣
        </span>
      </div>

      {/* Post Comment Form - Refined & Blending with Paper */}
      <form
        onSubmit={handleSubmit}
        className="border border-[var(--line)]/70 bg-[var(--paper)] rounded p-5 sm:p-6 mb-10 shadow-2xs"
      >
        <div className="mb-3.5">
          <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
            您的署名 / 笔名（选填）
          </label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            placeholder="例如：林下客、青木、素子..."
            className="w-full max-w-xs px-3 py-1.5 text-xs sm:text-sm bg-[color-mix(in_srgb,var(--paper-deep)_35%,var(--paper))] border border-[var(--line)]/60 rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors font-serif"
          />
        </div>

        <div className="mb-4">
          <label className="block text-xs font-serif text-[var(--ink-faint)] mb-1">
            写下您的评语与共鸣
          </label>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="以此字句，安放此刻的心绪与回响..."
            required
            className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-[color-mix(in_srgb,var(--paper-deep)_35%,var(--paper))] border border-[var(--line)]/60 rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-y leading-relaxed font-serif"
          />
        </div>

        {submitError && (
          <p role="alert" className="mb-3 text-xs text-[var(--cinnabar)]">
            {submitError}
          </p>
        )}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            className="px-4 py-2 text-xs font-serif text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-xs"
          >
            发表纸签评注
          </button>
        </div>
      </form>

      {/* Comment List */}
      {comments.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-[var(--line)]/60 rounded text-[var(--ink-faint)] text-sm font-serif">
          暂无文友留言，落笔成为第一条回响吧。
        </div>
      ) : (
        <div className="space-y-3">
          {comments.map((c) => (
            <div
              key={c.id}
              className="p-4 sm:p-5 rounded border border-[var(--line)]/60 bg-[var(--paper)] transition-all hover:border-[var(--ochre)]/40"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-serif font-medium text-[var(--ink)]">
                    {c.author}
                  </span>
                  <span className="text-[10px] text-[var(--ink-faint)] font-serif italic">
                    {c.createdAt}
                  </span>
                </div>
                <button
                  onClick={() => onLikeComment(c.id)}
                  className="flex items-center gap-1 text-xs text-[var(--ink-faint)] hover:text-[var(--cinnabar)] transition-colors cursor-pointer"
                  title="为评注点赞"
                >
                  <Heart className="w-3 h-3 text-[var(--cinnabar)]/70" />
                  <span className="text-[11px] font-sans">{c.likes}</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[var(--ink-soft)] font-light leading-relaxed text-justify font-serif">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
