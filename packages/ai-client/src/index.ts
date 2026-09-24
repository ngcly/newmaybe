export const AI_STORAGE_KEYS = {
  provider: 'newmaybe_ai_provider',
  model: 'newmaybe_ai_model',
  apiKey: 'newmaybe_api_key',
  customBaseUrl: 'newmaybe_custom_base_url',
} as const;

/**
 * Shared by browser clients and the free Worker endpoint. Keeping this below
 * the Worker's byte limit leaves enough room for UTF-8 encoding and JSON.
 */
export const AI_MAX_TOTAL_CHARS = 7_000;
export const AI_MAX_MESSAGES = 30;
export const AI_MAX_BODY_BYTES = 32 * 1024;

export function createGeminiRequest(
  baseUrl: string,
  model: string,
  apiKey: string,
): { url: string; headers: Record<string, string> } {
  const cleanBaseUrl = (baseUrl || 'https://generativelanguage.googleapis.com').replace(/\/$/, '');
  return {
    url: `${cleanBaseUrl}/v1beta/models/${model}:generateContent`,
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
    },
  };
}

interface ChatMessageLike {
  role: string;
  content: string;
}

/** Keep the system prompt plus the newest conversation turns within a limit. */
export function fitMessagesToCharBudget<T extends ChatMessageLike>(
  messages: T[],
  maxChars = AI_MAX_TOTAL_CHARS,
): T[] {
  let low = 0;
  let high = Math.min(maxChars, AI_MAX_TOTAL_CHARS);
  let fitted = fitMessages(messages, high);
  const encoder = new TextEncoder();
  const fits = (value: T[]) =>
    encoder.encode(JSON.stringify({ messages: value })).byteLength <= AI_MAX_BODY_BYTES;
  if (fits(fitted)) return fitted;

  // Escaped control characters can take six JSON bytes per character.
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (fits(fitMessages(messages, middle))) low = middle;
    else high = middle - 1;
  }
  fitted = fitMessages(messages, low);
  return fitted;
}

function fitMessages<T extends ChatMessageLike>(messages: T[], maxChars: number): T[] {
  if (maxChars <= 0 || messages.length === 0) return [];

  const systemIndex = messages.findIndex((message) => message.role === 'system');
  const systemMessage = systemIndex >= 0 ? messages[systemIndex] : undefined;
  const conversation = messages
    .filter((message, index) => index !== systemIndex && message.content.length > 0)
    .slice(-(AI_MAX_MESSAGES - (systemMessage ? 1 : 0)));
  const latestLength = conversation.at(-1)?.content.length ?? 0;
  const latestReserve = Math.min(latestLength, Math.floor(maxChars / 3));

  let remaining = maxChars;
  let fittedSystem: T | undefined;
  if (systemMessage) {
    const systemBudget = Math.max(0, maxChars - latestReserve);
    fittedSystem = {
      ...systemMessage,
      content: systemMessage.content.slice(0, systemBudget),
    };
    remaining -= fittedSystem.content.length;
  }

  const fittedConversation: T[] = [];
  for (let index = conversation.length - 1; index >= 0 && remaining > 0; index -= 1) {
    const message = conversation[index];
    const truncated = message.content.length > remaining;
    fittedConversation.unshift({
      ...message,
      content: truncated ? message.content.slice(-remaining) : message.content,
    });
    remaining -= Math.min(message.content.length, remaining);
    if (truncated) break;
  }

  return fittedSystem?.content ? [fittedSystem, ...fittedConversation] : fittedConversation;
}

interface AIResponsePayload {
  error?: string | { message?: string };
  message?: string;
  response?: string;
  text?: string;
  content?: string;
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
    finish_reason?: string | null;
  }>;
}

function extractText(payload: AIResponsePayload): string {
  return (
    payload.response ??
    payload.text ??
    payload.content ??
    payload.choices?.[0]?.message?.content ??
    payload.choices?.[0]?.delta?.content ??
    ''
  );
}

export async function readAIResponse(
  response: Response,
  onToken?: (token: string, accumulated: string) => void,
): Promise<string> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string | { message?: string };
    };
    const error = typeof payload.error === 'string' ? payload.error : payload.error?.message;
    throw new Error(error || `AI request failed (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('text/event-stream')) {
    const payload = (await response.json()) as AIResponsePayload;
    if (payload.error)
      throw new Error(
        typeof payload.error === 'string' ? payload.error : payload.error.message || 'AI 回复失败',
      );
    const text = extractText(payload);
    if (text) onToken?.(text, text);
    return text;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';
  let eventName = '';
  let eventData: string[] = [];
  let completed = false;

  const dispatch = (): boolean => {
    const data = eventData.join('\n').trim();
    const isError = eventName === 'error';
    eventName = '';
    eventData = [];
    if (data === '[DONE]') {
      completed = true;
      return true;
    }
    if (!data) return false;
    let payload: AIResponsePayload;
    try {
      payload = JSON.parse(data) as AIResponsePayload;
    } catch {
      throw new Error(isError ? data : 'AI 回复格式损坏，请重试。');
    }
    if (isError || payload.error) {
      const error = typeof payload.error === 'string' ? payload.error : payload.error?.message;
      throw new Error(error || payload.message || 'AI 回复失败，请重试。');
    }
    const token = extractText(payload);
    if (token) {
      result += token;
      onToken?.(token, result);
    }
    if (payload.choices?.some((choice) => choice.finish_reason)) completed = true;
    return false;
  };

  const consume = (line: string): boolean => {
    if (!line) return dispatch();
    if (line.startsWith('event:')) eventName = line.slice(6).trim();
    if (line.startsWith('data:')) eventData.push(line.slice(5).replace(/^ /, ''));
    return false;
  };

  try {
    while (true) {
      const chunk = await reader.read();
      buffer += decoder.decode(chunk.value, { stream: !chunk.done });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (consume(line)) return result;
      }
      if (chunk.done) {
        if (buffer) consume(buffer);
        dispatch();
        if (!completed) throw new Error('AI 回复意外中断，请重试。');
        return result;
      }
    }
  } finally {
    await reader.cancel().catch(() => {});
    reader.releaseLock();
  }
}
