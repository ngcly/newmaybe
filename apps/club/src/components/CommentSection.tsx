import { useState, useRef } from 'react';
import { Heart, Send, Sparkles, Feather, CornerDownRight, Reply } from 'lucide-react';
import type { Comment } from '../types';
import SealStamp from './SealStamp';

interface CommentSectionProps {
  comments: Comment[];
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
  comments,
  onAddComment,
  onLikeComment,
}: CommentSectionProps) {
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
    <section className="mt-14 pt-10 border-t border-[var(--line)]/60 font-serif">
      {likeError && (
        <p role="alert" className="text-sm text-[var(--cinnabar)]">
          {likeError}
        </p>
      )}
      {/* 评注区头部：东方典雅题跋刊头 */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-serif text-[var(--ochre)] italic tracking-widest uppercase">
              Colophon & Echoes
            </span>
            <span className="text-[var(--line)]">·</span>
            <span className="text-xs text-[var(--ink-faint)]">字里相逢，行间互映</span>
          </div>
          <h3 className="font-serif font-medium text-xl sm:text-2xl text-[var(--ink)] tracking-wide flex items-center gap-2.5">
            <span>文友题跋 · 墨痕回响</span>
            <span className="text-xs font-sans font-normal px-2 py-0.5 rounded-full border border-[var(--line)] text-[var(--ink-soft)] bg-[var(--paper-deep)]/50">
              {comments.length}
            </span>
          </h3>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-[var(--ink-faint)] italic">
          <Feather className="w-3.5 h-3.5 text-[var(--ochre)]" />
          <span>提笔落款，共护文雅</span>
        </div>
      </div>

      {/* 题跋撰写笺纸 (Scholar's Stationery Pad) */}
      <form
        onSubmit={handleSubmit}
        className="mb-12 rounded border border-[var(--line)] bg-[var(--paper)] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden transition-all duration-300 focus-within:border-[var(--ochre)]/80 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
      >
        {/* 笺纸顶部：题名署名与动态朱砂印章联动 */}
        <div className="px-5 py-3.5 bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))] border-b border-[var(--line)]/60 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-[var(--ink-faint)] text-xs font-serif">题跋落款：</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={authorName}
                onChange={(e) => setAuthorName(e.target.value)}
                placeholder="文友署名（选填）"
                maxLength={10}
                className="px-2.5 py-1 text-xs bg-[var(--paper)] border border-[var(--line)]/70 rounded-xs focus:border-[var(--ochre)] focus:outline-none text-[var(--ink)] font-serif w-36 transition-colors"
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

          <div className="text-[11px] text-[var(--ink-faint)] italic hidden sm:flex items-center gap-1">
            <span>留签于此卷末 · 公开传阅</span>
          </div>
        </div>

        {/* 笺纸正文：大面积舒展输入 */}
        <div className="p-5">
          <textarea
            ref={textareaRef}
            rows={3}
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="写下此刻的共鸣、眉批或感悟... 慢笔深思，见字如晤。"
            required
            className="w-full text-xs sm:text-sm bg-transparent border-none outline-none resize-y text-[var(--ink)] placeholder:text-[var(--ink-faint)]/50 leading-[2.1] font-serif transition-colors"
          />

          {submitError && (
            <p role="alert" className="mt-2 text-xs text-[var(--cinnabar)]">
              ⚠️ {submitError}
            </p>
          )}

          {/* 快捷雅笺速题词与底部操作条 */}
          <div className="mt-4 pt-3.5 border-t border-[var(--line)]/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
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
                  className="text-[11px] font-serif px-2 py-0.5 rounded-xs border border-[var(--line)]/70 hover:border-[var(--ochre)] hover:text-[var(--ochre)] bg-[var(--paper-deep)]/40 hover:bg-[var(--paper)] text-[var(--ink-soft)] transition-colors cursor-pointer"
                >
                  {tag.slice(0, 4)}
                </button>
              ))}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !commentText.trim()}
              className="flex items-center justify-center gap-1.5 px-5 py-1.5 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs shrink-0 self-end sm:self-auto"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? '落款中…' : '盖印题跋'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* 题跋列表：雅致笺条串联与唱和答跋 */}
      {comments.length === 0 ? (
        /* 清雅空卷意境 */
        <div className="text-center py-14 px-6 border border-dashed border-[var(--line)]/60 rounded bg-[color-mix(in_srgb,var(--paper-deep)_20%,var(--paper))]">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full border border-[var(--cinnabar)]/30 flex items-center justify-center text-[var(--cinnabar)]/70 bg-[color-mix(in_srgb,var(--cinnabar)_4%,transparent)]">
            <SealStamp text="留白" type="yang" size="sm" tilt={false} />
          </div>
          <h4 className="font-serif text-sm font-medium text-[var(--ink)] mb-1">
            案头尚留一泓清墨
          </h4>
          <p className="text-xs text-[var(--ink-faint)] font-serif max-w-sm mx-auto leading-relaxed mb-4">
            此篇章暂未有文友落墨。何不挥毫题跋，留下第一抹与著者的心念回响？
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
        <div className="space-y-5">
          {allRenderedTopComments.map((c, index) => {
            const commenterSeal = c.author.length >= 2 ? c.author.slice(0, 2) : c.author || '文友';
            const hasLikedThis = Boolean(likedCommentIds[c.id]);
            const subReplies = repliesMap[c.id] || [];
            const isReplyingToThis = activeReplyTarget?.commentId === c.id;

            return (
              <article
                key={c.id}
                className="group relative bg-[var(--paper)] border border-[var(--line)]/70 hover:border-[var(--ochre)]/60 rounded p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_2px_12px_rgba(0,0,0,0.02)]"
              >
                {/* 题跋头部：题跋序次、印鉴、文友与发布时间 */}
                <div className="flex items-center justify-between gap-3 mb-3.5 pb-2.5 border-b border-[var(--line)]/40">
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
                <p className="text-xs sm:text-sm text-[var(--ink-soft)] font-light leading-[2.1] text-justify font-serif tracking-wide select-text">
                  {c.content}
                </p>

                {/* 子级回复：文友唱和 / 答跋列表 */}
                {subReplies.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)]/50 pl-3 sm:pl-4 border-l-2 border-l-[var(--ochre)]/40 ml-1 space-y-3 bg-[color-mix(in_srgb,var(--paper-deep)_20%,var(--paper))] rounded-r-xs p-3">
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
                        <div
                          key={reply.id}
                          className="pt-2 first:pt-0 border-b border-[var(--line)]/30 last:border-none pb-2.5 last:pb-0"
                        >
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

                          <p className="text-xs text-[var(--ink-soft)] leading-relaxed font-serif pl-1 text-justify">
                            {reply.content}
                          </p>
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
                    className="mt-4 p-4 rounded border border-[var(--ochre)]/60 bg-[color-mix(in_srgb,var(--paper-deep)_40%,var(--paper))] shadow-xs animate-fade-in"
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
                          maxLength={10}
                          className="px-2 py-0.5 text-xs bg-[var(--paper)] border border-[var(--line)]/70 rounded-xs focus:border-[var(--ochre)] focus:outline-none text-[var(--ink)] font-serif w-28"
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
                      rows={2}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={`与 @${activeReplyTarget.author} 唱和相答，言简而意深...`}
                      required
                      className="w-full text-xs sm:text-sm bg-transparent border-none outline-none resize-y text-[var(--ink)] placeholder:text-[var(--ink-faint)]/50 leading-[2.1] font-serif"
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
                        className="flex items-center gap-1.5 px-4 py-1 text-xs font-serif font-medium text-[var(--paper)] bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] rounded-xs transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed active:scale-95 shadow-2xs"
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
