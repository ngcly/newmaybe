import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { paraClass, sectionTitles } from '../reader-utils';

describe('section titles', () => {
  it('reads the titles listed in a leading contents line', () => {
    const paras = [['本篇目：考城隍、耳中人'], ['考城隍'], ['予姊丈之祖宋公。'], ['耳中人']];
    expect([...sectionTitles(paras)]).toEqual(['考城隍', '耳中人']);
    expect(paraClass('本篇目：考城隍、耳中人')).toBe('reader-contents');
  });

  it('finds none without a contents line at the start', () => {
    expect(sectionTitles([])).toEqual(new Set());
    expect(sectionTitles([['考城隍'], ['本篇目：考城隍']])).toEqual(new Set());
    expect(sectionTitles([['本篇目：考城隍', '耳中人']])).toEqual(new Set());
  });

  it('gives every 聊斋 story title its own paragraph, in contents order', () => {
    const dir = new URL('../../../public/texts/liaozhai/', import.meta.url);
    const chapters = readdirSync(dir).filter((name) => /^\d+\.json$/.test(name));
    let checked = 0;
    for (const name of chapters) {
      const { paras } = JSON.parse(readFileSync(new URL(name, dir), 'utf8')) as {
        paras: string[][];
      };
      const titles = sectionTitles(paras);
      if (titles.size === 0) continue;
      const headings = paras.filter((p) => p.length === 1 && titles.has(p[0])).map((p) => p[0]);
      expect(headings, name).toEqual([...titles]);
      checked++;
    }
    expect(checked).toBe(12);
  });
});
