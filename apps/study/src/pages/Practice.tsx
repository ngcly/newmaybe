import { useMemo, useState } from 'react';
import { DRILLS } from '@/data/practice';
import quotes from '@/data/quotes.json';
import {
  getDrafts,
  saveDraft,
  getDrillDone,
  toggleDrillDone,
  getCheckins,
  totalReadCount,
  streakDays,
  localDateKey,
} from '@/lib/store';
import { readSSE } from '@/lib/sse';
import { AI_STORAGE_KEYS } from '@newmaybe/ai-client';
import {
  CheckCircle2,
  Circle,
  Flame,
  BookOpen,
  PenLine,
  RefreshCw,
  Sparkles,
  Loader2,
} from 'lucide-react';

interface Quote {
  text: string;
  source: string;
}

const LEVELS = ['', '筑基', '进阶', '融通'];

// AI 评阅 API 调用函数
async function fetchAICritique(
  drillTitle: string,
  drillHint: string,
  drillSource: string,
  userDraft: string,
): Promise<string> {
  const provider = localStorage.getItem(AI_STORAGE_KEYS.provider) || 'free';
  const apiKey = localStorage.getItem(AI_STORAGE_KEYS.apiKey) || '';
  const model = localStorage.getItem(AI_STORAGE_KEYS.model) || '';
  const baseUrl = localStorage.getItem(AI_STORAGE_KEYS.customBaseUrl) || '';

  const systemPrompt = `你是一位精通中国古典文学与诗词歌赋的“古典文学导师（AI园丁）”。请对用户的古风仿写/习作进行雅致、中肯的评阅。
练习题目：「${drillTitle}」
仿写要求：${drillHint}
原作示范：${drillSource}

请分以下三点进行深度点评，并给出修改前后的对比示例：
【意境风神】简评其意象与文气，是否切合古典风味
【声律对仗】简评其句式与平仄，指出出律或对仗不协处
【酌金墨玉】给出针对性的修改建议和润色示范`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `这是我的仿写习作：\n${userDraft}\n\n请点评。` },
  ];

  try {
    if (provider === 'openai' && apiKey) {
      const url = `${baseUrl.replace(/\/$/, '') || 'https://api.openai.com/v1'}/chat/completions`;
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model || 'gpt-4o-mini',
          messages,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.choices?.[0]?.message?.content || '未获取到点评内容';
    } else if (provider === 'gemini' && apiKey) {
      const gModel = model || 'gemini-1.5-flash';
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${gModel}:generateContent?key=${apiKey}`;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: `${systemPrompt}\n\n用户仿写：\n${userDraft}` }],
            },
          ],
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '未获取到点评内容';
    } else {
      // 默认使用 Workers AI 免费通道
      const endpoint = import.meta.env.VITE_FREE_AI_ENDPOINT || 'https://ai.newmaybe.com/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages }),
      });
      if (!res.ok) throw new Error();

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('text/event-stream')) {
        const text = await readSSE(res);
        return text || '未获取到流式点评内容';
      } else {
        const data = await res.json();
        return data.response || data.choices?.[0]?.message?.content || '未获取到点评内容';
      }
    }
  } catch (err) {
    console.warn('API connection failed.', err);
    throw new Error('AI 点评服务暂时不可用，请稍后重试或检查 API 配置。', {
      cause: err,
    });
  }
}

export default function Practice() {
  const [drafts, setDrafts] = useState<DraftMapState>(() => getDrafts());
  const [doneList, setDoneList] = useState<string[]>(() => getDrillDone());
  const [filter, setFilter] = useState<number>(0);
  const [qi, setQi] = useState(() => Math.floor(Math.random() * (quotes as Quote[]).length));

  const checks = getCheckins();
  const readTotal = totalReadCount();
  const streak = streakDays();

  const list = useMemo(
    () => DRILLS.filter((d) => (filter === 0 ? true : d.level === filter)),
    [filter],
  );
  const quote = (quotes as Quote[])[qi];

  // 近 12 周打卡格子
  const cells = useMemo(() => {
    const arr: { date: string; n: number }[] = [];
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 0); // 本周日起
    for (let w = 11; w >= 0; w--) {
      for (let i = 0; i < 7; i++) {
        const dd = new Date(d);
        dd.setDate(d.getDate() - w * 7 + i);
        const key = localDateKey(dd);
        arr.push({ date: key, n: checks[key] ?? 0 });
      }
    }
    return arr;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readTotal]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-brush text-4xl mb-2">修炼场</h1>
      <p className="text-muted-foreground mb-8">文笔不是读出来的，是一笔一笔仿出来的。</p>

      {/* 状态面板 */}
      <div className="grid md:grid-cols-[1fr_320px] gap-4 mb-10">
        <div className="bg-surface border rounded-lg p-5">
          <div className="flex items-center gap-6 mb-4">
            <Stat
              icon={<BookOpen className="w-4 h-4" />}
              label="累计已读"
              value={`${readTotal} 章`}
            />
            <Stat
              icon={<Flame className="w-4 h-4" />}
              label="连续修炼"
              value={`${streak} 天`}
              accent
            />
            <Stat
              icon={<PenLine className="w-4 h-4" />}
              label="完成练习"
              value={`${doneList.length}/${DRILLS.length}`}
            />
          </div>
          <p className="text-xs text-muted-foreground mb-2">近 12 周修炼记录（每读一章即打卡）</p>
          <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit">
            {cells.map((c, i) => (
              <div
                key={i}
                title={`${c.date}：${c.n} 章`}
                className={`w-3 h-3 rounded-[2px] ${
                  c.n === 0
                    ? 'bg-secondary'
                    : c.n < 3
                      ? 'bg-cinnabar/30'
                      : c.n < 6
                        ? 'bg-cinnabar/60'
                        : 'bg-cinnabar'
                } ${c.date > localDateKey() ? 'opacity-20' : ''}`}
              />
            ))}
          </div>
        </div>
        <div className="bg-surface border rounded-lg p-5 relative overflow-hidden flex flex-col">
          <p className="text-xs text-muted-foreground mb-2">每日一句 · 试着对出下句</p>
          <p className="text-lg leading-8 flex-1">{quote.text}</p>
          <p className="text-sm text-muted-foreground mt-2">—— {quote.source}</p>
          <button
            onClick={() => setQi(Math.floor(Math.random() * (quotes as Quote[]).length))}
            className="absolute top-4 right-4 text-muted-foreground hover:text-cinnabar"
            aria-label="换一句"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 仿写练习 */}
      <div className="flex items-center gap-2 mb-5">
        <h2 className="text-xl font-semibold mr-3">仿写题库</h2>
        {[0, 1, 2, 3].map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              filter === l
                ? 'bg-cinnabar text-white border-cinnabar'
                : 'bg-surface hover:border-cinnabar/40'
            }`}
          >
            {l === 0 ? '全部' : LEVELS[l]}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {list.map((d) => (
          <DrillCard
            key={d.id}
            drill={d}
            draft={drafts[d.id] ?? ''}
            done={doneList.includes(d.id)}
            onDraft={(t) => {
              saveDraft(d.id, t);
              setDrafts((s) => ({ ...s, [d.id]: t }));
            }}
            onDone={() => {
              const isMarked = toggleDrillDone(d.id);
              setDoneList((s) => {
                if (isMarked) {
                  return s.includes(d.id) ? s : [...s, d.id];
                } else {
                  return s.filter((item) => item !== d.id);
                }
              });
            }}
          />
        ))}
      </div>
    </div>
  );
}

type DraftMapState = Record<string, string>;

function Stat({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div>
      <p className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1">
        {icon}
        {label}
      </p>
      <p className={`text-2xl font-bold ${accent ? 'text-cinnabar' : ''}`}>{value}</p>
    </div>
  );
}

function DrillCard({
  drill,
  draft,
  done,
  onDraft,
  onDone,
}: {
  drill: (typeof DRILLS)[number];
  draft: string;
  done: boolean;
  onDraft: (t: string) => void;
  onDone: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [critique, setCritique] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCritique = async () => {
    if (!draft.trim()) return;
    setLoading(true);
    setCritique('');
    try {
      const feedback = await fetchAICritique(drill.title, drill.hint, drill.source, draft);
      setCritique(feedback);
    } catch (error) {
      setCritique(error instanceof Error ? error.message : 'AI 点评服务暂时不可用。');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-surface border rounded-lg p-5 ${done ? 'border-cinnabar/30' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-dai/10 text-dai">
            {drill.type}
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground">
            {LEVELS[drill.level]}
          </span>
        </div>
        <button
          onClick={onDone}
          className="text-muted-foreground hover:text-cinnabar"
          title="标记完成"
        >
          {done ? (
            <CheckCircle2 className="w-5 h-5 text-cinnabar" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
      </div>
      <p className="font-medium leading-7">「{drill.title}」</p>
      <p className="text-xs text-muted-foreground mt-1">—— {drill.source}</p>
      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-sm text-cinnabar hover:underline"
      >
        {open ? '收起练习' : '开始仿写'}
      </button>
      {open && (
        <div className="mt-3 border-t pt-3 space-y-3">
          <p className="text-sm text-dai leading-6">要点：{drill.hint}</p>
          <textarea
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            placeholder="在此写下你的仿写……（自动保存在本地）"
            rows={5}
            className="w-full rounded-md border bg-paper p-3 text-sm leading-7 outline-none focus:border-cinnabar/60 resize-y"
          />
          <div className="flex items-center justify-between gap-2">
            {/* AI 园丁评阅按钮 */}
            <button
              disabled={loading || !draft.trim()}
              onClick={handleCritique}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs bg-dai/10 text-dai border-dai/20 hover:bg-dai/20 disabled:opacity-40 disabled:pointer-events-none transition-colors"
            >
              {loading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              {loading ? '园丁品读中...' : 'AI 园丁点评'}
            </button>
            <p className="text-xs text-muted-foreground">{draft.length} 字</p>
          </div>

          {/* AI 点评展示盒 */}
          {critique && (
            <div className="mt-4 p-4 rounded-lg border border-cinnabar/20 bg-cinnabar/[0.02] text-sm space-y-2 relative overflow-hidden paper-texture">
              <div className="flex items-center gap-1.5 font-semibold text-cinnabar text-xs">
                <Sparkles className="w-3.5 h-3.5" /> 园丁评阅
              </div>
              <div className="text-foreground/90 leading-7 whitespace-pre-line font-serif text-sm">
                {critique}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
