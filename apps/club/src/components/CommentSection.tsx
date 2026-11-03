import { useState, useRef } from 'react';
import { Heart, Send, Sparkles, Feather, CornerDownRight, Reply } from 'lucide-react';
import type { Comment } from '../types';
import SealStamp from './SealStamp';

interface CommentSectionProps {
  /** null while the reader is open but the comments have not arrived yet. */
  comments: Comment[] | null;
  /** With comments still null: the request failed, so offer a retry rather than a spinner. */
  failed?: boolean;
  onRetry?: () => void;
  onAddComment: (
    author: string,
    content: string,
    replyToId?: string,
    replyToAuthor?: string,
  ) => Promise<void>;
  onLikeComment: (commentId: string) => Promise<void>;
}

const QUICK_TAGS = [
  '见字如晤，深有同感。',
  '行间留白，字字珠玑。',
  '慢笔深思，意境深远。',
  '此心同所悟，读罢久久沉吟。',
];

const CHINESE_NUMERALS = ['壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖', '拾'];

function formatChineseIndex(idx: number): string {
  if (idx < CHINESE_NUMERALS.length) {
    return CHINESE_NUMERALS[idx];
  }
  return String(idx + 1);
}

export default function CommentSection({
  comments: loadedComments,
  failed,
  onRetry,
  onAddComment,
  onLikeComment,
}: CommentSectionProps) {
  const comments = loadedComments ?? [];
  const [authorName, setAuthorName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [likeError, setLikeError] = useState('');
  const [pendingLikes, setPendingLikes] = useState<Record<string, boolean>>({});
  const pendingLikeIds = useRef(new Set<string>());
  const [likedCommentIds, setLikedCommentIds] = useState<Record<string, boolean>>({});

  // 答跋 / 回复交互状态
  const [activeReplyTarget, setActiveReplyTarget] = useState<{
    commentId: string; // 隶属的主题跋 ID
    targetId: string;
    author: string; // 回复的目标文友署名
  } | null>(null);
  const [replyAuthorName, setReplyAuthorName] = useState('');
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

  const effectiveAuthor = authorName.trim() || '文友';
  const effectiveSealText =
    authorName.trim().length >= 2 ? authorName.trim().slice(0, 2) : authorName.trim() || '文友';

  // 整理题跋层级结构：顶级题跋与各自主管的答跋列表
  const topLevelComments = comments.filter((c) => !c.replyToId);
  const repliesMap = comments.reduce<Record<string, Comment[]>>((acc, cur) => {
    if (cur.replyToId) {
      if (!acc[cur.replyToId]) acc[cur.replyToId] = [];
      acc[cur.replyToId].push(cur);
    }
    return acc;
  }, {});

  // 独立处理找不到父级的孤儿答跋，作为普通题跋呈现
  const orphanedReplies = comments.filter(
    (c) => c.replyToId && !comments.some((parent) => parent.id === c.replyToId),
  );
  const allRenderedTopComments = [...topLevelComments, ...orphanedReplies];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError('');
    try {
      await onAddComment(effectiveAuthor, commentText.trim());
      setCommentText('');
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : '题跋发表失败，请稍后重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReplySubmit = async (e: React.FormEvent, parentId: string, replyToAuthor: string) => {
    e.preventDefault();
    if (!replyText.trim() || isReplying) return;

    setIsReplying(true);
    setReplyError('');
    const author = replyAuthorName.trim() || authorName.trim() || '文友';
    try {
      await onAddComment(author, replyText.trim(), parentId, replyToAuthor);
      setReplyText('');
      setActiveReplyTarget(null);
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : '答跋发表失败，请重试');
    } finally {
      setIsReplying(false);
    }
  };

  const handleLike = async (commentId: string) => {
    if (likedCommentIds[commentId] || pendingLikeIds.current.has(commentId)) return;
    pendingLikeIds.current.add(commentId);
    setPendingLikes((prev) => ({ ...prev, [commentId]: true }));
    setLikeError('');
    try {
      await onLikeComment(commentId);
      setLikedCommentIds((prev) => ({ ...prev, [commentId]: true }));
    } catch {
      setLikeError('共鸣失败，请稍后重试');
    } finally {
      pendingLikeIds.current.delete(commentId);
      setPendingLikes((prev) => ({ ...prev, [commentId]: false }));
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setCommentText((prev) => {
      const trimmed = prev.trim();
      return trimmed ? `${trimmed} ${tag}` : tag;
    });
    textareaRef.current?.focus();
  };

  const startReply = (commentId: string, targetAuthor: string, targetId = commentId) => {
    setActiveReplyTarget({ commentId, targetId, author: targetAuthor });
    setReplyText('');
    setReplyError('');
    setTimeout(() => {
      replyTextareaRef.current?.focus();
    }, 50);
  };

  return (
    <section className="club-comments">
      {likeError && (
        <p role="alert" className="text-sm text-[var(--cinnabar)]">
          {likeError}
        </p>
      )}
      {/* 评注区头部：东方典雅题跋刊头 */}
      <div className="club-comments__heading">
        <div>
          <div className="club-comments__kicker">
            <span className="club-reader__section-label">读者来信</span>
          </div>
          <h3 className="club-comments__title">
            <span>文友题跋</span>
            {loadedComments && <span className="club-comments__count">{comments.length}</span>}
          </h3>
        </div>

        <div className="club-comments__intro">
          <Feather className="w-3.5 h-3.5 text-[var(--ochre)]" />
          <span>字里相逢，见字如晤</span>
        </div>
      </div>

      {/* 题跋撰写笺纸 (Scholar's Stationery Pad) */}
      <form onSubmit={handleSubmit} className="club-comments__form">
        {/* 笺纸顶部：题名署名与动态朱砂印章联动 */}
        <div className="club-comments__form-header">
          <div className="flex items-center gap-2.5">
            <span className="club-comments__field-label">署名</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="文友署名（选填）"
                aria-label="文友署名（选填）"
                maxLength={10}
                className="club-comments__name"
              />
              {/* 实时朱砂姓名印章预览 */}
              <SealStamp
                text={effectiveSealText}
                type="yang"
                size="sm"
                title={`落款印鉴：${effectiveSealText}`}
              />
            </div>
          </div>

          <div className="club-comments__public-note">
            <span>留言将公开展示</span>
          </div>
        </div>

        {/* 笺纸正文：大面积舒展输入 */}
        <div className="club-comments__form-body">
          <textarea
            ref={textareaRef}
            aria-label="题跋内容"
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下此刻的共鸣、眉批或感悟... 慢笔深思，见字如晤。"
            required
            className="club-comments__textarea"
          />

          {submitError && (
            <p role="alert" className="mt-2 text-xs text-[var(--cinnabar)]">
              ⚠️ {submitError}
            </p>
          )}

          {/* 快捷雅笺速题词与底部操作条 */}
          <div className="club-comments__form-footer">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-[var(--ink-faint)] mr-1 flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[var(--ochre)]" />
                <span>文思便签:</span>
              </span>
              {QUICK_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleQuickTagClick(tag)}
                  className="club-comments__quick-tag"
                >
                  {tag.slice(0, 4)}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="club-comments__submit"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '落款中…' : '盖印题跋'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 题跋列表：雅致笺条串联与唱和答跋 */}
      {!loadedComments ? (
        <div className="club-comments__empty">
          <p className="club-comments__empty-description" role="status">
            {failed ? '题跋暂时未能取回。' : '正在取回文友题跋…'}
          </p>
          {failed && onRetry && (
            <button type="button" onClick={onRetry} className="club-text-link">
              重新取回
            </button>
          )}
        </div>
      ) : comments.length === 0 ? (
        /* 清雅空卷意境 */
        <div className="club-comments__empty">
          <div className="club-comments__empty-seal">
            <SealStamp text="留白" type="yang" size="sm" tilt={false} />
          </div>
          <h4 className="club-comments__empty-title">案头尚留一泓清墨</h4>
          <p className="club-comments__empty-description">
            还没有人留言。写下你的感受，为这篇文章留下第一封回信。
          </p>
          <button
            type="button"
            onClick={() => textareaRef.current?.focus()}
            className="inline-flex items-center gap-1.5 text-xs font-serif text-[var(--ochre)] hover:underline cursor-pointer"
          >
            <Feather className="w-3.5 h-3.5" />
            <span>即刻提笔题跋</span>
          </button>
        </div>
      ) : (
        <div className="club-comments__list">
          {allRenderedTopComments.map((c, index) => {
            const commenterSeal = c.author.length >= 2 ? c.author.slice(0, 2) : c.author || '文友';
            const hasLikedThis = Boolean(likedCommentIds[c.id]);
            const subReplies = repliesMap[c.id] || [];
            const isReplyingToThis = activeReplyTarget?.commentId === c.id;

            return (
              <article key={c.id} className="club-comments__entry">
                {/* 题跋头部：题跋序次、印鉴、文友与发布时间 */}
                <div className="club-comments__entry-header">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* 文友专属朱砂方印 */}
                    <SealStamp
                      text={commenterSeal}
                      type="yang"
                      size="xs"
                      title={`文友印鉴：${commenterSeal}`}
                    />
                    <span className="text-xs font-serif font-medium text-[var(--ink)]">
                      {c.author}
                    </span>
                    {c.replyToAuthor && (
                      <span className="text-[11px] text-[var(--ochre)] flex items-center gap-1">
                        <span>答跋 @{c.replyToAuthor}</span>
                      </span>
                    )}
                    <span className="text-[10px] text-[var(--ink-faint)] opacity-40">·</span>
                    <span className="text-[11px] text-[var(--ink-faint)] italic">
                      {c.createdAt}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3">
                    {/* 题跋序号 */}
                    <span className="text-[10px] font-serif text-[var(--ink-faint)] tracking-wider hidden sm:inline">
                      题跋 · {formatChineseIndex(index)}
                    </span>

                    {/* 答跋（回复）触发按钮 */}
                    <button
                      type="button"
                      onClick={() => startReply(c.id, c.author)}
                      className="flex items-center gap-1 text-xs font-serif px-2 py-0.5 rounded text-[var(--ink-faint)] hover:text-[var(--ochre)] hover:bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] transition-all cursor-pointer"
                      title={`回复 ${c.author}`}
                    >
                      <Reply className="w-3.5 h-3.5" />
                      <span>答跋</span>
                    </button>

                    {/* 与君共鸣（点赞） */}
                    <button
                      type="button"
                      onClick={() => handleLike(c.id)}
                      className={`flex items-center gap-1 text-xs font-serif px-2 py-0.5 rounded transition-all cursor-pointer ${
                        hasLikedThis
                          ? 'text-[var(--cinnabar)] bg-[color-mix(in_srgb,var(--cinnabar)_8%,transparent)] font-medium'
                          : 'text-[var(--ink-faint)] hover:text-[var(--cinnabar)] hover:bg-[color-mix(in_srgb,var(--cinnabar)_5%,transparent)]'
                      }`}
                      title="与此题跋心念共鸣"
                      aria-pressed={hasLikedThis}
                      disabled={hasLikedThis || pendingLikes[c.id]}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
                          hasLikedThis ? 'fill-current text-[var(--cinnabar)]' : ''
                        }`}
                      />
                      <span className="text-[11px] font-sans">{c.likes}</span>
                    </button>
                  </div>
                </div>

                {/* 题跋正文内容 */}
                <p className="club-comments__content">{c.content}</p>

                {/* 子级回复：文友唱和 / 答跋列表 */}
                {subReplies.length > 0 && (
                  <div className="club-comments__replies">
                    <div className="text-[11px] font-serif text-[var(--ochre)] flex items-center gap-1 mb-2 select-none">
                      <CornerDownRight className="w-3 h-3" />
                      <span>文友唱和 · 答跋 ({subReplies.length})</span>
                    </div>

                    {subReplies.map((reply) => {
                      const replySeal =
                        reply.author.length >= 2
                          ? reply.author.slice(0, 2)
                          : reply.author || '文友';
                      const replyLiked = Boolean(likedCommentIds[reply.id]);

                      return (
                        <div key={reply.id} className="club-comments__reply">
                          <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                            <div className="flex items-center gap-2">
                              <SealStamp text={replySeal} type="yang" size="xs" />
                              <span className="text-xs font-serif font-medium text-[var(--ink)]">
                                {reply.author}
                              </span>
                              {reply.replyToAuthor && (
                                <span className="text-[11px] text-[var(--ink-faint)] italic">
                                  答复 @{reply.replyToAuthor}
                                </span>
                              )}
                              <span className="text-[10px] text-[var(--ink-faint)] opacity-50">
                                ·
                              </span>
                              <span className="text-[10px] text-[var(--ink-faint)] italic">
                                {reply.createdAt}
                              </span>
                            </div>

                            <div className="flex items-center gap-2">
                              {/* 针对子回复继续回复 */}
                              <button
                                type="button"
                                onClick={() => startReply(c.id, reply.author, reply.id)}
                                className="text-[11px] font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors cursor-pointer flex items-center gap-0.5"
                                title={`回复 ${reply.author}`}
                              >
                                <Reply className="w-3 h-3" />
                                <span>回复</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleLike(reply.id)}
                                className={`flex items-center gap-0.5 text-[11px] font-serif transition-all cursor-pointer ${
                                  replyLiked
                                    ? 'text-[var(--cinnabar)] font-medium'
                                    : 'text-[var(--ink-faint)] hover:text-[var(--cinnabar)]'
                                }`}
                                title="点赞答跋"
                                aria-pressed={replyLiked}
                                disabled={replyLiked || pendingLikes[reply.id]}
                              >
                                <Heart
                                  className={`w-3 h-3 ${replyLiked ? 'fill-current text-[var(--cinnabar)]' : ''}`}
                                />
                                <span className="text-[10px] font-sans">{reply.likes}</span>
                              </button>
                            </div>
                          </div>

                          <p className="club-comments__reply-content">{reply.content}</p>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* 针对当前题跋的展开式内联答跋输入纸笺 */}
                {isReplyingToThis && (
                  <form
                    onSubmit={(e) =>
                      handleReplySubmit(e, activeReplyTarget.targetId, activeReplyTarget.author)
                    }
                    className="club-comments__reply-form"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2 pb-2 border-b border-[var(--line)]/50 text-xs">
                      <div className="flex items-center gap-1.5 text-[var(--ochre)] font-serif font-medium">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>答跋 @{activeReplyTarget.author}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={replyAuthorName}
                          onChange={(e) => setReplyAuthorName(e.target.value)}
                          placeholder="您的署名（选填）"
                          aria-label="回复署名（选填）"
                          maxLength={10}
                          className="club-comments__name"
                        />
                        <SealStamp
                          text={
                            replyAuthorName.trim().slice(0, 2) ||
                            authorName.trim().slice(0, 2) ||
                            '文友'
                          }
                          type="yang"
                          size="xs"
                        />
                      </div>
                    </div>

                    <textarea
                      ref={replyTextareaRef}
                      aria-label={`回复 ${activeReplyTarget.author} 的内容`}
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`与 @${activeReplyTarget.author} 唱和相答，言简而意深...`}
                      required
                      className="club-comments__textarea"
                    />

                    {replyError && (
                      <p role="alert" className="mt-1 text-xs text-[var(--cinnabar)]">
                        ⚠️ {replyError}
                      </p>
                    )}

                    <div className="mt-2 pt-2 border-t border-[var(--line)]/40 flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReplyTarget(null);
                          setReplyText('');
                        }}
                        className="px-3 py-1 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ink)] rounded transition-colors cursor-pointer"
                      >
                        取消
                      </button>

                      <button
                        type="submit"
                        disabled={isReplying || !replyText.trim()}
                        className="club-comments__submit"
                      >
                        <Send className="w-3 h-3" />
                        <span>{isReplying ? '投递中…' : '发送答跋'}</span>
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
