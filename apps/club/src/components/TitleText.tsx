import type { ReactNode } from 'react';

const OPENING = '（《「『【〔〈“‘';
const CLOSING = '）》」』】〕〉”’';
const PUNCTUATION = `${OPENING}${CLOSING}，。、：；！？`;
/** A short clause after this mark moves to the next line whole instead of breaking mid-word. */
const CLAUSE_BREAK = '：，';
const MAX_TAIL = 12;

/**
 * Title typesetting the fonts cannot do on their own: where two full-width marks meet (e.g.
 * “）：”), the one whose blank side faces the other is set half-width; lone marks stay full-width.
 * The browser's own trimming is switched off on .club-title-text so a pair is never halved twice.
 */
export default function TitleText({ text }: { text: string }) {
  const characters = Array.from(text);
  const isMark = (marks: string, character?: string) =>
    character !== undefined && marks.includes(character);
  const half = characters.map((character, index) =>
    isMark(OPENING, character)
      ? isMark(OPENING, characters[index - 1])
      : isMark(PUNCTUATION, character) && isMark(PUNCTUATION, characters[index + 1]),
  );
  const render = (start: number, end: number) => {
    const nodes: ReactNode[] = [];
    let plain = '';
    for (let index = start; index < end; index += 1) {
      if (!half[index]) {
        plain += characters[index];
        continue;
      }
      if (plain) nodes.push(plain);
      plain = '';
      nodes.push(
        <span key={index} className="club-punct-half">
          {characters[index]}
        </span>,
      );
    }
    if (plain) nodes.push(plain);
    return nodes;
  };

  // The first clause mark outside any brackets, so 《你好，世界》 is never split inside.
  let depth = 0;
  const split = characters.findIndex((character) => {
    if (OPENING.includes(character)) depth += 1;
    else if (CLOSING.includes(character)) depth = Math.max(0, depth - 1);
    return depth === 0 && CLAUSE_BREAK.includes(character);
  });
  const tail = characters.length - split - 1;
  if (split <= 0 || tail <= 0 || tail > MAX_TAIL)
    return <span className="club-title-text">{render(0, characters.length)}</span>;
  return (
    <span className="club-title-text">
      {render(0, split + 1)}
      <span className="club-title-tail">{render(split + 1, characters.length)}</span>
    </span>
  );
}
