import type { D1Database } from '../worker';
import type { ArticlePage } from '../types';
import { mapArticleSummary, type RawArticleSummaryRow } from './rows';

export async function readFeed(url: URL, db: D1Database): Promise<ArticlePage> {
  const integer = (key: string, fallback: number, max: number) => {
    const value = Number(url.searchParams.get(key) ?? fallback);
    return Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : fallback;
  };
  const limit = Math.max(1, integer('limit', 20, 50));
  const offset = integer('offset', 0, 1_000_000);
  const bindings: unknown[] = [];
  const conditions: string[] = [];
  for (const [param, column] of [
    ['topicId', 'topic_id'],
    ['seriesTitle', 'series_title'],
  ]) {
    const value = url.searchParams.get(param);
    if (value) {
      conditions.push(`${column} = ?`);
      bindings.push(value);
    }
  }
  const filter = url.searchParams.get('filter');
  if (filter === 'series') conditions.push("series_title IS NOT NULL AND series_title != ''");
  const query = url.searchParams.get('q')?.trim().toLowerCase().slice(0, 200);
  if (query) {
    conditions.push(
      '(INSTR(LOWER(title), ?) > 0 OR INSTR(LOWER(author), ?) > 0 OR INSTR(LOWER(summary), ?) > 0 OR INSTR(LOWER(golden_quote), ?) > 0 OR INSTR(LOWER(series_title), ?) > 0)',
    );
    bindings.push(...Array(5).fill(query));
  }
  const order =
    filter === 'featured'
      ? 'featured DESC, likes DESC, pub_date DESC, id DESC'
      : filter === 'series'
        ? 'series_title ASC, series_order ASC, id ASC'
        : 'pub_date DESC, created_at DESC, id DESC';
  // Article bodies are fetched only by the detail endpoint.
  const columns =
    'id, title, summary, author, author_seal, topic_id, topic_name, pub_date, reading_time, word_count, likes, comments_count, series_title, series_order, golden_quote, featured, created_at';
  const { results } = await db
    .prepare(
      `SELECT ${columns} FROM articles${conditions.length ? ' WHERE ' + conditions.join(' AND ') : ''} ORDER BY ${order} LIMIT ? OFFSET ?`,
    )
    .bind(...bindings, limit + 1, offset)
    .all<RawArticleSummaryRow>();
  const { results: topics } = await db
    .prepare('SELECT topic_id, count(*) AS count FROM articles GROUP BY topic_id')
    .all<{ topic_id: string; count: number }>();
  const { results: series } = await db
    .prepare(
      "SELECT series_title AS title, count(*) AS count, MIN(author) AS author FROM articles WHERE series_title IS NOT NULL AND series_title != '' GROUP BY series_title ORDER BY series_title",
    )
    .all<{ title: string; count: number; author: string }>();
  return {
    articles: results.slice(0, limit).map(mapArticleSummary),
    nextOffset: results.length > limit ? offset + limit : null,
    stats: {
      total: topics.reduce((sum, topic) => sum + topic.count, 0),
      topics: Object.fromEntries(topics.map((t) => [t.topic_id, t.count])),
      series,
    },
  };
}
