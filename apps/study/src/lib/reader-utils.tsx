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

export function paraClass(s: string): string {
  if (s === '—— 注释 ——') return 'reader-divider';
  if (isPatternLine(s)) return 'reader-pattern';
  return '';
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
