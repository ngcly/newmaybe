import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { matchChapter } from '../chapter-match';

describe('matchChapter', () => {
  const ci = [
    '欧阳修｜青玉案',
    '苏轼｜青玉案〔送伯固归吴中〕',
    '辛弃疾｜青玉案〔元夕〕',
    '柳永｜雨霖铃',
  ];

  it('picks the chapter whose author the note names, among poems of one tune', () => {
    expect(matchChapter('青玉案（辛弃疾）', ci)).toBe(2);
    expect(matchChapter('青玉案（苏轼）', ci)).toBe(1);
  });

  it('falls back to the first title match when the note is not an author', () => {
    expect(matchChapter('青玉案（元夕词）', ci)).toBe(0);
    expect(matchChapter('雨霖铃', ci)).toBe(3);
    expect(matchChapter('天问（节选）', ['离骚', '天问'])).toBe(1);
  });

  it('still matches characters in order, and gives up on short or unknown titles', () => {
    expect(matchChapter('长恨歌传（题长恨传）', ['枕中记', '长恨传'])).toBe(-1);
    expect(matchChapter('长恨传', ['枕中记', '长恨歌传'])).toBe(1);
    expect(matchChapter('赋', ['芜城赋'])).toBe(-1);
    expect(matchChapter('桃花源记', ci)).toBe(-1);
  });

  it('finds 辛弃疾’s 青玉案 in 宋词三百首', () => {
    const url = new URL('../../../public/texts/songci300/index.json', import.meta.url);
    const chapters = JSON.parse(readFileSync(url, 'utf8')) as string[];
    expect(chapters[matchChapter('青玉案（辛弃疾）', chapters)]).toBe('辛弃疾｜青玉案〔元夕〕');
  });
});
