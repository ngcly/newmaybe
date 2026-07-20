import type { ReactNode } from 'react';

/**
 * 极简、安全的 Markdown 渲染器：仅支持段落/换行、**加粗** 与 [文本](链接)。
 *
 * 安全约束：
 * - 只构建 React 元素，不使用 dangerouslySetInnerHTML，模型输出中的 HTML 一律按纯文本展示；
 * - 链接仅放行 http:/https: 协议（相对地址、javascript: 等一律降级为纯文本）；
 * - 链接统一新标签页打开（target="_blank" rel="noopener noreferrer"）。
 */

// 行内语法：**粗体** 或 [文本](URL)
const INLINE_RE = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

// 模型输出链接后常紧跟中英文句读，需从 URL 尾部剥离，否则会拼进 href 导致 404
const TRAILING_PUNCT_RE = /[.,;:!?'")\]}>*。，、；：？！…—）】》」』]+$/;

function isSafeHttpUrl(url: string): boolean {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

function renderInline(text: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of text.matchAll(INLINE_RE)) {
    const index = match.index;
    if (index > lastIndex) nodes.push(text.slice(lastIndex, index));

    if (match[1] !== undefined) {
      nodes.push(<strong key={key++}>{match[1]}</strong>);
    } else {
      const label = match[2];
      const rawUrl = match[3];
      const url = rawUrl.replace(TRAILING_PUNCT_RE, '');
      const trailing = rawUrl.slice(url.length);

      if (url && isSafeHttpUrl(url)) {
        nodes.push(
          <a
            key={key++}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--ochre)] underline decoration-[var(--ochre)]/50 underline-offset-2 hover:decoration-[var(--ochre)] transition-colors"
          >
            {label}
          </a>,
        );
        if (trailing) nodes.push(trailing);
      } else {
        // 非 http/https 链接：不生成 <a>，按原始文本展示
        nodes.push(match[0]);
      }
    }
    lastIndex = index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export default function MarkdownText({ text }: { text: string }) {
  // 空行分段，段内单换行转为 <br />
  const paragraphs = text.split(/\n{2,}/).filter((p) => p.trim().length > 0);

  if (paragraphs.length === 0) return null;

  return (
    <>
      {paragraphs.map((paragraph, i) => (
        <p key={i} className="mb-2 last:mb-0">
          {paragraph.split('\n').map((line, j) => (
            <span key={j}>
              {j > 0 && <br />}
              {renderInline(line)}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}
