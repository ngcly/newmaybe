import { TOPICS } from '../data/topics';

export class InputError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export async function readInput(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('Content-Type')?.toLowerCase().startsWith('application/json'))
    throw new InputError('请使用 JSON 格式提交', 415);
  const maxBytes = 220_000;
  if (Number(request.headers.get('Content-Length')) > maxBytes)
    throw new InputError('提交内容过大', 413);
  const reader = request.body?.getReader();
  if (!reader) throw new InputError('提交内容不能为空');
  const decoder = new TextDecoder();
  let bytes = 0;
  let text = '';
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) {
        await reader.cancel();
        throw new InputError('提交内容过大', 413);
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new InputError('JSON 格式错误');
  }
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new InputError('提交内容必须为对象');
  return value as Record<string, unknown>;
}

function field(
  body: Record<string, unknown>,
  key: string,
  max: number,
  label: string,
  required = false,
): string {
  const value = body[key];
  if (value === undefined && !required) return '';
  if (typeof value !== 'string') throw new InputError(`${label}必须为文字`);
  const text = value.trim();
  if (required && !text) throw new InputError(`${label}不能为空`);
  if (text.length > max) throw new InputError(`${label}最多 ${max} 字，请缩短后再提交`);
  return text;
}

export function articleInput(body: Record<string, unknown>) {
  const topicId = field(body, 'topicId', 80, '专题', true);
  const topic = TOPICS.find((t) => t.id === topicId);
  if (!topic) throw new InputError('请选择有效的投稿专题');
  return {
    title: field(body, 'title', 100, '标题', true),
    content: field(body, 'content', 50_000, '正文', true),
    author: field(body, 'author', 30, '署名'),
    authorSeal: field(body, 'authorSeal', 4, '印章'),
    topicId,
    topicName: topic.name,
    seriesTitle: field(body, 'seriesTitle', 50, '专栏名称'),
    goldenQuote: field(body, 'goldenQuote', 200, '金句'),
  };
}

export function commentInput(body: Record<string, unknown>) {
  return {
    content: field(body, 'content', 1000, '评注', true),
    author: field(body, 'author', 30, '署名'),
    replyToId: field(body, 'replyToId', 128, '回复对象'),
  };
}

export async function sourceKey(request: Request): Promise<string> {
  const digest = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(request.headers.get('CF-Connecting-IP') || 'unknown'),
  );
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
