import { Link } from 'react-router';
import { BOOKS, STAGES } from '@/data/catalog';
import { bookReadCount } from '@/lib/store';
import { ArrowRight, Milestone } from 'lucide-react';

export default function PathPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="font-brush text-4xl mb-2">进阶路径</h1>
      <p className="text-muted-foreground mb-4">
        从入门到精通四步走。原则只有一条：
        <em className="not-italic text-foreground font-medium">精读少量 + 摘抄语料 + 立刻仿写</em>，
        输入和练笔的时间比保持 1:1。
      </p>
      <div className="bg-cinnabar/[0.05] border border-cinnabar/20 rounded-lg p-4 mb-10 text-sm leading-7">
        <strong className="text-cinnabar">给急性子的最短路线：</strong>
        声律启蒙（两周）→ 唐诗三百首绝句（一月）→ 古文观止名篇三十篇（两月）→ 宋词三百首 +
        人间词话（两月）→ 之后按创作方向分流：写诗词补花间集/纳兰词，写小说进聊斋/红楼。
      </div>

      <div className="space-y-12">
        {STAGES.map((s, si) => {
          const books = BOOKS.filter((b) => b.stage === s.n);
          return (
            <section key={s.n} id={`stage-${s.n}`} className="relative">
              <div className="flex items-start gap-4">
                <div className="flex flex-col items-center">
                  <span className="seal w-11 h-11 text-xl">{['壹', '贰', '叁', '肆'][si]}</span>
                  {si < 3 && <span className="w-px flex-1 bg-border mt-2" />}
                </div>
                <div className="flex-1 pb-2">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <h2 className="text-2xl font-bold">{s.name}</h2>
                    <span className="text-sm text-muted-foreground">{books.length} 部书</span>
                  </div>
                  <p className="mt-2 text-sm text-dai flex items-center gap-1.5">
                    <Milestone className="w-4 h-4" /> 阶段目标：{s.goal}
                  </p>
                  <p className="mt-1 text-sm text-cinnabar">练笔任务：{s.task}</p>

                  <div className="mt-5 grid sm:grid-cols-2 gap-3">
                    {books.map((b) => {
                      const read = bookReadCount(b.id);
                      return (
                        <Link
                          key={b.id}
                          to={`/book/${b.id}`}
                          className="group bg-surface border rounded-lg p-4 hover:border-cinnabar/50 transition-all"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold group-hover:text-cinnabar transition-colors">
                              {b.title}
                            </h3>
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-cinnabar shrink-0" />
                          </div>
                          <p className="mt-1.5 text-xs text-muted-foreground leading-5 line-clamp-2">
                            {b.why}
                          </p>
                          {read > 0 && (
                            <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                              <div
                                className="h-full bg-cinnabar"
                                style={{ width: `${(read / b.chapters) * 100}%` }}
                              />
                            </div>
                          )}
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

      <div className="mt-14 border-t pt-8 text-center">
        <p className="font-brush text-2xl text-foreground/80">读书破万卷，下笔如有神</p>
        <p className="text-sm text-muted-foreground mt-2">—— 但先得让摘抄本和仿写本也破万卷</p>
        <Link
          to="/practice"
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-cinnabar px-5 py-2.5 text-white hover:bg-cinnabar/90"
        >
          去修炼场练笔 <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
