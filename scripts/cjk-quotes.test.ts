import { describe, expect, it } from 'vitest';
import {
  fixChapterQuotes,
  fixQuoteDirections as fix,
  fixSingleQuotes,
  quoteProblems,
} from './cjk-quotes';

describe('fixQuoteDirections', () => {
  it('turns straight quotes into opening and closing quotes', () => {
    expect(fix(['贾政道：“你媳妇怎么样了？"贾琏又跪下说：“看着不好。"'])).toEqual([
      '贾政道：“你媳妇怎么样了？”贾琏又跪下说：“看着不好。”',
    ]);
    expect(fix(['不知"绿蜡"之典，便又说了一个"窗"字。'])).toEqual([
      '不知“绿蜡”之典，便又说了一个“窗”字。',
    ]);
    expect(fix(['“疑是”句用＂平仄仄仄平＂'])).toEqual(['“疑是”句用“平仄仄仄平”']);
  });

  it('turns quotes written the wrong way round', () => {
    expect(fix(['辂曰：”此乃天命也，安可禳乎？“父告曰：”老夫止有此子。“'])).toEqual([
      '辂曰：“此乃天命也，安可禳乎？”父告曰：“老夫止有此子。”',
    ]);
    expect(fix(['亮曰：“现为杂号将军，镇守河西。“睿从之。'])).toEqual([
      '亮曰：“现为杂号将军，镇守河西。”睿从之。',
    ]);
  });

  it('keeps chapters whose quotes already pair up, even across lines', () => {
    const speech = ['他说：“第一段。', '“第二段。”'];
    const verse = ['古诗曰：“青青河畔草，', '绵绵思远道。”'];
    const note = ['《汉书》曰：“孝武陈皇后，', '”时朱子尚亦善歌，复为一曲云：“暧暧日欲冥。”'];
    for (const lines of [speech, verse, note]) expect(fix(lines)).toBe(lines);
  });

  it('keeps a quote after a colon open when an earlier quote was left open', () => {
    const fixed = fix([
      '孔明曰：“汝勿多疑。',
      '问曰：“少年高姓、贵庚？答曰：姓赵。辂曰：”此乃天命也，安可禳乎？',
    ]);
    expect(fixed[1]).toContain('问曰：“少年');
    expect(fixed[1]).toContain('辂曰：“此乃');
  });

  it('leaves a missing quote for review instead of guessing', () => {
    const lines = ['问曰：“少年高姓、贵庚？答曰：姓赵，名颜。'];
    expect(fix(lines)).toEqual(lines);
    expect(quoteProblems(lines)).toEqual([{ line: 0, index: 21, kind: 'unclosed at end' }]);
  });

  it('keeps rare characters stored as surrogate pairs intact', () => {
    expect(fix(['羸𨻻县人曰："𡶭水出焉。"'])).toEqual(['羸𨻻县人曰：“𡶭水出焉。”']);
  });
});

describe('quoteProblems', () => {
  it('accepts a third level of quotes inside single quotes', () => {
    expect(quoteProblems(['古辞曰：“君子行‘', '人曰“如言”。’', '乃去。”'])).toEqual([]);
    expect(quoteProblems(['曰：“楚有养由基者，曰‘有一夫曰“善，可教射矣”。公不如无出’。”'])).toEqual(
      [],
    );
  });
});

describe('fixSingleQuotes', () => {
  it('turns TeX-style and straight single quotes into curly ones', () => {
    expect(fixSingleQuotes(["独有那`怜'字`叹'字不好。"])).toEqual(['独有那‘怜’字‘叹’字不好。']);
    expect(fixSingleQuotes(["道：“只管说得，'不要外道'才是。'”黛玉"])).toEqual([
      '道：“只管说得，‘不要外道’才是。’”黛玉',
    ]);
    expect(fixSingleQuotes(['诗曰：“‘暮雨萧萧江上村，', "游宦而今半是君。'”"])).toEqual([
      '诗曰：“‘暮雨萧萧江上村，',
      '游宦而今半是君。’”',
    ]);
    expect(fixSingleQuotes(["那和尚答道：'来从来处来，去从去处去。'洒家不省"])).toEqual([
      '那和尚答道：‘来从来处来，去从去处去。’洒家不省',
    ]);
  });

  it('turns a straight quote that stands for a double one', () => {
    expect(fixSingleQuotes(["宝钗笑道：'你不必忙，我替你作些如何？”袭人笑道"])).toEqual([
      '宝钗笑道：“你不必忙，我替你作些如何？”袭人笑道',
    ]);
    expect(fixSingleQuotes(["凤姐道：“更好了！'众人笑道：“这都是。”"])).toEqual([
      '凤姐道：“更好了！”众人笑道：“这都是。”',
    ]);
  });

  it('leaves apostrophes in Latin text alone', () => {
    const lines = ["It's 中文"];
    expect(fixSingleQuotes(lines)).toEqual(lines);
  });
});

describe('fixChapterQuotes', () => {
  it('keeps the shape of stanzas and plain paragraphs', () => {
    expect(fixChapterQuotes([['歌曰："', '日出东方。"'], '众皆和之。'])).toEqual([
      ['歌曰：“', '日出东方。”'],
      '众皆和之。',
    ]);
  });
});
