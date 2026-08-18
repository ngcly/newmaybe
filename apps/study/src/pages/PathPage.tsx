import { Link } from 'react-router';
import { BOOKS, STAGES } from '@/data/catalog';
import { bookReadCount } from '@/lib/store';
import { ArrowRight, Milestone, CheckCircle2, BookOpen } from 'lucide-react';

export default function PathPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-4">
        <h1 className="font-brush text-4xl mb-2">进阶路径</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          从入门到精通四步走。核心原则：
          <em className="not-italic text-foreground font-semibold">
            精读少量 + 摘抄语料 + 立刻仿写
          </em>
          ， 输入和练笔的时间比保持 1:1。
        </p>
      </div>

      <div className="bg-cinnabar/[0.04] border border-cinnabar/25 rounded-xl p-5 mb-10 text-sm leading-7 shadow-xs">
        <strong className="text-cinnabar font-semibold">给急性子的最短路线：</strong>
        声律启蒙（两周）→ 唐诗三百首绝句（一月）→ 古文观止名篇三十篇（两月）→ 宋词三百首 +
        人间词话（两月）→ 之后按创作方向分流：写诗词补花间集/纳兰词，写小说进聊斋/红楼。
      </div>

      <div className="space-y-12">
        {STAGES.map((s, si) => {
          const books = BOOKS.filter((b) => b.stage === s.n);
          const totalChapters = books.reduce((sum, b) => sum + b.chapters, 0);
          const totalRead = books.reduce((sum, b) => sum + bookReadCount(b.id), 0);
          const isDone = totalRead > 0 && totalRead >= totalChapters;
          const percent = totalChapters > 0 ? Math.round((totalRead / totalChapters) * 100) : 0;

          return (
            <section key={s.n} id={`stage-${s.n}`} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <span className="seal w-12 h-12 text-2xl shadow-xs">
                    {['壹', '贰', '叁', '肆'][si]}
                  </span>
                  {si < 3 && <span className="w-px flex-1 bg-border mt-3 min-h-[140px]" />}
                </div>

                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-3 border-b pb-3 mb-3">
                    <div className="flex items-center gap-3">
                      <h2 className="text-2xl font-bold text-foreground">{s.name}</h2>
                      <span className="text-xs text-muted-foreground bg-paper px-2.5 py-0.5 rounded-full border">
                        {books.length} 部书 · {totalChapters} 章
                      </span>
                    </div>

                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {isDone ? (
                        <span className="text-cinnabar font-medium flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> 阶段已通关
                        </span>
                      ) : (
                        <span>
                          阶段研读进度: <strong className="text-cinnabar">{percent}%</strong> (
                          {totalRead}/{totalChapters}章)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 mb-5 bg-surface/50 p-3.5 rounded-lg border">
                    <p className="text-xs text-dai flex items-center gap-1.5">
                      <Milestone className="w-4 h-4 text-dai shrink-0" />
                      <span>
                        <strong>阶段目标：</strong>
                        {s.goal}
                      </span>
                    </p>
                    <p className="text-xs text-cinnabar flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-cinnabar shrink-0" />
                      <span>
                        <strong>练笔任务：</strong>
                        {s.task}
                      </span>
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {books.map((b) => {
                      const read = bookReadCount(b.id);
                      const bPercent = b.chapters ? Math.round((read / b.chapters) * 100) : 0;

                      return (
                        <Link
                          key={b.id}
                          to={`/book/${b.id}`}
                          className="book-spine-card p-4 hover:shadow-md transition-all flex flex-col justify-between group"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <h3 className="font-bold text-sm group-hover:text-cinnabar transition-colors truncate">
                                {b.title}
                              </h3>
                              <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-cinnabar group-hover:translate-x-0.5 transition-all shrink-0" />
                            </div>
                            <p className="text-xs text-muted-foreground leading-5 line-clamp-2">
                              {b.why}
                            </p>
                          </div>

                          <div className="mt-3 pt-2.5 border-t">
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
                              <span>
                                {b.dynasty} · {b.author}
                              </span>
                              {read > 0 ? (
                                <span className="text-cinnabar font-medium">
                                  已读 {read}/{b.chapters}
                                </span>
                              ) : (
                                <span>{b.chapters} 章</span>
                              )}
                            </div>
                            {read > 0 && (
                              <div className="h-1 rounded-full bg-secondary overflow-hidden">
                                <div
                                  className="h-full bg-cinnabar"
                                  style={{ width: `${bPercent}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </section>
          );
        })}
      </div>

      <div className="mt-14 border-t pt-8 text-center bg-paper/40 rounded-xl p-8 shadow-xs">
        <p className="font-brush text-2xl text-foreground/85">读书破万卷，下笔如有神</p>
        <p className="text-xs text-muted-foreground mt-2">—— 但先得让摘抄本和仿写本也破万卷</p>
        <Link
          to="/practice"
          className="mt-5 inline-flex items-center gap-2 rounded-lg bg-cinnabar px-6 py-2.5 text-white text-sm font-medium hover:bg-cinnabar/90 shadow-sm transition-all"
        >
          去修炼场练笔 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
