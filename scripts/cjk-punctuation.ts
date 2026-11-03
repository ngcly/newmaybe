// Classical texts scraped from the web mix half-width , ; : ! ? . into Chinese sentences, and
// 庄子 writes the colon with the ratio sign ∶. They become full-width only when CJK text sits on
// both sides, so Latin text, numbers, URLs and code keep their ASCII punctuation.

const FULL_WIDTH: Record<string, string> = {
  ',': '，',
  ';': '；',
  ':': '：',
  '!': '！',
  '?': '？',
  '.': '。',
  '∶': '：',
};

const HAN = /\p{Script=Han}/u;
// Han and kana, CJK and full-width punctuation (not full-width letters or digits),
// circled annotation numbers, the ○●△ marks of tonal patterns, and the quotes,
// ellipsis and dashes Chinese text uses.
const CJK =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\u3000-\u303f\uff01-\uff0f\uff1a-\uff20\uff3b-\uff40\uff5b-\uff65\u2460-\u24ff\u25b3\u25cb\u25cf\u2018\u2019\u201c\u201d\u2026\u2014\u00b7]/u;
// ASCII brackets and quotes often wrap Chinese words in these texts: `妍,(一先)`, `无礼!"对`.
const ASCII_WRAPPER = /[()[\]"']/;
const LINE_END = /[\r\n]/;
const CLOSER = /[”’」』）】〕》〉)\]"']/;
const MID_SENTENCE_MARK = /[，。、；：？！．,.;:!?]/;
const CLAUSE_BREAK = /[，。；：！？、“”「」『』（）,.;:!?()"\r\n]/;
const INTERROGATIVE = /[谁何几岂乎哉耶邪欤歟否吗嗎呢么麼焉胡奚曷孰怎哪]/;

export function toFullWidthCjkPunctuation(text: string): string {
  const chars = Array.from(text);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const full = FULL_WIDTH[chars[i]];
    let next = i + 1;
    while (chars[next] === ' ' || chars[next] === '\t') next++;
    if (
      full &&
      sitsBetweenCjk(chars, i, next) &&
      (chars[i] !== '?' || readsAsQuestion(chars, i, next))
    ) {
      out += full;
      i = next - 1; // a full-width mark carries its own spacing, so drop the spaces after it
    } else {
      out += chars[i];
    }
  }
  return out;
}

function sitsBetweenCjk(chars: string[], i: number, next: number): boolean {
  let left = i - 1;
  while (ASCII_WRAPPER.test(chars[left] ?? '')) left--;
  let right = next;
  while (ASCII_WRAPPER.test(chars[right] ?? '')) right++;
  const leftIsCjk = CJK.test(chars[left] ?? '');
  const rightIsCjkOrLineEnd =
    right >= chars.length || LINE_END.test(chars[right]) || CJK.test(chars[right]);
  // Wrappers alone on both sides look like code (`["中","文"]`), so one side must touch CJK.
  const touchesCjk = CJK.test(chars[i - 1] ?? '') || CJK.test(chars[next] ?? '');
  return leftIsCjk && rightIsCjkOrLineEnd && touchesCjk;
}

// Most half-width `?` in these texts stand in for characters lost in transcoding:
// 《春秋?僖公五年》 lost a middle dot (see restoreTitleMiddleDots), 刘?不信 and ”?得
// lost a rare Han character.
function readsAsQuestion(chars: string[], i: number, next: number): boolean {
  if (!HAN.test(chars[i - 1] ?? '')) return false;
  let asksSomething = false;
  for (let j = i - 1; j >= 0 && !CLAUSE_BREAK.test(chars[j]); j--) {
    if (chars[j] === '《' || chars[j] === '〈') return false;
    if (chars[j] === '》' || chars[j] === '〉') break;
    if (INTERROGATIVE.test(chars[j])) asksSomething = true;
  }
  const after = chars[next];
  if (after === undefined || LINE_END.test(after) || CLOSER.test(after)) return true;
  // `刘?，` and `受惊?.` cannot be questions; text running on needs a question word before it.
  return !MID_SENTENCE_MARK.test(after) && asksSomething;
}

// Transcoding also turned the middle dot between a book and its chapter into `?`:
// 《春秋?僖公五年》 → 《春秋·僖公五年》, 《易?象》 → 《易·象》.
export function restoreTitleMiddleDots(text: string): string {
  return text.replace(/《[^《》]*》/g, (title) =>
    title.replace(/(?<=\p{Script=Han})\?(?=\p{Script=Han})/gu, '·'),
  );
}

// Box-drawing lines stand in for the Chinese dash (──右一曲, ━━滶水注之), and some texts carry
// tabs and zero-width spaces left over from their source pages.
export function normalizeMarks(text: string): string {
  return text.replace(/[─━]{2}/g, '——').replace(/[\t\u200b]/g, '');
}
