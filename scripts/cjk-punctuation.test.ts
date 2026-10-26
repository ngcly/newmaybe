import { describe, it, expect } from 'vitest';
import { toFullWidthCjkPunctuation as fix } from './cjk-punctuation';

describe('CJK punctuation normalization', () => {
  it.each([
    ['云对雨,雪对风,晚照对晴空。', '云对雨，雪对风，晚照对晴空。'],
    ['两鬓风霜,途次早行之客;一蓑烟雨', '两鬓风霜，途次早行之客；一蓑烟雨'],
    ['卫鞅曰:“吾说公', '卫鞅曰：“吾说公'],
    ['嗟乎!士为知己者死', '嗟乎！士为知己者死'],
    ['以通押）,也可以用', '以通押），也可以用'],
    ['平平仄,②仄平平', '平平仄，②仄平平'],
    ['兰三尺剑,○仄平平', '兰三尺剑，○仄平平'],
  ])('converts %s', (input, expected) => expect(fix(input)).toBe(expected));

  it('drops the space after converted punctuation', () => {
    expect(fix('云对雨, 雪对风, 晚照对晴空。')).toBe('云对雨，雪对风，晚照对晴空。');
    expect(fix('秋 一作:  秋边')).toBe('秋 一作：秋边');
  });

  it('converts punctuation at the end of a line', () => {
    expect(fix('思卿犹恨马行迟:')).toBe('思卿犹恨马行迟：');
    expect(fix('歌云载恨, ')).toBe('歌云载恨，');
    expect(fix('何不改乎此度?\n下一行')).toBe('何不改乎此度？\n下一行');
  });

  it('looks past ASCII brackets and quotes around Chinese words', () => {
    expect(fix('落独暄妍,(一先)')).toBe('落独暄妍，(一先)');
    expect(fix('末二字),平(叠句)')).toBe('末二字)，平(叠句)');
    expect(fix('这厮无礼!"对孙琪')).toBe('这厮无礼！"对孙琪');
  });

  it.each([
    'Hello, world! Ready? Go: now; done.',
    '中文, English',
    'English, 中文',
    '“看”读ju,“漫”读',
    '公元前 1,000 年',
    '约 3:00 出发',
    '１２:３０',
    '见 https://newmaybe.com/a?b=1,2 中文',
    '例如:http://example.com',
    '["中","文"]',
    'f(中),g(文)',
    '中文!important',
  ])('leaves Latin, numbers, URLs and code alone: %s', (input) => expect(fix(input)).toBe(input));

  it('converts question marks that end a question', () => {
    expect(fix('子曰：“将奈何?”')).toBe('子曰：“将奈何？”');
    expect(fix('天下英雄谁敌手?曹刘！')).toBe('天下英雄谁敌手？曹刘！');
    expect(fix('生子何须似仲谋?（“看”读kan）')).toBe('生子何须似仲谋？（“看”读kan）');
    expect(fix('梦断何处?○仄仄平')).toBe('梦断何处？○仄仄平');
  });

  it.each([
    '《春秋?僖公五年》',
    '春秋左传?哀公四年',
    '刘?不信，请辂至府',
    '郡太守刘?，捕七人',
    '大事！”?得玄德面如土色',
    '僮仆??如也',
    '今受惊?.吾想汝',
    '止如?木',
  ])('keeps ? that stands for a lost character: %s', (input) => expect(fix(input)).toBe(input));

  it('is idempotent and leaves full-width text untouched', () => {
    const text = '两鬓风霜，途次早行之客；一蓑烟雨，溪边晚钓之翁。';
    expect(fix(text)).toBe(text);
    const once = fix('云对雨, 雪对风; 晚照对晴空!');
    expect(fix(once)).toBe(once);
  });
});
