import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { BOOKS, STAGES, type Tier, TIER_NAMES } from '@/data/catalog';
import { bookReadCount } from '@/lib/store';
import { Search, Filter, BookOpen } from 'lucide-react';

const TIER_FILTERS: { key: Tier | 'all'; label: string }[] = [
  { key: 'all', label: '全部类别' },
  { key: 'core', label: '核心书库' },
  { key: 'novel', label: '小说杂著' },
  { key: 'tool', label: '工具启蒙' },
  { key: 'extra', label: '拓展选读' },
];

const STAGE_FILTERS = [
  { key: 0, label: '全部阶段' },
  { key: 1, label: '阶段一·筑基' },
  { key: 2, label: '阶段二·语感' },
  { key: 3, label: '阶段三·拓展' },
  { key: 4, label: '阶段四·融通' },
];

export default function Books() {
  const [tier, setTier] = useState<Tier | 'all'>('all');
  const [stage, setStage] = useState<number>(0);
  const [q, setQ] = useState('');

  const list = useMemo(() => {
    return BOOKS.filter((b) => {
      if (tier !== 'all' && b.tier !== tier) return false;
      if (stage !== 0 && b.stage !== stage) return false;
      if (q && !`${b.title}${b.author}${b.dynasty}${b.tags.join()}`.includes(q)) return false;
      return true;
    }).sort((a, b) => a.stage - b.stage);
  }, [tier, stage, q]);

  const clearFilters = () => {
    setTier('all');
    setStage(0);
    setQ('');
  };

  const isFiltered = tier !== 'all' || stage !== 0 || q.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-end justify-between flex-wrap gap-4 mb-3">
        <div>
          <h1 className="font-brush text-4xl mb-2">进阶书目</h1>
          <p className="text-muted-foreground text-sm">
            精选古籍四十三部，分类梳理为何读、怎么读、仿写范例，构建古风写作全景阶梯。
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          共收录 <span className="font-semibold text-cinnabar">{BOOKS.length}</span> 部 · 筛选出{' '}
          <span className="font-semibold text-cinnabar">{list.length}</span> 部
        </div>
      </div>

      {/* 筛选与搜索控制区 */}
      <div className="bg-surface border rounded-xl p-4 md:p-5 shadow-xs mb-8 space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 分类标签 */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-muted-foreground flex items-center gap-1 mr-1">
              <Filter className="w-3.5 h-3.5" /> 类别:
            </span>
            {TIER_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setTier(f.key)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  tier === f.key
                    ? 'bg-cinnabar text-white border-cinnabar shadow-xs'
                    : 'bg-paper text-muted-foreground hover:text-foreground hover:border-cinnabar/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* 搜索框 */}
          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="搜书名 / 作者 / 朝代 / 标签"
              className="pl-9 pr-3 py-1.5 rounded-full border bg-paper text-xs w-full outline-none focus:border-cinnabar/60 transition-colors"
            />
          </div>
        </div>

        {/* 进阶阶段筛选 */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-dashed">
          <span className="text-xs text-muted-foreground mr-1">阶段:</span>
          {STAGE_FILTERS.map((s) => (
            <button
              key={s.key}
              onClick={() => setStage(s.key)}
              className={`px-2.5 py-0.5 rounded-md text-xs transition-colors ${
                stage === s.key
                  ? 'bg-dai text-white font-medium shadow-xs'
                  : 'bg-paper text-muted-foreground hover:text-foreground'
              }`}
            >
              {s.label}
            </button>
          ))}

          {isFiltered && (
            <button
              onClick={clearFilters}
              className="ml-auto text-xs text-cinnabar hover:underline"
            >
              重置筛选
            </button>
          )}
        </div>
      </div>

      {/* 书籍网格卡片 */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {list.map((b) => {
          const read = bookReadCount(b.id);
          const stageInfo = STAGES[b.stage - 1];
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
                    {stageInfo.name}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  {b.dynasty} · {b.author} · {b.chapters} 章
                </p>

                <p className="mt-3 text-xs md:text-sm text-muted-foreground leading-6 line-clamp-2">
                  {b.why}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t flex flex-col gap-2">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex flex-wrap gap-1">
                    {b.tags.slice(0, 3).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground"
                      >
                        {t}
                      </span>
                    ))}
                  </div>

                  {read > 0 ? (
                    <span className="text-[11px] font-medium text-cinnabar shrink-0 flex items-center gap-1">
                      <BookOpen className="w-3 h-3" /> {read}/{b.chapters}
                    </span>
                  ) : (
                    <span className="text-[11px] text-muted-foreground shrink-0 group-hover:text-cinnabar transition-colors font-medium">
                      {TIER_NAMES[b.tier]} →
                    </span>
                  )}
                </div>

                {read > 0 && (
                  <div className="h-1 rounded-full bg-secondary overflow-hidden">
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

      {list.length === 0 && (
        <div className="text-center py-20 bg-surface border rounded-xl shadow-xs">
          <p className="font-brush text-2xl text-muted-foreground mb-2">未觅得相关书目</p>
          <p className="text-xs text-muted-foreground mb-4">您可以尝试更换搜索词或重置筛选条件</p>
          <button
            onClick={clearFilters}
            className="px-4 py-2 rounded-lg bg-cinnabar text-white text-xs hover:bg-cinnabar/90 transition-colors"
          >
            清除所有筛选
          </button>
        </div>
      )}
    </div>
  );
}
