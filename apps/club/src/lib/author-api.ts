import type { AuthorAccount, Manuscript, ManuscriptDraft, ManuscriptRevision } from '../types';

export class AuthorAPIError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function call<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/${path}`, {
      method,
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { 'Content-Type': 'application/json', 'X-Club-Request': '1' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new AuthorAPIError('网络连接失败，文稿仍保留在当前页面，请重试', 0);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data)
    throw new AuthorAPIError(data?.error || '服务暂时无法读取，请稍后重试', response.status);
  return data;
}
export const AuthorAPI = {
  me: () => call<{ user: AuthorAccount | null }>('auth/me'),
  code: (email: string) => call<{ challengeId: string }>('auth/code', 'POST', { email }),
  verify: (email: string, challengeId: string, code: string) =>
    call('auth/verify', 'POST', { email, challengeId, code }),
  logout: () => call('auth/logout', 'POST', {}),
  profile: (penName: string) => call<{ user: AuthorAccount }>('auth/profile', 'PUT', { penName }),
  list: (admin = false, offset = 0, status = 'all') =>
    call<{ manuscripts: Manuscript[]; nextOffset: number | null }>(
      `${admin ? 'admin/' : ''}manuscripts?offset=${offset}&status=${status}`,
    ),
  get: (id: string, admin = false) =>
    call<{ manuscript: Manuscript }>(`${admin ? 'admin/' : ''}manuscripts/${id}`),
  create: () => call<{ manuscript: Manuscript }>('manuscripts', 'POST', {}),
  save: (id: string, version: number, draft: ManuscriptDraft) =>
    call<{ manuscript: Manuscript }>(`manuscripts/${id}`, 'PUT', { ...draft, version }),
  action: (id: string, version: number, action: string, admin = false, note = '') =>
    call<{ manuscript: Manuscript }>(
      `${admin ? 'admin/' : ''}manuscripts/${id}/${action}`,
      'POST',
      { version, note },
    ),
  remove: (id: string, version: number) => call(`manuscripts/${id}`, 'DELETE', { version }),
  revisions: (id: string, admin = false) =>
    call<{ revisions: ManuscriptRevision[] }>(
      `${admin ? 'admin/' : ''}manuscripts/${id}/revisions`,
    ),
};

export const manuscriptBackupKey = (authorId: string, manuscriptId: string) =>
  `club:backup:${authorId}:${manuscriptId}`;
