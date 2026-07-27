import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getCheckins, getReadMap, localDateKey, markChapterRead } from '../store';

const values = new Map<string, string>();

beforeEach(() => {
  values.clear();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
  });
});

describe('reading progress', () => {
  it('does not toggle an explicitly completed chapter back to unread', () => {
    markChapterRead('shijing', 1, true);
    markChapterRead('shijing', 1, true);
    expect(getReadMap().shijing).toEqual([1]);
    expect(getCheckins()[localDateKey()]).toBe(1);
  });

  it('filters malformed persisted chapter values', () => {
    values.set('linxia:read', JSON.stringify({ shijing: [1, -1, 1, '2', 2.5] }));
    expect(getReadMap().shijing).toEqual([1]);
  });
});

describe('localDateKey', () => {
  it('uses local calendar components instead of UTC', () => {
    const date = new Date(2026, 6, 25, 0, 30);
    expect(localDateKey(date)).toBe('2026-07-25');
  });
});
