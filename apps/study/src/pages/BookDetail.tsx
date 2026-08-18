import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { BOOK_MAP, TIER_NAMES, STAGES } from '@/data/catalog';
import { loadIndex } from '@/lib/texts';
import { bookReadCount, getReadMap } from '@/lib/store';
import {
  BookOpen,
  Target,
  PenLine,
  Star,
  ChevronRight,
  Search,
  CheckCircle2,
  Bookmark,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

function ChapterListSkeleton() {
  return (
    <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 py-2 animate-pulse">
      {Array.from({ length: 12 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 py-2 px-2 border-b border-dashed border-border/40"
        >
          <Skeleton className="w-2 h-2 rounded-full shrink-0 bg-muted/60" />
          <Skeleton className="h-4 bg-muted/50 rounded" style={{ width: `${55 + (i % 5) * 9}%` }} />
        </div>
      ))}
    </div>
  );
}

// 把“精读篇目”模糊匹配到章节号
function normTitle(s: string): string {
  return s.replace(/[（(].*?[)）]/g, '').replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '');
}
function isSubseq(m: string, t: string): boolean {
  let i = 0;
  for (const c of t) if (c === m[i]) i++;
  return i >= m.length;
}
function matchChapter(must: string, chapters: string[]): number {
  const m = normTitle(must);
  if (m.length < 2) return -1;
  for (let i = 0; i < chapters.length; i++) {
    const t = normTitle(chapters[i]);
    if (t.includes(m) || m.includes(t)) return i;
  }
  if (m.length >= 3) {
    for (let i = 0; i < chapters.length; i++) {
      if (isSubseq(m, normTitle(chapters[i]))) return i;
    }
  }
  return -1;
}

const CHUNK_SIZE = 50;

export default function BookDetail() {
  const { bookId = '' } = useParams();
  const book = BOOK_MAP[bookId];
  const [chapters, setChapters] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [readMap, setReadMap] = useState<number[]>([]);
  const [onlyMust, setOnlyMust] = useState(false);
  const [activeChunk, setActiveChunk] = useState<number>(0); // 0 = 全部, 1 = 1-50, 2 = 51-100...

  useEffect(() => {
    const controller = new AbortController();
    setChapters(null);
    setError(false);
    setActiveChunk(0);
    setReadMap(getReadMap()[bookId] ?? []);
    loadIndex(bookId, controller.signal)
      .then(setChapters)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [bookId]);

  const mustMap = useMemo(() => {
    if (!chapters || !book) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const m of book.must) {
      const n = matchChapter(m, chapters);
      if (n >= 0 && !map.has(n)) map.set(n, m);
    }
    return map;
  }, [chapters, book]);

  // 计算章节分卷切片选项
  const chunks = useMemo(() => {
    if (!chapters || chapters.length <= 60) return [];
    const count = Math.ceil(chapters.length / CHUNK_SIZE);
    const list: { id: number; label: string; start: number; end: number }[] = [];
    for (let i = 0; i < count; i++) {
      const start = i * CHUNK_SIZE;
      const end = Math.min((i + 1) * CHUNK_SIZE, chapters.length);
      list.push({
        id: i + 1,
        label: `${start + 1}-${end}章`,
        start,
        end,
      });
    }
    return list;
  }, [chapters]);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    let arr = chapters.map((t, n) => ({ t, n }));

    // 搜索时忽略分卷限制
    if (!q && activeChunk > 0 && chunks.length > 0) {
      const chunk = chunks.find((c) => c.id === activeChunk);
      if (chunk) {
        arr = arr.slice(chunk.start, chunk.end);
      }
    }

    if (onlyMust) arr = arr.filter(({ n }) => mustMap.has(n));
    if (q) arr = arr.filter(({ t }) => t.includes(q));
    return arr;
  }, [chapters, q, onlyMust, mustMap, activeChunk, chunks]);

  if (!book) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center text-muted-foreground">
        未找到该书
      </div>
    );
  }
  const stage = STAGES[book.stage - 1];
  const readCount = bookReadCount(book.id);
  const firstUnread = chapters ? chapters.findIndex((_, n) => !readMap.includes(n)) : 0;
  const continueAt = firstUnread === -1 ? 0 : firstUnread;
  const percent = book.chapters ? Math.round((readCount / book.chapters) * 100) : 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
        <Link to="/books" className="hover:text-cinnabar transition-colors">
          书目
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground font-medium">{book.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8">
        {/* 元信息面板 */}
        <aside className="space-y-5">
          {/* 古典装帧概览卡片 */}
          <div className="book-spine-card p-6 relative bg-surface border rounded-xl shadow-xs">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="seal w-8 h-8 text-sm rounded-[4px] shrink-0 font-medium">
                  {book.dynasty.slice(0, 1)}
                </span>
                <h1 className="text-2xl font-bold text-foreground truncate">{book.title}</h1>
              </div>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-cinnabar/10 text-cinnabar font-medium shrink-0">
                {TIER_NAMES[book.tier]}
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4 flex-wrap">
              <span>
                {book.dynasty} · {book.author}
              </span>
              <span>·</span>
              <span className="px-2 py-0.5 rounded bg-dai/10 text-dai">{stage.name}</span>
              <span>·</span>
              <span>全 {book.chapters} 章</span>
            </div>

            <div className="pt-3 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                <span>研读进度</span>
                <span className="font-medium text-cinnabar">
                  {percent}% ({readCount}/{book.chapters}章)
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-cinnabar transition-all duration-500"
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>

            <Link
              to={`/book/${book.id}/read/${continueAt}`}
              className="mt-5 flex items-center justify-center gap-2 rounded-lg bg-cinnabar px-4 py-2.5 text-white hover:bg-cinnabar/90 shadow-sm transition-all text-sm font-medium"
            >
              <BookOpen className="w-4 h-4" />
              {readCount > 0 ? `继续阅读（第 ${continueAt + 1} 章）` : '开始研读'}
            </Link>
          </div>

          <InfoBlock
            icon={<Target className="w-4 h-4" />}
            title="为什么读它"
            text={book.why}
            accent
          />
          <InfoBlock icon={<BookOpen className="w-4 h-4" />} title="怎么读" text={book.how} />
          <InfoBlock icon={<PenLine className="w-4 h-4" />} title="仿写建议" text={book.practice} />

          {/* 精读研习篇目 */}
          <div className="bg-surface border rounded-xl p-5 shadow-xs">
            <h3 className="font-semibold flex items-center gap-2 text-sm mb-3">
              <Star className="w-4 h-4 text-cinnabar fill-cinnabar/20" /> 精读研习篇目
            </h3>
            <ul className="space-y-2">
              {book.must.map((m) => {
                const n = chapters ? matchChapter(m, chapters) : -1;
                const isRead = n >= 0 && readMap.includes(n);
                return (
                  <li key={m} className="text-sm flex items-center justify-between gap-2 py-0.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-cinnabar text-xs">◆</span>
                      {n >= 0 ? (
                        <Link
                          to={`/book/${book.id}/read/${n}`}
                          className="text-foreground/90 hover:text-cinnabar hover:underline truncate transition-colors"
                        >
                          {m}
                        </Link>
                      ) : (
                        <span className="text-foreground/80 truncate">{m}</span>
                      )}
                    </div>
                    {isRead ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-cinnabar shrink-0 bg-cinnabar/10 px-1.5 py-0.5 rounded">
                        <CheckCircle2 className="w-3 h-3" /> 已读
                      </span>
                    ) : (
                      <span className="text-[11px] text-muted-foreground shrink-0">待读</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {mustMap.size > 0 && (
              <button
                onClick={() => setOnlyMust((v) => !v)}
                className="mt-4 text-xs text-dai hover:text-cinnabar transition-colors flex items-center gap-1 font-medium"
              >
                <Bookmark className="w-3.5 h-3.5" />
                {onlyMust ? '查看完整目录 →' : `在目录中只看这 ${mustMap.size} 篇 →`}
              </button>
            )}
          </div>
        </aside>

        {/* 章节目录 */}
        <section className="bg-surface border rounded-xl p-6 min-h-[440px] shadow-xs flex flex-col">
          <div className="flex items-center justify-between mb-4 gap-3 flex-wrap border-b pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="font-semibold text-lg">
                章节目录
                {chapters ? (
                  <span className="text-sm font-normal text-muted-foreground ml-1.5">
                    ({filtered.length}
                    {onlyMust || activeChunk > 0 ? `/${chapters.length}` : ''}章)
                  </span>
                ) : (
                  ''
                )}
              </h2>
              {mustMap.size > 0 && (
                <button
                  onClick={() => setOnlyMust((v) => !v)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    onlyMust
                      ? 'bg-cinnabar text-white border-cinnabar'
                      : 'hover:border-cinnabar/50 text-muted-foreground bg-paper'
                  }`}
                >
                  精读 {mustMap.size} 篇
                </button>
              )}
            </div>

            <div className="relative min-w-[160px] sm:min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索章节名..."
                className="pl-8 pr-3 py-1.5 rounded-lg border bg-paper text-sm w-full outline-none focus:border-cinnabar/60 transition-colors"
              />
            </div>
          </div>

          {/* 大部头分卷切片导航 */}
          {chunks.length > 0 && !q && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-3 mb-3 border-b text-xs scrollbar-none">
              <button
                onClick={() => setActiveChunk(0)}
                className={`px-3 py-1 rounded-md shrink-0 transition-colors ${
                  activeChunk === 0
                    ? 'bg-cinnabar text-white font-medium'
                    : 'bg-paper text-muted-foreground hover:text-foreground'
                }`}
              >
                全部章节
              </button>
              {chunks.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChunk(c.id)}
                  className={`px-2.5 py-1 rounded-md shrink-0 transition-colors ${
                    activeChunk === c.id
                      ? 'bg-cinnabar text-white font-medium'
                      : 'bg-paper text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {error && (
            <p className="text-muted-foreground py-12 text-center text-sm">
              文本加载失败，请检查网络后刷新重试
            </p>
          )}

          {!chapters && !error && <ChapterListSkeleton />}

          {chapters && (
            <div className="grid sm:grid-cols-2 gap-x-6 max-h-[72vh] overflow-y-auto chapter-nav pr-2 flex-1">
              {filtered.map(({ t, n }) => {
                const done = readMap.includes(n);
                const isMust = mustMap.has(n);
                return (
                  <Link
                    key={n}
                    to={`/book/${book.id}/read/${n}`}
                    className={`flex items-center gap-2.5 py-2.5 px-2 rounded-md text-sm border-b border-dashed border-border/70 hover:bg-cinnabar/5 transition-colors group ${
                      done ? 'text-muted-foreground' : 'text-foreground/90'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        done
                          ? 'bg-cinnabar'
                          : isMust
                            ? 'bg-amber-500 ring-2 ring-amber-500/20'
                            : 'bg-border'
                      }`}
                    />
                    <span
                      className={`truncate ${isMust ? 'font-medium text-foreground' : ''} group-hover:text-cinnabar transition-colors`}
                    >
                      {t}
                    </span>
                    {isMust && (
                      <Star className="w-3 h-3 text-amber-500 fill-amber-500/20 shrink-0 ml-auto" />
                    )}
                    {done && (
                      <span className="text-[10px] text-muted-foreground shrink-0 ml-auto">
                        已读
                      </span>
                    )}
                  </Link>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-10 col-span-2 text-center">
                  没有找到匹配的章节
                </p>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  text,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`border rounded-xl p-5 shadow-xs ${
        accent ? 'bg-cinnabar/[0.03] border-cinnabar/30' : 'bg-surface'
      }`}
    >
      <h3 className="font-semibold flex items-center gap-2 text-sm mb-2 text-cinnabar">
        {icon} {title}
      </h3>
      <p className="text-sm leading-7 text-foreground/85">{text}</p>
    </div>
  );
}
