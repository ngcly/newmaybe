// Double quotes in these texts are often straight (" ＂, mostly 红楼梦 and 水浒传) or turned the
// wrong way round (三国演义: 辂曰：”此乃天命也……。“韩融去了). fixChapterQuotes re-reads every
// mark of a chapter as opening or closing along the cheapest path: quotes alternate, a colon
// opens, the end of a line closes, and the way a curly mark is drawn counts as weak evidence.
// Only chapters whose quotes do not pair up are touched. Marks that are missing altogether
// (来源丢了半边引号) cannot be inferred; quoteProblems reports where they are.
// Single quotes come first: 红楼梦 writes them TeX-style (`怜'字), 水浒传 and 人间词话 as straight '.

const STRAIGHT = new Set(['"', '＂']);
const isQuote = (ch: string) => ch === '“' || ch === '”' || STRAIGHT.has(ch);
// A closing quote is usually followed by punctuation (“绿蜡”之典 is not, so this is only a cost).
const AFTER_CLOSE = new Set([...'，。、；：！？…—）》」』']);

// Costs of reading a mark one way. A wrong pairing costs more than any one piece of evidence,
// except a colon: 曰：“ opens a quote even when an earlier one was left open, so that the
// missing close is reported instead of guessed (otherwise it can turn 问曰：“少年 around).
const AGAINST_SHAPE = 1.5;
const AFTER_COLON = 10;
const LINE_END = 3;
const BEFORE_PUNCTUATION = 2;
const LINE_START = 0.5;
const CARRIED_OVER = 0.8;
const UNPAIRED = 4;

type Reading = 'open' | 'close';
interface Mark {
  line: number;
  index: number;
}
export interface QuoteProblem {
  line: number;
  index: number;
  kind: 'missing close' | 'stray close' | 'unclosed at end';
}

function marksOf(lines: string[]): Mark[] {
  const marks: Mark[] = [];
  lines.forEach((text, line) => {
    for (let index = 0; index < text.length; index++)
      if (isQuote(text[index])) marks.push({ line, index });
  });
  return marks;
}

function previousChar(text: string, index: number): string {
  let i = index - 1;
  while (i >= 0 && (text[i] === ' ' || text[i] === '　')) i--;
  return text[i] ?? '';
}

function readingCost(text: string, index: number, reading: Reading): number {
  const mark = text[index];
  const next = text[index + 1] ?? '';
  let cost = 0;
  if (!STRAIGHT.has(mark) && (mark === '“') !== (reading === 'open')) cost += AGAINST_SHAPE;
  if (reading === 'close' && /[：:]/.test(previousChar(text, index))) cost += AFTER_COLON;
  if (reading === 'open' && next === '') cost += LINE_END;
  if (reading === 'open' && AFTER_CLOSE.has(next)) cost += BEFORE_PUNCTUATION;
  if (reading === 'close' && index === 0) cost += LINE_START;
  return cost;
}

/**
 * Unpaired quotes in a chapter, read in order. An open quote may run on into the next line
 * (verse, long notes), and prose re-opens it at the start of each paragraph of a long speech.
 * A “ inside ‘…’ (or 『…』) starts a third level (“…‘…“…”…’…”), which is correct, not a new speech.
 */
export function quoteProblems(lines: string[]): QuoteProblem[] {
  const problems: QuoteProblem[] = [];
  let open = 0;
  let single = false;
  lines.forEach((text, line) => {
    if (open > 0 && text.startsWith('“')) open = 0;
    if (open === 0) single = false;
    for (let index = 0; index < text.length; index++) {
      const ch = text[index];
      if ((ch === '‘' || ch === '『') && open > 0) single = true;
      else if (ch === '’' || ch === '』') single = false;
      else if (ch === '“') {
        if (open > 0 && !single) problems.push({ line, index, kind: 'missing close' });
        open = open > 0 && single ? open + 1 : 1;
      } else if (ch === '”') {
        if (open === 0) problems.push({ line, index, kind: 'stray close' });
        open = Math.max(0, open - 1);
        if (open === 0) single = false;
      }
    }
  });
  const last = lines.length - 1;
  if (open > 0) problems.push({ line: last, index: lines[last].length, kind: 'unclosed at end' });
  return problems;
}

// Straight and TeX-style single quotes: ` opens; ' closes an open single quote and otherwise opens
// one, unless it stands for a double quote — it opens a speech that a ” closes (笑道：'……？”) or
// closes, after the end of a sentence, a speech that a “ opened (更好了！'众人笑道).
const nonAscii = (ch = '') => ch.charCodeAt(0) > 0x7f;
export function fixSingleQuotes(lines: string[]): string[] {
  // Open double quotes (a third level inside ‘…’ counts on), and whether a single quote is open;
  // both run on into the next line like quoteProblems.
  let open = 0;
  let single = false;
  return lines.map((text) => {
    if (open > 0 && text.startsWith('“')) open = 0;
    if (open === 0) single = false;
    const units = text.split('');
    for (let i = 0; i < units.length; i++) {
      let ch = units[i];
      if (ch === '`') ch = units[i] = '‘';
      else if (ch === "'" && (nonAscii(units[i - 1]) || nonAscii(units[i + 1]))) {
        const next = units.slice(i + 1).find((c) => /[“”‘’'`]/.test(c));
        // '” closes a quote inside a quote.
        if (single || units[i + 1] === '”') ch = '’';
        else if (open === 0 && next === '”') ch = '“';
        else if (open > 0 && next !== "'" && /[。！？…]/.test(units[i - 1] ?? '')) ch = '”';
        else ch = '‘';
        units[i] = ch;
      }
      if (ch === '‘' || ch === '『') single = true;
      else if (ch === '’' || ch === '』') single = false;
      else if (ch === '“') open = open > 0 && single ? open + 1 : 1;
      else if (ch === '”') {
        open = Math.max(0, open - 1);
        if (open === 0) single = false;
      }
    }
    return units.join('');
  });
}

const needsFix = (lines: string[]) =>
  lines.some((text) => [...text].some((ch) => STRAIGHT.has(ch))) || quoteProblems(lines).length > 0;

// A path through the chapter's marks, kept as a linked list from the last reading back.
interface Step {
  cost: number;
  reading?: Reading;
  previous?: Step;
}

/** Rewrites the double quotes of a chapter's lines; lines whose quotes already pair up are kept. */
export function fixQuoteDirections(lines: string[]): string[] {
  if (!needsFix(lines)) return lines;
  const marks = marksOf(lines);
  // Cheapest way to reach each state: outside a quote (0) or inside one (1).
  let best: [Step | undefined, Step | undefined] = [{ cost: 0 }, undefined];
  let line = 0;
  for (const mark of marks) {
    if (mark.line !== line) {
      // An open quote either runs on into this line or is re-opened by a mark that starts it.
      const inside = best[1];
      if (inside) {
        const reopens = mark.index === 0;
        best = [
          reopens && (!best[0] || inside.cost < best[0].cost) ? inside : best[0],
          { ...inside, cost: inside.cost + (reopens ? 0 : CARRIED_OVER) },
        ];
      }
      line = mark.line;
    }
    const text = lines[mark.line];
    const next: [Step | undefined, Step | undefined] = [undefined, undefined];
    best.forEach((step, depth) => {
      if (!step) return;
      for (const reading of ['open', 'close'] as const) {
        const unpaired = (reading === 'open') === (depth === 1);
        const cost = step.cost + readingCost(text, mark.index, reading) + (unpaired ? UNPAIRED : 0);
        const to = reading === 'open' ? 1 : 0;
        if (!next[to] || cost < next[to].cost) next[to] = { cost, reading, previous: step };
      }
    });
    best = next;
  }
  const [outside, inside] = best;
  let step = inside && (!outside || inside.cost + UNPAIRED / 2 < outside.cost) ? inside : outside;
  // Mark indices count UTF-16 code units, so split the same way (rare characters are pairs).
  const units = lines.map((text) => text.split(''));
  for (let k = marks.length - 1; k >= 0 && step?.reading; k--, step = step.previous)
    units[marks[k].line][marks[k].index] = step.reading === 'open' ? '“' : '”';
  return units.map((parts) => parts.join(''));
}

/** Applies fixQuoteDirections to a chapter's `paras`, which hold strings or stanzas of lines. */
export function fixChapterQuotes<T extends string | string[]>(paras: T[]): T[] {
  const lines = paras.flatMap((para) => (Array.isArray(para) ? para : [para]));
  const fixed = fixQuoteDirections(fixSingleQuotes(lines));
  if (fixed.every((text, k) => text === lines[k])) return paras;
  let k = 0;
  return paras.map((para) =>
    Array.isArray(para) ? para.map(() => fixed[k++]) : fixed[k++],
  ) as T[];
}
