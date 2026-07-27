// 本地存储：阅读进度、打卡、仿写草稿
const KEY_READ = 'linxia:read';
const KEY_CHECKIN = 'linxia:checkin';
const KEY_DRAFTS = 'linxia:drafts';
const KEY_DONE = 'linxia:drilldone';

function read<T>(k: string, def: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : def;
  } catch {
    return def;
  }
}

export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function readRecord(k: string): Record<string, unknown> {
  const value = read<unknown>(k, {});
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}
function write(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* ignore */
  }
}

export type ReadMap = Record<string, number[]>;

export function getReadMap(): ReadMap {
  const value = readRecord(KEY_READ);
  return Object.fromEntries(
    Object.entries(value).map(([bookId, chapters]) => [
      bookId,
      Array.isArray(chapters)
        ? [...new Set(chapters.filter((n): n is number => Number.isInteger(n) && n >= 0))]
        : [],
    ]),
  );
}
export function isChapterRead(bookId: string, n: number): boolean {
  return (getReadMap()[bookId] ?? []).includes(n);
}
export function markChapterRead(bookId: string, n: number, forceRead?: boolean) {
  const m = getReadMap();
  const arr = new Set(m[bookId] ?? []);
  const wasRead = arr.has(n);
  const shouldRead = forceRead !== undefined ? forceRead : !arr.has(n);
  if (shouldRead) {
    arr.add(n);
    m[bookId] = [...arr];
    write(KEY_READ, m);
    if (!wasRead) touchCheckin();
  } else {
    arr.delete(n);
    m[bookId] = [...arr];
    write(KEY_READ, m);
  }
}
export function bookReadCount(bookId: string): number {
  return (getReadMap()[bookId] ?? []).length;
}
export function totalReadCount(): number {
  return Object.values(getReadMap()).reduce((s, a) => s + a.length, 0);
}

// 打卡：{ "2026-07-20": 3 } -> 当日已读章节数
export function getCheckins(): Record<string, number> {
  const value = readRecord(KEY_CHECKIN);
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, number] =>
        /^\d{4}-\d{2}-\d{2}$/.test(entry[0]) &&
        typeof entry[1] === 'number' &&
        Number.isFinite(entry[1]) &&
        entry[1] >= 0,
    ),
  );
}
export function touchCheckin() {
  const c = getCheckins();
  const d = localDateKey();
  c[d] = (c[d] ?? 0) + 1;
  write(KEY_CHECKIN, c);
}
export function streakDays(): number {
  const c = getCheckins();
  let streak = 0;
  const d = new Date();
  for (;;) {
    const key = localDateKey(d);
    if (c[key]) {
      streak++;
      d.setDate(d.getDate() - 1);
    } else if (streak === 0) {
      d.setDate(d.getDate() - 1);
      if (!c[localDateKey(d)]) break;
    } else break;
  }
  return streak;
}

// 仿写草稿
export type DraftMap = Record<string, string>;
export function getDrafts(): DraftMap {
  const value = readRecord(KEY_DRAFTS);
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}
export function saveDraft(id: string, text: string) {
  const d = getDrafts();
  d[id] = text;
  write(KEY_DRAFTS, d);
}
export function getDrillDone(): string[] {
  const value = read<unknown>(KEY_DONE, []);
  return Array.isArray(value)
    ? [...new Set(value.filter((id): id is string => typeof id === 'string'))]
    : [];
}
export function toggleDrillDone(id: string): boolean {
  const arr = new Set(getDrillDone());
  let next = false;
  if (arr.has(id)) {
    arr.delete(id);
  } else {
    arr.add(id);
    next = true;
  }
  write(KEY_DONE, [...arr]);
  return next;
}
