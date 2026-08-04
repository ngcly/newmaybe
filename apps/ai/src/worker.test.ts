import { describe, expect, it } from 'vitest';
import { validateMessages } from './worker';

describe('validateMessages', () => {
  it('accepts valid chat messages', () => {
    expect(validateMessages([{ role: 'user', content: '你好' }])).toEqual([
      { role: 'user', content: '你好' },
    ]);
  });

  it('rejects invalid roles and oversized prompts', () => {
    expect(validateMessages([{ role: 'admin', content: 'x' }])).toBeNull();
    expect(validateMessages([{ role: 'user', content: 'x'.repeat(7_001) }])).toBeNull();
  });
});
