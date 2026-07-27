import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BOOKS, STAGES, type Tier } from '@/data/catalog';
import { bookReadCount } from '@/lib/store';
import { Search } from 'lucide-react';

const TIER_FILTERS: { key: Tier | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'core', label: '核心书库' },
  { key: 'novel', label: '小说杂著' },
  { key: 'tool', label: '工具启蒙' },
  { key: 'extra', label: '拓展选读' },
];

export default function Books() {
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    return BOOKS.filter((b) => {
      if (tier !== 'all' && b.tier !== tier) return false;
      if (q && !`${b.title}${b.author}${b.tags.join()}`.includes(q)) return false;
      return true;
    }).sort((a, b) => a.stage - b.stage);
  }, [tier, q]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-brush text-4xl mb-2">进阶书目</h1>
      <p className="text-muted-foreground mb-6">
        每一部都为“提升古风写作”而选，点开看它被选中<i>究竟是为了什么</i>。
      </p>

      <div className="flex flex-wrap items-center gap-2 mb-8">
        {TIER_FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setTier(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-sm border transition-colors ${
              tier === f.key
                ? 'bg-cinnabar text-white border-cinnabar'
                : 'bg-surface hover:border-cinnabar/40'
            }`}
          >
            {f.label}
          </button>
        ))}
        <div className="ml-auto relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜书名 / 作者 / 标签"
            className="pl-9 pr-3 py-1.5 rounded-full border bg-surface text-sm w-52 outline-none focus:border-cinnabar/60"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {list.map((b) => {
          const read = bookReadCount(b.id);
          const stage = STAGES[b.stage - 1];
          return (
            <Link
              key={b.id}
              to={`/book/${b.id}`}
              className="bg-surface border rounded-lg p-5 hover:border-cinnabar/50 hover:shadow-sm transition-all flex flex-col"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{b.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {b.dynasty} · {b.author} · {b.chapters} 章
                  </p>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-dai/10 text-dai shrink-0">
                  {stage.name}
                </span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-6 line-clamp-3 flex-1">
                {b.why}
              </p>
              <div className="mt-3 flex items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  {b.tags.slice(0, 3).map((t) => (
                    <span
                      key={t}
                      className="text-[11px] px-2 py-0.5 rounded bg-secondary text-secondary-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
                {read > 0 && (
                  <span className="text-xs text-cinnabar shrink-0">
                    {read}/{b.chapters}
                  </span>
                )}
              </div>
            </Link>
          );
        })}
      </div>
      {list.length === 0 && (
        <p className="text-center text-muted-foreground py-16">没有匹配的书籍</p>
      )}
    </div>
  );
}
