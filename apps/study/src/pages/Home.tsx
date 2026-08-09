import { Link } from 'react-router';
import { BOOKS, STAGES, TIER_NAMES } from '@/data/catalog';
import quotes from '@/data/quotes.json';
import { useMemo, useState } from 'react';
import { ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { bookReadCount, localDateKey } from '@/lib/store';
import { DRILLS } from '@/data/practice';

interface Quote {
  text: string;
  source: string;
}

function dayIndex(offset = 0) {
  const [year, month, day] = localDateKey().split('-').map(Number);
  const days = Date.UTC(year, month - 1, day) / 86400000;
  return (days + offset) % (quotes as Quote[]).length;
}

const TOTAL_CHAPTERS = BOOKS.reduce((sum, book) => sum + book.chapters, 0);

export default function Home() {
  const [shift, setShift] = useState(0);
  const todayQuotes = useMemo(
    () => [0, 1].map((i) => (quotes as Quote[])[dayIndex(i + shift * 2)]),
    [shift],
  );
  const featured = useMemo(
    () =>
      BOOKS.filter((b) =>
        [
          'tang300',
          'guwenguanzhi',
          'songci300',
          'shishuoxinyu',
          'hongloumeng',
          'liaozhai',
        ].includes(b.id),
      ),
    [],
  );

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b">
        <div className="pointer-events-none absolute right-6 top-6 hidden lg:flex gap-3 opacity-[0.13] select-none">
          {['晓声', '识器', '操千曲', '观千剑'].map((t) => (
            <span key={t} className="writing-vertical font-brush text-6xl text-cinnabar">
              {t}
            </span>
          ))}
        </div>
        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <p className="text-sm tracking-[0.5em] text-dai mb-4">读 破 千 卷，下 笔 有 神</p>
          <h1 className="font-brush text-5xl md:text-7xl leading-tight">
            为古风写作<span className="text-cinnabar">而读</span>
          </h1>
          <p className="mt-6 max-w-xl text-muted-foreground leading-8">
            不做泛泛的古籍图书馆。四十三部书，每一部都回答三个问题：
            <em className="text-foreground not-italic font-medium">为什么读、怎么读、仿什么写</em>。
            从对仗启蒙到红楼融通，一条清晰可循的进阶路径。
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/path"
              className="inline-flex items-center gap-2 rounded-md bg-cinnabar px-5 py-2.5 text-white hover:bg-cinnabar/90 transition-colors"
            >
              查看进阶路径 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 rounded-md border border-cinnabar/40 text-cinnabar px-5 py-2.5 hover:bg-cinnabar/5 transition-colors"
            >
              进入书库
            </Link>
          </div>
          <div className="mt-10 flex gap-8 text-sm">
            <div>
              <span className="text-2xl font-semibold text-cinnabar">{BOOKS.length}</span>
              <span className="ml-1.5 text-muted-foreground">部古籍</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-cinnabar">{TOTAL_CHAPTERS}</span>
              <span className="ml-1.5 text-muted-foreground">章全文</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-cinnabar">{STAGES.length}</span>
              <span className="ml-1.5 text-muted-foreground">进阶阶段</span>
            </div>
            <div>
              <span className="text-2xl font-semibold text-cinnabar">{DRILLS.length}</span>
              <span className="ml-1.5 text-muted-foreground">仿写练习</span>
            </div>
          </div>
        </div>
      </section>

      {/* 今日美句 */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between mb-5">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cinnabar" /> 今日美句
          </h2>
          <button
            onClick={() => setShift((s) => s + 1)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-cinnabar transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 换一组
          </button>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {todayQuotes.map((q, i) => (
            <div key={i} className="bg-surface border rounded-lg p-6 relative overflow-hidden">
              <span className="absolute -right-2 -top-4 font-brush text-7xl text-cinnabar/5 select-none">
                句
              </span>
              <p className="text-lg leading-9">{q.text}</p>
              <p className="mt-3 text-sm text-muted-foreground">—— {q.source}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 四阶段 */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl font-semibold">四段进阶路径</h2>
          <Link
            to="/path"
            className="text-sm text-cinnabar hover:underline inline-flex items-center gap-1"
          >
            完整路径 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((s) => {
            const count = BOOKS.filter((b) => b.stage === s.n).length;
            return (
              <Link
                key={s.n}
                to={`/path#stage-${s.n}`}
                className="group bg-surface border rounded-lg p-5 hover:border-cinnabar/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <span className="seal w-7 h-7 text-sm">{['壹', '贰', '叁', '肆'][s.n - 1]}</span>
                  <span className="font-semibold">{s.name}</span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-6">{s.goal}</p>
                <p className="mt-3 text-xs text-dai">{count} 部书 →</p>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 精选书库 */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <h2 className="text-xl font-semibold">入门先读这六部</h2>
          <Link
            to="/books"
            className="text-sm text-cinnabar hover:underline inline-flex items-center gap-1"
          >
            全部书目 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featured.map((b) => {
            const read = bookReadCount(b.id);
            return (
              <Link
                key={b.id}
                to={`/book/${b.id}`}
                className="bg-surface border rounded-lg p-5 hover:border-cinnabar/50 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{b.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {b.dynasty} · {b.author} · {b.chapters} 章
                    </p>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-dai/10 text-dai shrink-0">
                    {TIER_NAMES[b.tier]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground leading-6 line-clamp-2">{b.why}</p>
                {read > 0 && (
                  <p className="mt-3 text-xs text-cinnabar">
                    已读 {read}/{b.chapters} 章
                  </p>
                )}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
