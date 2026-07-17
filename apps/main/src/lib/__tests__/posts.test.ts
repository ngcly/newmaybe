import { describe, it, expect } from 'vitest';
import { comparePostsForDisplay, sortPostsForDisplay } from '../posts';

// Minimal mock matching CollectionEntry<'posts'> shape.
// The single `as any` here intentionally bypasses the full CollectionEntry type —
// downstream callers do not need to repeat the cast.
function mockPost(id: string, weight: number, pubDate: Date, title: string) {
  return {
    id,
    collection: 'posts' as const,
    data: { weight, pubDate, title },
  } as any; // eslint-disable-line @typescript-eslint/no-explicit-any
}

describe('comparePostsForDisplay', () => {
  it('returns negative when a has higher weight than b', () => {
    const a = mockPost('a', 10, new Date('2026-01-01'), 'Title');
    const b = mockPost('b', 5, new Date('2026-01-01'), 'Title');
    expect(comparePostsForDisplay(a, b)).toBeLessThan(0);
  });

  it('returns positive when a has lower weight than b', () => {
    const a = mockPost('a', 3, new Date('2026-01-01'), 'Title');
    const b = mockPost('b', 8, new Date('2026-01-01'), 'Title');
    expect(comparePostsForDisplay(a, b)).toBeGreaterThan(0);
  });

  it('falls back to date when weights are equal', () => {
    const older = mockPost('older', 0, new Date('2025-01-01'), 'Title');
    const newer = mockPost('newer', 0, new Date('2026-01-01'), 'Title');
    // newer should come first → comparePostsForDisplay(newer, older) < 0
    expect(comparePostsForDisplay(newer, older)).toBeLessThan(0);
  });

  it('falls back to title when weight and date are equal', () => {
    const a = mockPost('a', 0, new Date('2026-01-01'), 'Apple');
    const b = mockPost('b', 0, new Date('2026-01-01'), 'Banana');
    // Apple < Banana in Chinese locale
    expect(comparePostsForDisplay(a, b)).toBeLessThan(0);
  });

  it('returns 0 when all fields are equal', () => {
    const a = mockPost('same', 5, new Date('2026-06-01'), 'Same Title');
    const b = mockPost('same', 5, new Date('2026-06-01'), 'Same Title');
    expect(comparePostsForDisplay(a, b)).toBe(0);
  });
});

describe('sortPostsForDisplay', () => {
  it('returns a new array (does not mutate original)', () => {
    const posts = [
      mockPost('a', 1, new Date('2026-01-01'), 'A'),
      mockPost('b', 2, new Date('2026-01-01'), 'B'),
    ];
    const sorted = sortPostsForDisplay(posts);
    expect(sorted).not.toBe(posts);
    expect(posts[0].id).toBe('a'); // original order unchanged
  });

  it('sorts by weight descending then date descending', () => {
    const posts = [
      mockPost('low', 0, new Date('2026-01-01'), 'Low'),
      mockPost('high', 100, new Date('2025-01-01'), 'High Weight Old'),
      mockPost('medium', 50, new Date('2026-06-01'), 'Medium'),
    ];
    const sorted = sortPostsForDisplay(posts);
    expect(sorted[0].id).toBe('high'); // weight 100
    expect(sorted[1].id).toBe('medium'); // weight 50
    expect(sorted[2].id).toBe('low'); // weight 0
  });

  it('handles empty array', () => {
    expect(sortPostsForDisplay([])).toEqual([]);
  });

  it('handles single post', () => {
    const posts = [mockPost('only', 0, new Date('2026-01-01'), 'Only')];
    const sorted = sortPostsForDisplay(posts);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].id).toBe('only');
  });
});
