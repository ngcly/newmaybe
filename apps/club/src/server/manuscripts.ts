import type { D1Database, D1PreparedStatement, Env } from '../worker';
import type { Manuscript, ManuscriptDraft, ManuscriptRevision, ManuscriptStatus } from '../types';
import { TOPICS } from '../data/topics';
import { InputError, field, readInput } from './input';
import { json, rateLimit } from './http';
import { requireAccount } from './auth';

interface RawManuscript {
  id: string;
  author_id: string;
  pen_name: string;
  draft_json: string;
  version: number;
  status: ManuscriptStatus;
  is_public: number;
  published_revision: number | null;
  review_note: string;
  updated_at: number;
}
const selection = 'SELECT m.*, a.pen_name FROM manuscripts m JOIN authors a ON a.id=m.author_id';
function map(row: RawManuscript): Manuscript {
  return {
    id: row.id,
    authorId: row.author_id,
    author: row.pen_name,
    draft: JSON.parse(row.draft_json),
    version: row.version,
    status: row.status,
    isPublic: Boolean(row.is_public),
    publishedRevision: row.published_revision,
    reviewNote: row.review_note,
    updatedAt: row.updated_at,
  };
}
function draftInput(body: Record<string, unknown>): ManuscriptDraft {
  const topicId = field(body, 'topicId', 80, '专题') || TOPICS[0].id;
  if (!TOPICS.some((topic) => topic.id === topicId)) throw new InputError('请选择有效专题');
  return {
    title: field(body, 'title', 100, '标题'),
    content: field(body, 'content', 50000, '正文'),
    topicId,
    authorSeal: field(body, 'authorSeal', 4, '印章'),
    seriesTitle: field(body, 'seriesTitle', 50, '文集名称'),
    goldenQuote: field(body, 'goldenQuote', 200, '金句'),
  };
}
function expectedVersion(body: Record<string, unknown>) {
  if (!Number.isSafeInteger(body.version) || Number(body.version) < 1)
    throw new InputError('缺少有效文稿版本');
  return Number(body.version);
}
async function mutate(db: D1Database, statements: D1PreparedStatement[]) {
  const results = await db.batch(statements);
  if (results[0].meta.changes !== 1)
    throw new InputError('文稿已在另一处更新，请重新载入后比较内容', 409);
}
export async function manuscriptRoute(request: Request, env: Env): Promise<Response> {
  const user = await requireAccount(request, env);
  const url = new URL(request.url);
  const admin = url.pathname.startsWith('/api/admin/');
  if (admin && !user.isAdmin) throw new InputError('仅管理员可以审核文稿', 403);
  const prefix = admin ? '/api/admin/manuscripts' : '/api/manuscripts';
  if (url.pathname === prefix) {
    if (request.method === 'GET') {
      const rawOffset = Number(url.searchParams.get('offset') || 0);
      const offset = Number.isSafeInteger(rawOffset) && rawOffset >= 0 ? rawOffset : 0;
      const status = url.searchParams.get('status');
      const conditions = [admin ? "m.status='pending'" : 'm.author_id=?'];
      const bindings: unknown[] = admin ? [] : [user.id];
      if (!admin && status && status !== 'all') {
        if (!['draft', 'pending', 'changes_requested', 'published', 'withdrawn'].includes(status))
          throw new InputError('无效的文稿状态');
        conditions.push('m.status=?');
        bindings.push(status);
      }
      const rows = await env.DB.prepare(
        `${selection} WHERE ${conditions.join(' AND ')} ORDER BY m.updated_at DESC, m.id DESC LIMIT 31 OFFSET ?`,
      )
        .bind(...bindings, offset)
        .all<RawManuscript>();
      // Lists do not transfer full article bodies. The editor/reviewer loads one document on demand.
      return json({
        nextOffset: rows.results.length > 30 ? offset + 30 : null,
        manuscripts: rows.results.slice(0, 30).map((row) => {
          const value = map(row);
          return { ...value, draft: { ...value.draft, content: '' } };
        }),
      });
    }
    if (!admin && request.method === 'POST') {
      await rateLimit(env.DB, `draft-create:${user.id}`, 30);
      const id = `club-${crypto.randomUUID()}`;
      const draft = draftInput(await readInput(request));
      await env.DB.prepare('INSERT INTO manuscripts(id, author_id, draft_json) VALUES (?,?,?)')
        .bind(id, user.id, JSON.stringify(draft))
        .run();
      const row = await env.DB.prepare(`${selection} WHERE m.id=?`).bind(id).first<RawManuscript>();
      return json({ manuscript: map(row!) }, 201);
    }
  }
  const match = url.pathname
    .slice(prefix.length)
    .match(/^\/([a-zA-Z0-9-]+)(?:\/(submit|cancel|withdraw|revisions|approve|reject))?$/);
  if (!url.pathname.startsWith(`${prefix}/`) || !match) throw new InputError('接口不存在', 404);
  const [, id, action] = match;
  const row = await env.DB.prepare(`${selection} WHERE m.id=?`).bind(id).first<RawManuscript>();
  if (!row || (!admin && row.author_id !== user.id)) throw new InputError('文稿不存在', 404);
  if (request.method === 'GET' && !action) return json({ manuscript: map(row) });
  if (request.method === 'GET' && action === 'revisions') {
    const revisions = await env.DB.prepare(
      'SELECT version, draft_json, state, note, created_at FROM manuscript_revisions WHERE manuscript_id=? ORDER BY version DESC LIMIT 30',
    )
      .bind(id)
      .all<{
        version: number;
        draft_json: string;
        state: ManuscriptRevision['state'];
        note: string;
        created_at: number;
      }>();
    return json({
      revisions: revisions.results.map((revision) => ({
        version: revision.version,
        draft: JSON.parse(revision.draft_json),
        state: revision.state,
        note: revision.note,
        createdAt: revision.created_at,
      })),
    });
  }
  const body = await readInput(request);
  const version = expectedVersion(body);
  if (version !== row.version)
    throw new InputError('文稿已在另一处更新，请重新载入后比较内容', 409);
  const token = crypto.randomUUID();
  const db = env.DB;
  const guard = 'id=? AND version=?';
  const revisionUpdate = (state: string, note = '') =>
    db
      .prepare(
        `UPDATE manuscript_revisions SET state=?, note=?, reviewer_id=?
    WHERE manuscript_id=? AND version=? AND EXISTS(SELECT 1 FROM manuscripts WHERE id=? AND mutation_id=?)`,
      )
      .bind(state, note, admin ? user.id : null, id, row.version, id, token);
  if (!admin && !action && request.method === 'DELETE') {
    if (row.published_revision !== null || row.status === 'pending')
      throw new InputError('已投稿或曾发布的文稿请使用撤回，不可直接删除');
    await mutate(db, [db.prepare(`DELETE FROM manuscripts WHERE ${guard}`).bind(id, version)]);
    return json({ success: true });
  }
  if (!admin && !action && request.method === 'PUT') {
    if (row.status === 'pending') throw new InputError('请先撤回审核，再修改文稿', 409);
    const draft = draftInput(body);
    await mutate(db, [
      db
        .prepare(
          `UPDATE manuscripts SET draft_json=?, status='draft', review_note='', version=version+1, updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
        )
        .bind(JSON.stringify(draft), token, id, version),
    ]);
  } else if (!admin && request.method === 'POST' && action === 'submit') {
    if (row.status === 'pending') throw new InputError('此版本已提交，无需重复投稿', 409);
    const draft = JSON.parse(row.draft_json) as ManuscriptDraft;
    if (!draft.title.trim() || !draft.content.trim())
      throw new InputError('请填写标题和正文后再投稿');
    await rateLimit(db, `submit:${user.id}`, 10);
    await mutate(db, [
      db
        .prepare(
          `UPDATE manuscripts SET status='pending', review_note='', version=version+1, submitted_at=unixepoch(), updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
        )
        .bind(token, id, version),
      db
        .prepare(
          `INSERT INTO manuscript_revisions(manuscript_id, version, draft_json, state)
        SELECT id, version, draft_json, 'pending' FROM manuscripts WHERE id=? AND mutation_id=?`,
        )
        .bind(id, token),
    ]);
  } else if (!admin && request.method === 'POST' && action === 'cancel') {
    if (row.status !== 'pending') throw new InputError('当前没有待审核投稿', 409);
    await mutate(db, [
      db
        .prepare(
          `UPDATE manuscripts SET status='draft', version=version+1, updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
        )
        .bind(token, id, version),
      revisionUpdate('cancelled'),
    ]);
  } else if (request.method === 'POST' && action === 'withdraw') {
    await mutate(db, [
      db
        .prepare(
          `UPDATE manuscripts SET status='withdrawn', is_public=0, version=version+1, updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
        )
        .bind(token, id, version),
      ...(row.status === 'pending' ? [revisionUpdate('cancelled')] : []),
    ]);
  } else if (admin && request.method === 'POST' && (action === 'approve' || action === 'reject')) {
    if (row.status !== 'pending') throw new InputError('此投稿已处理，请刷新审核列表', 409);
    const note = field(body, 'note', 1000, '审核意见', action === 'reject');
    if (action === 'reject') {
      await mutate(db, [
        db
          .prepare(
            `UPDATE manuscripts SET status='changes_requested', review_note=?, version=version+1, updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
          )
          .bind(note, token, id, version),
        revisionUpdate('rejected', note),
      ]);
    } else {
      const draft = JSON.parse(row.draft_json) as ManuscriptDraft;
      const topic = TOPICS.find((value) => value.id === draft.topicId)!;
      const wordCount = draft.content.replace(/[\s\p{P}]/gu, '').length;
      const summary = draft.content.replace(/\s+/g, ' ').slice(0, 80);
      await mutate(db, [
        db
          .prepare(
            `UPDATE manuscripts SET status='published', is_public=1, published_revision=version, review_note=?, version=version+1, updated_at=unixepoch(), mutation_id=? WHERE ${guard}`,
          )
          .bind(note, token, id, version),
        db
          .prepare(
            `INSERT INTO articles(id,title,summary,content,author,author_seal,topic_id,topic_name,pub_date,reading_time,word_count,likes,comments_count,series_title,series_order,golden_quote,featured)
          SELECT m.id, ?, ?, ?, a.pen_name, ?, ?, ?, date('now'), ?, ?, 0, 0, ?,
            CASE WHEN ?='' THEN NULL ELSE (SELECT COALESCE(MAX(ar.series_order),0)+1 FROM articles ar JOIN manuscripts ms ON ms.id=ar.id WHERE ms.author_id=m.author_id AND ar.series_title=?) END, ?, 0
          FROM manuscripts m JOIN authors a ON a.id=m.author_id WHERE m.id=? AND m.mutation_id=?
          ON CONFLICT(id) DO UPDATE SET title=excluded.title, summary=excluded.summary, content=excluded.content, author=excluded.author,
            author_seal=excluded.author_seal,topic_id=excluded.topic_id,topic_name=excluded.topic_name,reading_time=excluded.reading_time,
            word_count=excluded.word_count,series_title=excluded.series_title,series_order=CASE WHEN articles.series_title=excluded.series_title THEN articles.series_order ELSE excluded.series_order END,golden_quote=excluded.golden_quote`,
          )
          .bind(
            draft.title,
            summary + (draft.content.length > 80 ? '…' : ''),
            draft.content,
            draft.authorSeal || Array.from(row.pen_name).slice(0, 2).join(''),
            topic.id,
            topic.name,
            Math.max(1, Math.ceil(wordCount / 140)),
            wordCount,
            draft.seriesTitle || null,
            draft.seriesTitle,
            draft.seriesTitle,
            draft.goldenQuote || null,
            id,
            token,
          ),
        revisionUpdate('approved', note),
      ]);
    }
  } else throw new InputError('接口不存在', 404);
  const updated = await db
    .prepare(`${selection} WHERE m.id=? AND m.mutation_id=?`)
    .bind(id, token)
    .first<RawManuscript>();
  if (!updated) throw new InputError('文稿又有新的更新，请刷新后比较内容', 409);
  return json({ manuscript: map(updated) });
}
