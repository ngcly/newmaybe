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
    <section className="mt-12 pt-8 border-t border-[var(--line)]/50 font-serif">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-baseline gap-2">
          <h3 className="font-medium text-base sm:text-lg text-[var(--ink)] tracking-wide">
            文友评注 · 纸签回响
          </h3>
          <span className="text-xs text-[var(--ink-faint)] font-sans">({comments.length})</span>
        </div>
        <span className="text-xs text-[var(--ink-faint)] italic">慢读 · 静思 · 共鸣</span>
      </div>

      <p className="mb-3 text-xs text-[var(--ink-faint)]">
        评注发表后将公开保存，所有访客均可阅读。
      </p>

      {/* Post Comment Form - Understated Paper Note Style */}
      <form
        onSubmit={handleSubmit}
        className="mb-10 p-5 sm:p-6 rounded border border-dashed border-[var(--line)]/80 bg-[color-mix(in_srgb,var(--paper-deep)_20%,var(--paper))]"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 text-xs text-[var(--ink-soft)]">
            <span className="shrink-0 text-[var(--ink-faint)]">题名落款：</span>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="文友（选填）"
              className="px-2 py-0.5 text-xs bg-[var(--paper)] border-b border-[var(--line)] focus:border-[var(--ochre)] focus:outline-none text-[var(--ink)] font-serif max-w-[160px]"
            />
          </div>
          <span className="text-[11px] text-[var(--ink-faint)] italic">字里相逢，行间留白</span>
        </div>

        <div>
          <textarea
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下此刻的心绪、题跋或共鸣..."
            required
            className="w-full p-3 text-xs sm:text-sm bg-[var(--paper)] border border-[var(--line)]/50 rounded text-[var(--ink)] focus:border-[var(--ochre)] focus:outline-none transition-colors resize-y leading-relaxed font-serif"
          />
        </div>

        {submitError && (
          <p role="alert" className="mt-2 text-xs text-[var(--cinnabar)]">
            {submitError}
          </p>
        )}

        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[var(--ink-faint)]">
            <button
              type="button"
              onClick={() =>
                setCommentText((prev) => (prev ? prev + ' ' : '') + '见字如晤，深有同感。')
              }
              className="text-[11px] px-2 py-0.5 rounded border border-[var(--line)]/50 hover:border-[var(--ochre)] hover:text-[var(--ochre)] transition-colors cursor-pointer bg-[var(--paper)]"
            >
              「深有同感」
            </button>
            <button
              type="button"
              onClick={() =>
                setCommentText((prev) => (prev ? prev + ' ' : '') + '行间留白，字字珠玑。')
              }
              className="text-[11px] px-2 py-0.5 rounded border border-[var(--line)]/50 hover:border-[var(--ochre)] hover:text-[var(--ochre)] transition-colors cursor-pointer bg-[var(--paper)]"
            >
              「字字珠玑」
            </button>
          </div>

          <button
            type="submit"
            disabled={isSubmitting || !commentText.trim()}
            className="px-4 py-1.5 text-xs font-serif text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
          >
            发表题跋
          </button>
        </div>
      </form>

      {/* Comment List - Clean Editorial Commentary Thread (No Box Stacking) */}
      {comments.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-[var(--line)]/50 rounded text-[var(--ink-faint)] text-xs font-serif">
          暂无文友评注，落笔成为第一条回响吧。
        </div>
      ) : (
        <div className="divide-y divide-[var(--line)]/40">
          {comments.map((c) => (
            <div key={c.id} className="py-4 sm:py-5 first:pt-1">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-[var(--ink)]">{c.author}</span>
                  <span className="text-[10px] text-[var(--ink-faint)] italic opacity-70">
                    {c.createdAt}
                  </span>
                </div>
                <button
                  onClick={() => onLikeComment(c.id)}
                  className="flex items-center gap-1 text-xs text-[var(--ink-faint)] hover:text-[var(--cinnabar)] transition-colors cursor-pointer px-1.5 py-0.5 rounded hover:bg-[color-mix(in_srgb,var(--cinnabar)_5%,transparent)]"
                  title="为评注点赞"
                >
                  <Heart className="w-3 h-3 text-[var(--cinnabar)]/70" />
                  <span className="text-[11px] font-sans">{c.likes}</span>
                </button>
              </div>
              <p className="text-xs sm:text-sm text-[var(--ink-soft)] font-light leading-relaxed text-justify pl-0.5">
                {c.content}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
