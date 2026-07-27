import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import { BOOK_MAP, TIER_NAMES, STAGES } from '@/data/catalog';
import { loadIndex } from '@/lib/texts';
import { bookReadCount, getReadMap } from '@/lib/store';
import { BookOpen, Target, PenLine, Star, ChevronRight, Search } from 'lucide-react';
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

export default function BookDetail() {
  const { bookId = '' } = useParams();
  const book = BOOK_MAP[bookId];
  const [chapters, setChapters] = useState<string[] | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState('');
  const [readMap, setReadMap] = useState<number[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    setChapters(null);
    setError(false);
    setReadMap(getReadMap()[bookId] ?? []);
    loadIndex(bookId, controller.signal)
      .then(setChapters)
      .catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === 'AbortError')) setError(true);
      });
    return () => controller.abort();
  }, [bookId]);

  const [onlyMust, setOnlyMust] = useState(false);

  const mustMap = useMemo(() => {
    if (!chapters || !book) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const m of book.must) {
      const n = matchChapter(m, chapters);
      if (n >= 0 && !map.has(n)) map.set(n, m);
    }
    return map;
  }, [chapters, book]);

  const filtered = useMemo(() => {
    if (!chapters) return [];
    let arr = chapters.map((t, n) => ({ t, n }));
    if (onlyMust) arr = arr.filter(({ n }) => mustMap.has(n));
    if (q) arr = arr.filter(({ t }) => t.includes(q));
    return arr;
  }, [chapters, q, onlyMust, mustMap]);

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

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <nav className="text-sm text-muted-foreground mb-6 flex items-center gap-1.5">
        <Link to="/books" className="hover:text-cinnabar">
          书目
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-foreground">{book.title}</span>
      </nav>

      <div className="grid lg:grid-cols-[360px_1fr] gap-8">
        {/* 元信息面板 */}
        <aside className="space-y-4">
          <div className="bg-surface border rounded-lg p-6">
            <div className="flex items-start gap-4">
              <span className="seal w-12 h-12 text-2xl shrink-0">{book.title[0]}</span>
              <div>
                <h1 className="text-2xl font-bold">{book.title}</h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {book.dynasty} · {book.author}
                </p>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-cinnabar/10 text-cinnabar">
                    {TIER_NAMES[book.tier]}
                  </span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-dai/10 text-dai">
                    {stage.name}
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-4 h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full bg-cinnabar transition-all"
                style={{ width: `${book.chapters ? (readCount / book.chapters) * 100 : 0}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              已读 {readCount} / {book.chapters} 章
            </p>
            <Link
              to={`/book/${book.id}/read/${continueAt}`}
              className="mt-4 flex items-center justify-center gap-2 rounded-md bg-cinnabar px-4 py-2.5 text-white hover:bg-cinnabar/90 transition-colors"
            >
              <BookOpen className="w-4 h-4" />
              {readCount > 0 ? '继续阅读' : '开始阅读'}
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

          <div className="bg-surface border rounded-lg p-5">
            <h3 className="font-semibold flex items-center gap-2 text-sm mb-3">
              <Star className="w-4 h-4 text-cinnabar" /> 精读研习篇目
            </h3>
            <ul className="space-y-1.5">
              {book.must.map((m) => {
                const n = chapters ? matchChapter(m, chapters) : -1;
                return (
                  <li key={m} className="text-sm flex gap-2 items-baseline">
                    <span className="text-cinnabar">·</span>
                    {n >= 0 ? (
                      <Link
                        to={`/book/${book.id}/read/${n}`}
                        className="text-cinnabar hover:underline"
                      >
                        {m}
                      </Link>
                    ) : (
                      <span className="text-foreground/80">{m}</span>
                    )}
                  </li>
                );
              })}
            </ul>
            {mustMap.size > 0 && (
              <button
                onClick={() => setOnlyMust(true)}
                className="mt-3 text-xs text-dai hover:text-cinnabar transition-colors"
              >
                在目录中只看这 {mustMap.size} 篇 →
              </button>
            )}
          </div>
        </aside>

        {/* 章节目录 */}
        <section className="bg-surface border rounded-lg p-6 min-h-[400px]">
          <div className="flex items-center justify-between mb-4 gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <h2 className="font-semibold">
                章节目录
                {chapters ? `（${filtered.length}${onlyMust ? `/${chapters.length}` : ''}）` : ''}
              </h2>
              {mustMap.size > 0 && (
                <button
                  onClick={() => setOnlyMust((v) => !v)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                    onlyMust
                      ? 'bg-cinnabar text-white border-cinnabar'
                      : 'hover:border-cinnabar/50 text-muted-foreground'
                  }`}
                >
                  只看精读 {mustMap.size} 篇
                </button>
              )}
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="找章节"
                className="pl-8 pr-3 py-1.5 rounded-md border bg-paper text-sm w-40 outline-none focus:border-cinnabar/60"
              />
            </div>
          </div>
          {error && (
            <p className="text-muted-foreground py-10 text-center">文本加载失败，请稍后重试</p>
          )}
          {!chapters && !error && <ChapterListSkeleton />}
          {chapters && (
            <div className="grid sm:grid-cols-2 gap-x-6 max-h-[70vh] overflow-y-auto chapter-nav pr-2">
              {filtered.map(({ t, n }) => {
                const done = readMap.includes(n);
                const isMust = mustMap.has(n);
                return (
                  <Link
                    key={n}
                    to={`/book/${book.id}/read/${n}`}
                    className={`flex items-center gap-2 py-2 px-2 rounded text-sm border-b border-dashed border-border/70 hover:bg-cinnabar/5 transition-colors ${
                      done ? 'text-muted-foreground' : ''
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${done ? 'bg-cinnabar' : isMust ? 'bg-amber-500' : 'bg-border'}`}
                    />
                    <span className={`truncate ${isMust ? 'font-medium' : ''}`}>{t}</span>
                    {isMust && <Star className="w-3 h-3 text-amber-500 shrink-0 ml-auto" />}
                  </Link>
                );
              })}
              {filtered.length === 0 && (
                <p className="text-sm text-muted-foreground py-6 col-span-2 text-center">
                  无匹配章节
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
      className={`border rounded-lg p-5 ${accent ? 'bg-cinnabar/[0.04] border-cinnabar/25' : 'bg-surface'}`}
    >
      <h3 className="font-semibold flex items-center gap-2 text-sm mb-2 text-cinnabar">
        {icon} {title}
      </h3>
      <p className="text-sm leading-7 text-foreground/85">{text}</p>
    </div>
  );
}
