import type { Message } from '../types';

export function loadConversation(key: string): Message[] | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value) || !value.every(isMessage)) return null;
    return value;
  } catch {
    return null;
  }
}

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === 'string' &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.text === 'string' &&
    typeof message.timestamp === 'string' &&
    (message.references === undefined ||
      (Array.isArray(message.references) &&
        message.references.every((reference) => {
          if (!reference || typeof reference !== 'object') return false;
          return ['type', 'title', 'url'].every((key) => typeof reference[key] === 'string');
        })))
  );
}
