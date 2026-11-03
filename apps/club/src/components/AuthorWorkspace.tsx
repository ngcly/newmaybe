import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  FileText,
  Mail,
  PenLine,
  Plus,
  RefreshCw,
} from 'lucide-react';
import { AuthorAPI, AuthorAPIError, manuscriptBackupKey } from '../lib/author-api';
import type { AuthorAccount, Manuscript, ManuscriptDraft, ManuscriptRevision } from '../types';
import { TOPICS } from '../data/topics';
import { featuredCatalog } from '../lib/featured';
import WriterModal from './WriterModal';
import './author-workspace.css';

const statusNames = {
  draft: '草稿',
  pending: '待审核',
  changes_requested: '需修改',
  published: '已发布',
  withdrawn: '已撤回',
};
function message(error: unknown) {
  return error instanceof Error ? error.message : '操作未完成，请重试';
}
function cleanDraft(value: ManuscriptDraft): ManuscriptDraft {
  return {
    title: value.title.trim(),
    content: value.content.trim(),
    topicId: value.topicId,
    authorSeal: value.authorSeal.trim(),
    seriesTitle: value.seriesTitle.trim(),
    goldenQuote: value.goldenQuote.trim(),
  };
}
function EditorSession({
  manuscript,
  user,
  initial,
  onClose,
}: {
  manuscript: Manuscript;
  user: AuthorAccount;
  initial: ManuscriptDraft;
  onClose: () => void;
}) {
  const version = useRef(manuscript.version);
  const saved = useRef(JSON.stringify(cleanDraft(manuscript.draft)));
  const queue = useRef(Promise.resolve());
  const blocked = useRef<Error | null>(null);
  const storageKey = manuscriptBackupKey(user.id, manuscript.id);
  const getVersion = useCallback(() => version.current, []);
  const save = useCallback(
    (input: ManuscriptDraft) => {
      const draft = cleanDraft(input);
      const task = queue.current
        .catch(() => {})
        .then(async () => {
          if (blocked.current) throw blocked.current;
          if (JSON.stringify(draft) === saved.current) return;
          try {
            const { manuscript: result } = await AuthorAPI.save(
              manuscript.id,
              version.current,
              draft,
            );
            version.current = result.version;
            saved.current = JSON.stringify(cleanDraft(result.draft));
            try {
              const backup = JSON.parse(localStorage.getItem(storageKey) || 'null');
              if (backup)
                localStorage.setItem(
                  storageKey,
                  JSON.stringify({ ...backup, version: result.version }),
                );
            } catch {
              /* Editor still has the draft if local backup is unavailable. */
            }
          } catch (error) {
            if (error instanceof AuthorAPIError && [401, 409].includes(error.status))
              blocked.current = error;
            throw error;
          }
        });
      queue.current = task;
      return task;
    },
    [manuscript.id, storageKey],
  );
  return (
    <WriterModal
      topics={TOPICS}
      isOpen
      initialDraft={{ ...initial, author: user.penName }}
      storageKey={storageKey}
      getVersion={getVersion}
      onSave={save}
      onClose={onClose}
      onSubmitArticle={async (draft) => {
        await save({
          ...draft,
          authorSeal: draft.authorSeal || '',
          seriesTitle: draft.seriesTitle || '',
          goldenQuote: draft.goldenQuote || '',
        });
        await AuthorAPI.action(manuscript.id, version.current, 'submit');
      }}
    />
  );
}

export default function AuthorWorkspace() {
  const admin = window.location.pathname === '/admin';
  const [user, setUser] = useState<AuthorAccount | null>(null);
  const [items, setItems] = useState<Manuscript[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [challenge, setChallenge] = useState('');
  const [code, setCode] = useState('');
  const [penName, setPenName] = useState('');
  const [editor, setEditor] = useState<{ manuscript: Manuscript; initial: ManuscriptDraft } | null>(
    null,
  );
  const [recovery, setRecovery] = useState<{
    manuscript: Manuscript;
    draft: ManuscriptDraft;
  } | null>(null);
  const [detail, setDetail] = useState<Manuscript | null>(null);
  const [revisions, setRevisions] = useState<ManuscriptRevision[]>([]);
  const [note, setNote] = useState('');
  const [filter, setFilter] = useState('all');
  const [nextOffset, setNextOffset] = useState<number | null>(null);
  const loadVersion = useRef(0);
  const refresh = useCallback(async () => {
    const version = ++loadVersion.current;
    const { user: current } = await AuthorAPI.me();
    const result =
      current && (!admin || current.isAdmin) ? await AuthorAPI.list(admin, 0, filter) : null;
    if (version !== loadVersion.current) return;
    setUser(current);
    setPenName(current?.penName || '');
    setItems(result?.manuscripts || []);
    setNextOffset(result?.nextOffset ?? null);
  }, [admin, filter]);
  useEffect(() => {
    document.title = `${admin ? '投稿审核' : '我的文稿'} · 文友雅集`;
    void refresh()
      .catch((failure) => setError(message(failure)))
      .finally(() => setLoading(false));
  }, [refresh, admin]);
  const perform = async (action: () => Promise<void>) => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
    } catch (failure) {
      setError(message(failure));
    } finally {
      setBusy(false);
    }
  };
  const open = async (id: string) => {
    const { manuscript } = await AuthorAPI.get(id);
    const initial = manuscript.draft;
    try {
      const backup = JSON.parse(localStorage.getItem(manuscriptBackupKey(user!.id, id)) || 'null');
      if (
        backup?.draft &&
        typeof backup.draft.content === 'string' &&
        typeof backup.draft.title === 'string' &&
        JSON.stringify(cleanDraft({ ...initial, ...backup.draft })) !==
          JSON.stringify(cleanDraft(initial))
      ) {
        setRecovery({ manuscript, draft: { ...initial, ...backup.draft } });
        return;
      }
    } catch {
      /* A malformed backup must not block the cloud document. */
    }
    setEditor({ manuscript, initial });
  };
  const inspect = async (id: string) => {
    setDetail((await AuthorAPI.get(id, admin)).manuscript);
    setRevisions((await AuthorAPI.revisions(id, admin)).revisions);
    setNote('');
  };
  const change = async (item: Manuscript, action: string) => {
    if (
      action === 'withdraw' &&
      !window.confirm('撤回后原文及关联精选作品将停止公开，重新发布需要审核。确认撤回？')
    )
      return;
    await AuthorAPI.action(item.id, item.version, action, admin, note);
    setDetail(null);
    await refresh();
    setNotice(
      action === 'approve'
        ? '审核通过，文章已公开。'
        : action === 'reject'
          ? '已退回并附上修改意见。'
          : '文稿状态已更新。',
    );
  };
  return (
    <div className="author-space">
      <header className="author-top">
        <a href="/" className="author-brand">
          <ArrowLeft size={15} aria-hidden="true" />
          <span className="author-brand-seal" aria-hidden="true">
            文
          </span>
          文友雅集
        </a>
        <nav aria-label="作者导航">
          <a href="/me" aria-current={!admin ? 'page' : undefined}>
            我的文稿
          </a>
          {user?.isAdmin && (
            <a href="/admin" aria-current={admin ? 'page' : undefined}>
              投稿审核
            </a>
          )}
          <a href="/featured">
            一期一文 <ArrowUpRight size={13} aria-hidden="true" />
          </a>
        </nav>
      </header>
      <main className="author-main">
        <div className="author-heading">
          <div>
            <p className="author-kicker">
              文友雅集 <span aria-hidden="true">/</span> {admin ? '编辑来信' : '写作空间'}
            </p>
            <h1>{admin ? '投稿审核' : '我的文稿'}</h1>
            <p className="author-intro">
              {admin
                ? '认真读完每一篇文字，让反馈也成为写作的一部分。'
                : '把未完成的念头留在这里，慢慢写成篇章。'}
            </p>
          </div>
          <span className="author-heading-note" aria-hidden="true">
            一字一句，皆有回响。
          </span>
        </div>
        {error && (
          <p role="alert" className="author-message author-message-error">
            {error}
          </p>
        )}
        {notice && (
          <p role="status" className="author-message author-message-success">
            {notice}
          </p>
        )}
        {loading ? (
          <p role="status" className="author-loading">
            <BookOpen size={22} aria-hidden="true" />
            正在打开写作空间…
          </p>
        ) : !user ? (
          <section className="author-login">
            <div className="author-login-invitation">
              <p className="author-kicker">留一张书桌，给想写字的你</p>
              <p className="author-login-title">
                让文字落笔，
                <br />
                让心事有处安放。
              </p>
              <p className="author-login-description">
                一篇未完成的随笔，一首还在斟酌的诗。
                <br />
                不必急着成篇，从第一行开始。
              </p>
              <ul className="author-login-features">
                <li>
                  <FileText size={17} aria-hidden="true" />
                  <span>
                    草稿随时续写<span>在自己的节奏里，慢慢完成。</span>
                  </span>
                </li>
                <li>
                  <PenLine size={17} aria-hidden="true" />
                  <span>
                    以笔名相识<span>让读者先认识你的文字。</span>
                  </span>
                </li>
                <li>
                  <BookOpen size={17} aria-hidden="true" />
                  <span>
                    让作品被认真阅读<span>提交审阅后，与文友分享。</span>
                  </span>
                </li>
              </ul>
              <span className="author-login-folio" aria-hidden="true">
                文 / 字 / 有 / 回 / 响
              </span>
            </div>
            <div className="author-login-form">
              <span className="author-login-mark" aria-hidden="true">
                <Mail size={22} strokeWidth={1.4} />
              </span>
              <p className="author-kicker">以邮箱为笺 · 无需密码</p>
              <h2>登录后，继续你的写作</h2>
              <p className="author-login-description">
                首次验证邮箱即创建账号。邮箱仅用于登录，公开署名使用笔名。
              </p>
              <ol className="author-login-steps" aria-label="登录步骤">
                <li
                  aria-current={!challenge ? 'step' : undefined}
                  className={!challenge ? 'is-current' : 'is-complete'}
                >
                  <span>01</span>填写邮箱
                </li>
                <li
                  aria-current={challenge ? 'step' : undefined}
                  className={challenge ? 'is-current' : undefined}
                >
                  <span>02</span>验证登录
                </li>
              </ol>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(async () => {
                    if (!challenge) {
                      const response = await AuthorAPI.code(email.trim());
                      setChallenge(response.challengeId);
                      setNotice('验证码已发送，10 分钟内有效。');
                    } else {
                      await AuthorAPI.verify(email.trim(), challenge, code);
                      setCode('');
                      setChallenge('');
                      await refresh();
                    }
                  });
                }}
              >
                <label>
                  邮箱
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    required
                    value={email}
                    disabled={busy || Boolean(challenge)}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
                {challenge && (
                  <label>
                    六位验证码
                    <input
                      autoComplete="one-time-code"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="请输入 6 位数字"
                      className="author-code-input"
                      required
                      value={code}
                      disabled={busy}
                      onChange={(event) => setCode(event.target.value)}
                    />
                  </label>
                )}
                <div className="author-actions">
                  <button className="author-button-primary" disabled={busy} type="submit">
                    {busy ? '请稍候…' : challenge ? '验证并登录' : '发送验证码'}
                  </button>
                  {challenge && (
                    <button
                      type="button"
                      className="author-button-quiet"
                      disabled={busy}
                      onClick={() => {
                        setChallenge('');
                        setCode('');
                        setNotice('可修改邮箱或重新发送，发送间隔至少 60 秒。');
                      }}
                    >
                      更换邮箱 / 重新获取
                    </button>
                  )}
                </div>
              </form>
              <p className="author-login-footnote">一封验证码邮件，即可回到你的书桌。</p>
            </div>
          </section>
        ) : admin && !user.isAdmin ? (
          <p className="author-empty">
            此页面仅供管理员使用。<a href="/me">返回我的文稿</a>
          </p>
        ) : (
          <>
            <section className="author-account" aria-label="作者资料">
              <div className="author-account-heading">
                <span className="author-avatar" aria-hidden="true">
                  {Array.from(user.penName || '文')[0]}
                </span>
                <div>
                  <p className="author-account-label">落笔有名</p>
                  <p className="author-account-caption">用你喜欢的名字，与文友相识。</p>
                </div>
              </div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(async () => {
                    const result = await AuthorAPI.profile(penName);
                    setUser(result.user);
                    setNotice('笔名已更新；已发表文章保留当时署名，重新审核发布后更新。');
                  });
                }}
              >
                <label>
                  公开笔名
                  <input
                    value={penName}
                    maxLength={30}
                    required
                    disabled={busy}
                    onChange={(event) => setPenName(event.target.value)}
                  />
                </label>
                <button disabled={busy}>保存笔名</button>
              </form>
              <div className="author-account-session">
                <p>{user.email}</p>
                <button
                  className="author-button-quiet"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      await AuthorAPI.logout();
                      loadVersion.current++;
                      setUser(null);
                      setItems([]);
                      setDetail(null);
                      setRecovery(null);
                      setRevisions([]);
                      setNextOffset(null);
                    })
                  }
                >
                  退出登录
                </button>
              </div>
            </section>
            <div className="author-toolbar">
              <div className="author-section-heading">
                <p className="author-kicker">
                  {admin ? '逐字细读，认真回应' : '从一行字，到一篇文章'}
                </p>
                <h2>{admin ? '等待审阅' : '文稿列表'}</h2>
              </div>
              {!admin && (
                <button
                  className="author-button-primary"
                  disabled={busy}
                  onClick={() =>
                    void perform(async () => {
                      const { manuscript } = await AuthorAPI.create();
                      setEditor({ manuscript, initial: manuscript.draft });
                    })
                  }
                >
                  <Plus size={16} aria-hidden="true" />
                  新建文稿
                </button>
              )}
              <button
                className="author-refresh"
                disabled={busy}
                onClick={() => void perform(refresh)}
              >
                <RefreshCw size={15} aria-hidden="true" />
                刷新
              </button>
            </div>
            {!admin && (
              <label className="author-filter">
                查看状态
                <select
                  disabled={busy}
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                >
                  <option value="all">全部</option>
                  {Object.entries(statusNames).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="author-list">
              {items
                .filter((item) => admin || filter === 'all' || item.status === filter)
                .map((item) => (
                  <article key={item.id} className="author-card">
                    <div className="author-card-heading">
                      <span className={`author-status author-status-${item.status}`}>
                        <span aria-hidden="true" />
                        {statusNames[item.status]}
                      </span>
                      {item.isPublic && item.status !== 'published' && (
                        <span className="author-card-public">旧版本仍公开</span>
                      )}
                      <span className="author-card-topic">
                        {TOPICS.find((topic) => topic.id === item.draft.topicId)?.name || '随笔'}
                      </span>
                    </div>
                    <h3>{item.draft.title || '未题名文稿'}</h3>
                    <p className="author-card-meta">
                      {admin ? `${item.author} · ` : ''}更新于{' '}
                      {new Date(item.updatedAt * 1000).toLocaleString('zh-CN')}
                    </p>
                    {item.publishedRevision !== null && (
                      <p className="author-card-meta">最近发布定稿：v{item.publishedRevision}</p>
                    )}
                    {item.reviewNote && (
                      <p className="author-review-note">
                        <span>修改意见</span>
                        {item.reviewNote}
                      </p>
                    )}
                    {featuredCatalog.issues
                      .filter((issue) => issue.articleId === item.id)
                      .map((issue) => (
                        <p key={issue.slug} className="author-featured-note">
                          入选第 {issue.number} 期 · 定稿 {issue.articleRevision}
                        </p>
                      ))}
                    <div className="author-actions">
                      {!admin && item.status !== 'pending' && (
                        <button
                          className="author-button-edit"
                          disabled={busy}
                          onClick={() => void perform(() => open(item.id))}
                        >
                          <PenLine size={14} aria-hidden="true" />
                          继续编辑
                        </button>
                      )}
                      <button disabled={busy} onClick={() => void perform(() => inspect(item.id))}>
                        {admin ? '审阅全文' : '版本与预览'}
                      </button>
                      {!admin && item.status === 'pending' && (
                        <button
                          disabled={busy}
                          onClick={() => void perform(() => change(item, 'cancel'))}
                        >
                          撤回审核
                        </button>
                      )}
                      {item.isPublic && (
                        <>
                          <a href={`/articles/${item.id}`}>
                            查看公开版本 <ArrowUpRight size={13} aria-hidden="true" />
                          </a>
                          <button
                            className="author-button-danger"
                            disabled={busy}
                            onClick={() => void perform(() => change(item, 'withdraw'))}
                          >
                            撤回公开文章
                          </button>
                        </>
                      )}
                      {!admin && item.publishedRevision === null && item.status !== 'pending' && (
                        <button
                          className="author-button-danger"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm('确认删除这篇尚未发布的文稿？此操作不可恢复。'))
                              void perform(async () => {
                                await AuthorAPI.remove(item.id, item.version);
                                localStorage.removeItem(manuscriptBackupKey(user.id, item.id));
                                await refresh();
                              });
                          }}
                        >
                          删除草稿
                        </button>
                      )}
                    </div>
                  </article>
                ))}
              {items.filter((item) => admin || filter === 'all' || item.status === filter)
                .length === 0 && (
                <div className="author-empty">
                  <span className="author-empty-icon" aria-hidden="true">
                    <PenLine size={24} strokeWidth={1.2} />
                  </span>
                  <p>{admin ? '当前没有待审核投稿。' : '这里还没有文稿，写下第一行吧。'}</p>
                  <span>
                    {admin
                      ? '下一篇文字到来时，再一起细读。'
                      : '不必等灵感齐备，一点念头就可以开始。'}
                  </span>
                </div>
              )}
            </div>
          </>
        )}
        {user && nextOffset !== null && (
          <button
            className="author-load-more"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                const version = loadVersion.current;
                const result = await AuthorAPI.list(admin, nextOffset, filter);
                if (version !== loadVersion.current) return;
                setItems((previous) => [
                  ...new Map(
                    [...previous, ...result.manuscripts].map((item) => [item.id, item]),
                  ).values(),
                ]);
                setNextOffset(result.nextOffset);
              })
            }
          >
            加载更多文稿
          </button>
        )}
        {recovery && user && (
          <section className="author-panel" aria-label="恢复本地备份">
            <p className="author-kicker">文字不散 · 继续未完成的篇章</p>
            <h2>发现尚未同步的本地文字</h2>
            <p>本地备份与云端版本不同。请展开核对后选择要继续编辑的版本。</p>
            <details>
              <summary>查看本地备份</summary>
              <h3>{recovery.draft.title}</h3>
              <pre>{recovery.draft.content}</pre>
            </details>
            <details>
              <summary>查看云端版本</summary>
              <h3>{recovery.manuscript.draft.title}</h3>
              <pre>{recovery.manuscript.draft.content}</pre>
            </details>
            <div className="author-actions">
              <button
                className="author-button-primary"
                onClick={() => {
                  setEditor({ manuscript: recovery.manuscript, initial: recovery.draft });
                  setRecovery(null);
                }}
              >
                继续本地文字
              </button>
              <button
                onClick={() => {
                  setEditor({
                    manuscript: recovery.manuscript,
                    initial: recovery.manuscript.draft,
                  });
                  setRecovery(null);
                }}
              >
                使用云端版本
              </button>
              <button onClick={() => setRecovery(null)}>暂不处理</button>
            </div>
          </section>
        )}
        {detail && (
          <section className="author-panel" aria-label="文稿审阅">
            <p className="author-kicker">{admin ? '审阅来稿' : '文稿档案'} / 版本与文字</p>
            <div className="author-toolbar">
              <h2>{detail.draft.title || '未题名文稿'}</h2>
              <button onClick={() => setDetail(null)}>关闭预览</button>
            </div>
            <p className="author-panel-meta">
              {detail.author} · 版本 {detail.version}
            </p>
            <pre className="author-manuscript-body">{detail.draft.content}</pre>
            {admin && detail.status === 'pending' && (
              <form
                className="author-review-form"
                onSubmit={(event) => {
                  event.preventDefault();
                  void perform(() => change(detail, 'approve'));
                }}
              >
                <label>
                  审核意见
                  <textarea
                    maxLength={1000}
                    rows={4}
                    placeholder="写下具体、温和的修改建议，让反馈成为下一稿的起点。"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                  />
                </label>
                <div className="author-actions">
                  <button className="author-button-primary" disabled={busy}>
                    审核通过并发布
                  </button>
                  <button
                    type="button"
                    disabled={busy || !note.trim()}
                    onClick={() => void perform(() => change(detail, 'reject'))}
                  >
                    退回修改
                  </button>
                </div>
              </form>
            )}
            <h3 className="author-revision-heading">最近 30 次投稿记录</h3>
            {revisions.length === 0 ? (
              <p>尚未提交过审核。</p>
            ) : (
              revisions.map((revision) => (
                <details key={revision.version}>
                  <summary>
                    版本 {revision.version} ·{' '}
                    {
                      {
                        pending: '待审核',
                        approved: '已通过',
                        rejected: '已退回',
                        cancelled: '已撤回',
                      }[revision.state]
                    }
                  </summary>
                  <p>{revision.note}</p>
                  <h4>{revision.draft.title}</h4>
                  <pre>{revision.draft.content}</pre>
                </details>
              ))
            )}
          </section>
        )}
      </main>
      <footer className="author-footer">
        <span>文友雅集 · 写作空间</span>
        <span>落笔有声，文字有友。</span>
      </footer>
      {editor && user && (
        <EditorSession
          key={editor.manuscript.id}
          manuscript={editor.manuscript}
          initial={editor.initial}
          user={user}
          onClose={() => {
            setEditor(null);
            void perform(refresh);
          }}
        />
      )}
    </div>
  );
}
