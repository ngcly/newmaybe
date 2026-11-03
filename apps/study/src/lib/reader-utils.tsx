import React from 'react';

export function notify() {
  window.dispatchEvent(new Event('linxia:update'));
}

// 谱式行（平仄谱、符号谱）识别：谱式符号占绝对多数的行
export function isPatternLine(s: string): boolean {
  if (s === '‖') return true;
  const pz = (s.match(/[○平仄＋－｜＝＄‖]/g) || []).length;
  if (pz < 4) return false;
  const rest = s.replace(/[○平仄＋－｜＝＄‖\s，。、．·,（）()]/g, '');
  return pz >= rest.length * 1.5;
}

// 卷首篇目行（聊斋志异：「本篇目：考城隍、耳中人、……」），列出本章各篇的篇名
const CONTENTS_PREFIX = '本篇目：';

export function paraClass(s: string): string {
  if (s === '—— 注释 ——') return 'reader-divider';
  if (s.startsWith(CONTENTS_PREFIX)) return 'reader-contents';
  if (isPatternLine(s)) return 'reader-pattern';
  return '';
}

// 本章篇名：取自首段篇目行。正文中与某个篇名完全相同的单行段落是该篇的标题
export function sectionTitles(paras: string[][]): Set<string> {
  const first = paras[0];
  if (first?.length !== 1 || !first[0].startsWith(CONTENTS_PREFIX)) return new Set();
  return new Set(first[0].slice(CONTENTS_PREFIX.length).split('、').filter(Boolean));
}

// 解析并高亮朱砂夹批/括号注释
export function renderAnnotatedText(text: string): React.ReactNode {
  const regex = /(（[^）]+）|\([^)]+\))/g;
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (regex.test(part)) {
      return (
        <span key={i} className="cinnabar-annotation">
          {part}
        </span>
      );
    }
    return part;
  });
}
