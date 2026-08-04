import { describe, expect, it } from 'vitest';
import { assertSafeSlug, localIsoDate, yamlValue } from '../authoring';

describe('authoring helpers', () => {
  it('accepts safe slugs and rejects path traversal', () => {
    expect(assertSafeSlug('260804-new_note')).toBe('260804-new_note');
    expect(() => assertSafeSlug('../outside')).toThrow('slug');
    expect(() => assertSafeSlug('nested/path')).toThrow('slug');
  });

  it('quotes YAML-sensitive text without changing its value', () => {
    expect(yamlValue('标题: #一\n第二行')).toBe('"标题: #一\\n第二行"');
    expect(yamlValue(['a"b', 'c: d'])).toBe('["a\\"b","c: d"]');
  });

  it('formats dates using local calendar fields', () => {
    const date = new Date(2026, 7, 4, 0, 30);
    expect(localIsoDate(date)).toBe('2026-08-04');
  });
});
