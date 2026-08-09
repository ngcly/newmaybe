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
  if (maxChars <= 0 || messages.length === 0) return [];

  const systemIndex = messages.findIndex((message) => message.role === 'system');
  const systemMessage = systemIndex >= 0 ? messages[systemIndex] : undefined;
  const conversation = messages.filter((_, index) => index !== systemIndex);
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

  return fittedSystem ? [fittedSystem, ...fittedConversation] : fittedConversation;
}

interface AIResponsePayload {
  response?: string;
  text?: string;
  content?: string;
  choices?: Array<{
    message?: { content?: string };
    delta?: { content?: string };
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
    const text = extractText(payload);
    if (text) onToken?.(text, text);
    return text;
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('Response body is not readable');

  const decoder = new TextDecoder();
  let buffer = '';
  let result = '';

  const consume = (line: string): boolean => {
    if (!line.startsWith('data:')) return false;
    const data = line.slice(5).trim();
    if (data === '[DONE]') return true;
    if (!data) return false;
    let token: string;
    try {
      token = extractText(JSON.parse(data) as AIResponsePayload);
    } catch {
      return false;
    }
    if (token) {
      result += token;
      onToken?.(token, result);
    }
    return false;
  };

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
      return result;
    }
  }
}
