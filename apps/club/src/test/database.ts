import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync } from 'node:fs';
import type { D1Database, D1PreparedStatement, D1Result } from '../worker';

export function testDatabase() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../../schema.sql', import.meta.url), 'utf8'));
  const folder = new URL('../../migrations/', import.meta.url);
  for (const file of readdirSync(folder)
    .filter((file) => file.endsWith('.sql'))
    .sort())
    sqlite.exec(readFileSync(new URL(file, folder), 'utf8'));
  class Statement implements D1PreparedStatement {
    values: (string | number | null)[] = [];
    constructor(private sql: string) {}
    bind(...values: unknown[]) {
      this.values = values as (string | number | null)[];
      return this;
    }
    async first<T>(column?: string): Promise<T | null> {
      const row = sqlite.prepare(this.sql).get(...this.values);
      return ((column ? row?.[column] : row) as T) ?? null;
    }
    async all<T>(): Promise<D1Result<T>> {
      return {
        results: sqlite.prepare(this.sql).all(...this.values) as T[],
        success: true,
        meta: {},
      };
    }
    async run<T>(): Promise<D1Result<T>> {
      const result = sqlite.prepare(this.sql).run(...this.values);
      return { results: [], success: true, meta: { changes: Number(result.changes) } };
    }
  }
  let queue: Promise<unknown> = Promise.resolve();
  const db: D1Database = {
    prepare: (sql) => new Statement(sql),
    batch: <T>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]> => {
      const task = queue
        .catch(() => {})
        .then(async () => {
          sqlite.exec('BEGIN');
          try {
            const results: D1Result<T>[] = [];
            for (const statement of statements) results.push(await statement.run<T>());
            sqlite.exec('COMMIT');
            return results;
          } catch (error) {
            sqlite.exec('ROLLBACK');
            throw error;
          }
        });
      queue = task;
      return task;
    },
    exec: async (sql) => {
      sqlite.exec(sql);
      return { count: 0, duration: 0 };
    },
  };
  return { db, sqlite };
}
