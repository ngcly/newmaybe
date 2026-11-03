import { describe, it, expect } from 'vitest';
import {
  PRIVATE_USE_TABLES,
  restorePrivateUseCharacters as restore,
} from './private-use-characters';

describe('private-use character restoration', () => {
  it.each([
    ['shanhaijing', '有青鸟琅鸟\u{EA20}鸟', '有青鸟琅鸟玄鸟'],
    ['shanhaijing', '今在\u{EA1F}农华阴县西南', '今在弘农华阴县西南'],
    ['shishuoxinyu', '\u{EADE}宏汉纪曰', '袁宏汉纪曰'],
    ['chuanqi', '卢生衣短裘乗青驹\u{EB3C}适于田', '卢生衣短裘乗青驹将适于田'],
    ['xuxiake', '路北有\u{E064}廻亘层叠', '路北有峰廻亘层叠'],
  ])('maps 四库全书 codes in %s', (book, input, expected) =>
    expect(restore(input, book)).toBe(expected),
  );

  it('resolves the ⿰ ⿱ ⿴ codes of the 四库全书 font by context', () => {
    expect(restore('其名曰\u{E7E8}\u{E7E8}【傲噎二音】', 'shanhaijing')).toBe(
      '其名曰𢕟𢓨【傲噎二音】',
    );
    expect(restore('或曰\u{E7E8}\u{E7E8}目也', 'shanhaijing')).toBe('或曰眯眯目也');
    expect(restore('掺挝蹋地来前蹑\u{E7E8}脚', 'shishuoxinyu')).toBe('掺挝蹋地来前蹑𫘈脚');
  });

  it('joins a private-use radical with its neighbour', () => {
    expect(restore('仓获白鳖为\u{E409}霍，举烽', 'youyang')).toBe('仓获白鳖为臛，举烽');
    expect(restore('玄\u{E403}（即鸱字）', 'youyang')).toBe('䲻（即鸱字）');
    expect(restore('闭关据\u{E467}厄', 'shiji')).toBe('闭关据阨');
    expect(restore('小玉、元宵、小亦\u{E127}鸟', 'jinpingmei')).toBe('小玉、元宵、小鸾');
  });

  it('reads the same code point per book', () => {
    expect(restore('妖妖\u{E77B}\u{E77B}', 'hongloumeng')).toBe('妖妖娇娇');
    expect(restore('\u{E77B}牛书', 'youyang')).toBe('牸牛书');
  });

  it('prefers a BMP traditional form over a simplified one outside the BMP', () => {
    expect(restore('初入口时，醇\u{E04C}好吃', 'shuihuzhuan')).toBe('初入口时，醇醲好吃');
  });

  it('leaves component placeholders to the placeholder fix', () => {
    expect(restore('得上细<系\u{E7A4}>二条', 'youyang')).toBe('得上细<系\u{E7A4}>二条');
    expect(restore('号为万匠{\u{E7B8}洪}。', 'youyang')).toBe('号为万匠{\u{E7B8}洪}。');
    expect(restore('<系\u{E7A4}>当妃乳上，席一枚以覆井，\u{E7A4}三斤', 'youyang')).toBe(
      '<系\u{E7A4}>当妃乳上，席一枚以覆井，枲三斤',
    );
  });

  it('leaves unknown codes, books and text without private-use characters alone', () => {
    expect(restore('祠之用烛【或作\u{F847}】', 'shanhaijing')).toBe('祠之用烛【或作\u{F847}】');
    expect(restore('有青鸟琅鸟\u{EA20}鸟', 'tang300')).toBe('有青鸟琅鸟\u{EA20}鸟');
    expect(restore('天对地，雨对风。', 'shanhaijing')).toBe('天对地，雨对风。');
  });

  it('only maps to visible text', () => {
    const PUA = /[-]/;
    for (const [book, { chars = {}, sequences = [] }] of Object.entries(PRIVATE_USE_TABLES)) {
      for (const [code, to] of Object.entries(chars)) {
        expect(code, book).toMatch(/^[EF][0-9A-F]{3}$/);
        expect(to, `${book} ${code}`).toMatch(/^\p{Script=Han}$/u);
      }
      for (const [from, to] of sequences) {
        expect(from, book).toMatch(PUA);
        expect(to, `${book} ${from}`).not.toMatch(PUA);
      }
    }
  });
});
