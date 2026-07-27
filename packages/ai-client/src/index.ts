export const AI_STORAGE_KEYS = {
  provider: 'newmaybe_ai_provider',
  model: 'newmaybe_ai_model',
  apiKey: 'newmaybe_api_key',
  customBaseUrl: 'newmaybe_custom_base_url',
} as const;

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
    const token = extractText(JSON.parse(data) as AIResponsePayload);
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
    buffer = chunk.done ? '' : (lines.pop() ?? '');
    for (const line of lines) {
      if (consume(line)) return result;
    }
    if (chunk.done) {
      if (buffer) consume(buffer);
      return result;
    }
  }
}
