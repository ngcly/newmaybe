// 把“精读篇目”模糊匹配到章节号
function normTitle(s: string): string {
  return s.replace(/[（(].*?[)）]/g, '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
}
function isSubseq(m: string, t: string): boolean {
  let i = 0;
  for (const c of t) if (c === m[i]) i++;
  return i >= m.length;
}
// 篇目的括注（作者、出处或说明），如「青玉案（辛弃疾）」里的「辛弃疾」
function note(s: string): string {
  const m = s.match(/[（(](.*?)[)）]/);
  return m ? m[1].replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '') : '';
}
export function matchChapter(must: string, chapters: string[]): number {
  const m = normTitle(must);
  if (m.length < 2) return -1;
  const hit = (chapter: string) => {
    const t = normTitle(chapter);
    return t.includes(m) || m.includes(t);
  };
  // 同名的篇目（几首《青玉案》）先按括注找：章节名里也有这位作者的那一章
  const n = note(must);
  if (n) {
    const i = chapters.findIndex((c) => hit(c) && c.includes(n));
    if (i >= 0) return i;
  }
  const i = chapters.findIndex(hit);
  if (i >= 0) return i;
  if (m.length >= 3) return chapters.findIndex((c) => isSubseq(m, normTitle(c)));
  return -1;
}
