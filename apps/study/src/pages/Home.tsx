import { Link } from 'react-router';
import { BOOKS, STAGES, TIER_NAMES } from '@/data/catalog';
import quotes from '@/data/quotes.json';
import { useMemo, useState } from 'react';
import {
  ArrowRight,
  RefreshCw,
  Sparkles,
  Copy,
  Check,
  BookOpen,
  Layers,
  Target,
  Feather,
} from 'lucide-react';
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
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

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

  const handleCopyQuote = (text: string, source: string, index: number) => {
    navigator.clipboard.writeText(`「${text}」 —— ${source}`);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b bg-paper/30">
        <div className="pointer-events-none absolute right-8 top-10 hidden lg:flex gap-4 opacity-[0.09] select-none">
          {['晓声', '识器', '操千曲', '观千剑'].map((t) => (
            <span key={t} className="writing-vertical font-brush text-7xl text-cinnabar">
              {t}
            </span>
          ))}
        </div>

        <div className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cinnabar/20 bg-cinnabar/5 text-xs text-cinnabar font-medium mb-6">
            <Feather className="w-3.5 h-3.5" /> 读书破万卷 · 下笔如有神
          </div>

          <h1 className="font-brush text-5xl md:text-7xl leading-tight">
            为古风写作<span className="text-cinnabar">而读</span>
          </h1>

          <p className="mt-6 max-w-2xl text-muted-foreground leading-8 text-base md:text-lg">
            不做泛泛的古籍图书馆。四十三部经典，每一部都回答三个核心问题：
            <span className="text-foreground font-semibold"> 为什么读、怎么读、仿什么写</span>。
            从对仗启蒙到红楼融通，铺就一条清晰可循的文人进阶之路。
          </p>

          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              to="/path"
              className="inline-flex items-center gap-2 rounded-lg bg-cinnabar px-6 py-3 text-white font-medium hover:bg-cinnabar/90 shadow-sm transition-all"
            >
              查看进阶路径 <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/books"
              className="inline-flex items-center gap-2 rounded-lg border border-cinnabar/40 text-cinnabar px-6 py-3 font-medium bg-surface hover:bg-cinnabar/5 transition-all shadow-xs"
            >
              进入文林书库
            </Link>
          </div>

          {/* 数据看板 */}
          <div className="mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl">
            <div className="bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <BookOpen className="w-3.5 h-3.5 text-cinnabar" /> 收录典籍
              </div>
              <p className="text-2xl font-bold text-foreground">
                {BOOKS.length} <span className="text-xs font-normal text-muted-foreground">部</span>
              </p>
            </div>

            <div className="bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Layers className="w-3.5 h-3.5 text-cinnabar" /> 全文篇章
              </div>
              <p className="text-2xl font-bold text-foreground">
                {TOTAL_CHAPTERS}{' '}
                <span className="text-xs font-normal text-muted-foreground">章</span>
              </p>
            </div>

            <div className="bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Target className="w-3.5 h-3.5 text-cinnabar" /> 阶梯层次
              </div>
              <p className="text-2xl font-bold text-foreground">
                {STAGES.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">阶段</span>
              </p>
            </div>

            <div className="bg-surface/80 backdrop-blur border rounded-xl p-4 shadow-xs">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Feather className="w-3.5 h-3.5 text-cinnabar" /> 仿写实战
              </div>
              <p className="text-2xl font-bold text-foreground">
                {DRILLS.length}{' '}
                <span className="text-xs font-normal text-muted-foreground">练习</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 今日美句 */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cinnabar" /> 今日美句
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              每日精选古典名句，可作灵感摘抄或对偶练习
            </p>
          </div>
          <button
            onClick={() => setShift((s) => s + 1)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs text-muted-foreground hover:text-cinnabar hover:border-cinnabar/40 bg-surface transition-all shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 换一组
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {todayQuotes.map((q, i) => (
            <div
              key={i}
              className="bg-surface border rounded-xl p-6 relative overflow-hidden shadow-xs hover:border-cinnabar/40 transition-colors group flex flex-col justify-between"
            >
              <span className="absolute -right-2 -top-4 font-brush text-8xl text-cinnabar/5 select-none pointer-events-none">
                句
              </span>
              <p className="text-lg leading-9 font-serif text-foreground/90">{q.text}</p>
              <div className="mt-4 pt-3 border-t flex items-center justify-between">
                <p className="text-xs text-muted-foreground font-medium">—— {q.source}</p>
                <button
                  onClick={() => handleCopyQuote(q.text, q.source, i)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-cinnabar transition-colors"
                  title="复制金句"
                >
                  {copiedIndex === i ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-cinnabar" />
                      <span className="text-cinnabar">已复制</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>复制</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 四阶段 */}
      <section className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">四段进阶路径</h2>
            <p className="text-xs text-muted-foreground mt-1">
              从声律对仗到鸿篇巨制，有法可循的创作阶梯
            </p>
          </div>
          <Link
            to="/path"
            className="text-xs text-cinnabar hover:underline inline-flex items-center gap-1 font-medium"
          >
            完整路径解析 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((s) => {
            const count = BOOKS.filter((b) => b.stage === s.n).length;
            return (
              <Link
                key={s.n}
                to={`/path#stage-${s.n}`}
                className="group bg-surface border rounded-xl p-5 hover:border-cinnabar/50 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-2.5 mb-3">
                    <span className="seal w-7 h-7 text-sm">
                      {['壹', '贰', '叁', '肆'][s.n - 1]}
                    </span>
                    <span className="font-bold text-base group-hover:text-cinnabar transition-colors">
                      {s.name}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-6">{s.goal}</p>
                </div>
                <div className="mt-4 pt-3 border-t flex items-center justify-between text-xs text-dai font-medium">
                  <span>收录 {count} 部书</span>
                  <span className="group-hover:translate-x-0.5 transition-transform">探索 →</span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 精选书库 */}
      <section className="mx-auto max-w-6xl px-4 py-8 mb-8">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">精选推荐典籍</h2>
            <p className="text-xs text-muted-foreground mt-1">古风写作入门与融通之必读经典</p>
          </div>
          <Link
            to="/books"
            className="text-xs text-cinnabar hover:underline inline-flex items-center gap-1 font-medium"
          >
            查看全部 {BOOKS.length} 部典籍 <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((b) => {
            const read = bookReadCount(b.id);
            const percent = b.chapters ? Math.round((read / b.chapters) * 100) : 0;

            return (
              <Link
                key={b.id}
                to={`/book/${b.id}`}
                className="book-spine-card p-6 bg-surface border rounded-xl hover:border-cinnabar/40 hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="seal w-7 h-7 text-xs rounded-[3px] shrink-0 font-medium">
                        {b.dynasty.slice(0, 1)}
                      </span>
                      <h3 className="text-lg font-bold text-foreground group-hover:text-cinnabar transition-colors truncate">
                        {b.title}
                      </h3>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-dai/10 text-dai font-medium shrink-0">
                      {TIER_NAMES[b.tier]}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1">
                    {b.dynasty} · {b.author} · {b.chapters} 章
                  </p>

                  <p className="mt-3 text-xs md:text-sm text-muted-foreground leading-6 line-clamp-2">
                    {b.why}
                  </p>
                </div>

                <div className="mt-5 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <div className="flex items-center gap-1.5">
                      {b.tags.slice(0, 2).map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                    <span className="text-[11px] text-muted-foreground group-hover:text-cinnabar transition-colors font-medium">
                      {read > 0 ? `已读 ${read}/${b.chapters} 章 (${percent}%)` : '开始研读 →'}
                    </span>
                  </div>

                  {read > 0 && (
                    <div className="h-1 rounded-full bg-secondary overflow-hidden mt-1.5">
                      <div
                        className="h-full bg-cinnabar transition-all duration-300"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
