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
import { AI_STORAGE_KEYS, createGeminiRequest } from '@newmaybe/ai-client';
import {
  CheckCircle2,
  Circle,
  Flame,
  BookOpen,
  PenLine,
  RefreshCw,
  Sparkles,
  Loader2,
  Copy,
  Check,
  Trash2,
  Settings2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface Quote {
  text: string;
  source: string;
}

const LEVELS = ['', '筑基', '进阶', '融通'];
type AIProvider = 'free' | 'openai' | 'gemini';

const AI_MAX_TOTAL_CHARS = 800;

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

请严格按以下三部分进行深度点评，并给出修改前后的对比示例：
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
      const request = createGeminiRequest(baseUrl, model || 'gemini-1.5-flash', apiKey);
      const res = await fetch(request.url, {
        method: 'POST',
        headers: request.headers,
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
  const [aiConfigOpen, setAiConfigOpen] = useState(false);
  const [aiConfig, setAiConfig] = useState(() => ({
    provider: (localStorage.getItem(AI_STORAGE_KEYS.provider) as AIProvider | null) || 'free',
    model: localStorage.getItem(AI_STORAGE_KEYS.model) || 'workers-ai',
    apiKey: localStorage.getItem(AI_STORAGE_KEYS.apiKey) || '',
    baseUrl: localStorage.getItem(AI_STORAGE_KEYS.customBaseUrl) || '',
  }));
  const [configSaved, setConfigSaved] = useState(false);

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
      <div className="flex items-end justify-between flex-wrap gap-4 mb-4">
        <div>
          <h1 className="font-brush text-4xl mb-2">修炼场</h1>
          <p className="text-muted-foreground text-sm">
            文笔不是读出来的，是一笔一笔仿出来的。输入与练笔保持 1:1，方见真章。
          </p>
        </div>
        <button
          onClick={() => setAiConfigOpen(!aiConfigOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs bg-surface hover:border-cinnabar/40 text-foreground/80 transition-colors shadow-xs"
        >
          <Settings2 className="w-3.5 h-3.5 text-cinnabar" />
          <span>AI 导师设置</span>
          {aiConfigOpen ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )}
        </button>
      </div>

      {/* AI 配置面板 */}
      {aiConfigOpen && (
        <div className="bg-surface border rounded-xl p-5 mb-8 shadow-sm space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b pb-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cinnabar" /> AI 园丁评阅接口配置
            </h3>
            <span className="text-xs text-muted-foreground">
              当前模式:{' '}
              {aiConfig.provider === 'free'
                ? '免费 Workers AI'
                : aiConfig.provider === 'gemini'
                  ? 'Google Gemini'
                  : 'OpenAI 兼容'}
            </span>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">服务提供方</label>
              <select
                value={aiConfig.provider}
                onChange={(event) => {
                  const provider = event.target.value as AIProvider;
                  setAiConfig((current) => ({
                    ...current,
                    provider,
                    model:
                      provider === 'openai'
                        ? 'gpt-4o-mini'
                        : provider === 'gemini'
                          ? 'gemini-1.5-flash'
                          : 'workers-ai',
                  }));
                }}
                className="w-full rounded-lg border bg-paper p-2.5 text-xs outline-none focus:border-cinnabar/60"
              >
                <option value="free">免费通道 (Workers AI 托管)</option>
                <option value="openai">OpenAI 兼容接口 (需 API Key)</option>
                <option value="gemini">Google Gemini (需 API Key)</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1.5">
                模型标识 (Model ID)
              </label>
              <input
                value={aiConfig.model}
                onChange={(event) =>
                  setAiConfig((current) => ({ ...current, model: event.target.value }))
                }
                className="w-full rounded-lg border bg-paper p-2.5 text-xs outline-none focus:border-cinnabar/60"
                placeholder="例如 gpt-4o-mini 或 gemini-1.5-flash"
              />
            </div>

            {aiConfig.provider !== 'free' && (
              <>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">
                    API Base URL (可选)
                  </label>
                  <input
                    value={aiConfig.baseUrl}
                    onChange={(event) =>
                      setAiConfig((current) => ({ ...current, baseUrl: event.target.value }))
                    }
                    className="w-full rounded-lg border bg-paper p-2.5 text-xs outline-none focus:border-cinnabar/60"
                    placeholder="https://api.openai.com/v1"
                  />
                </div>

                <div>
                  <label className="text-xs text-muted-foreground block mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={aiConfig.apiKey}
                    onChange={(event) =>
                      setAiConfig((current) => ({ ...current, apiKey: event.target.value }))
                    }
                    className="w-full rounded-lg border bg-paper p-2.5 text-xs outline-none focus:border-cinnabar/60"
                    placeholder="sk-..."
                  />
                </div>
              </>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">
              * API Key 仅保存在您的浏览器本地，不经过第三方中转。
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.setItem(AI_STORAGE_KEYS.provider, aiConfig.provider);
                localStorage.setItem(AI_STORAGE_KEYS.model, aiConfig.model.trim());
                localStorage.setItem(AI_STORAGE_KEYS.apiKey, aiConfig.apiKey.trim());
                localStorage.setItem(AI_STORAGE_KEYS.customBaseUrl, aiConfig.baseUrl.trim());
                setConfigSaved(true);
                setTimeout(() => setConfigSaved(false), 2000);
              }}
              className="rounded-lg bg-cinnabar px-4 py-2 text-xs font-medium text-white hover:bg-cinnabar/90 transition-colors shadow-xs"
            >
              {configSaved ? '已保存配置 ✓' : '保存配置'}
            </button>
          </div>
        </div>
      )}

      {/* 状态面板 */}
      <div className="grid md:grid-cols-[1fr_320px] gap-5 mb-10">
        <div className="bg-surface border rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center gap-8 mb-4 flex-wrap">
            <Stat
              icon={<BookOpen className="w-4 h-4 text-muted-foreground" />}
              label="累计已读"
              value={`${readTotal} 章`}
            />
            <Stat
              icon={<Flame className="w-4 h-4 text-cinnabar" />}
              label="连续修炼"
              value={`${streak} 天`}
              accent
            />
            <Stat
              icon={<PenLine className="w-4 h-4 text-dai" />}
              label="完成练习"
              value={`${doneList.length}/${DRILLS.length}`}
            />
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">近 12 周修炼打卡（每读一章即打卡）</p>
            <div className="grid grid-rows-7 grid-flow-col gap-1 w-fit">
              {cells.map((c, i) => (
                <div
                  key={i}
                  title={`${c.date}：读过 ${c.n} 章`}
                  className={`w-3 h-3 rounded-[2px] transition-colors ${
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
        </div>

        {/* 每日一句 */}
        <div className="bg-surface border rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground font-medium">每日一句 · 对偶灵感</span>
              <button
                onClick={() => setQi(Math.floor(Math.random() * (quotes as Quote[]).length))}
                className="text-muted-foreground hover:text-cinnabar transition-colors"
                aria-label="换一句"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <p className="text-base font-serif leading-7 text-foreground/90 mt-2">{quote.text}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-medium">—— {quote.source}</p>
        </div>
      </div>

      {/* 仿写练习题库 */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <h2 className="text-xl font-semibold mr-2">仿写题库</h2>
        {[0, 1, 2, 3].map((l) => (
          <button
            key={l}
            onClick={() => setFilter(l)}
            className={`px-3.5 py-1 rounded-full text-xs font-medium border transition-colors ${
              filter === l
                ? 'bg-cinnabar text-white border-cinnabar shadow-xs'
                : 'bg-surface text-muted-foreground hover:text-foreground hover:border-cinnabar/40'
            }`}
          >
            {l === 0 ? '全部' : LEVELS[l]}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
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
      <p className={`text-2xl font-bold ${accent ? 'text-cinnabar' : 'text-foreground'}`}>
        {value}
      </p>
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
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    if (!draft) return;
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // 结构化渲染 AI 评语
  const renderStructuredCritique = (raw: string) => {
    const sections = raw.split(/(?=【[^】]+】)/g);
    if (sections.length <= 1) {
      return (
        <div className="text-foreground/90 leading-7 font-serif text-sm whitespace-pre-line">
          {raw}
        </div>
      );
    }

    return (
      <div className="space-y-3 mt-2">
        {sections.map((sec, idx) => {
          const match = sec.match(/^【([^】]+)】([\s\S]*)$/);
          if (match) {
            const [, title, content] = match;
            return (
              <div key={idx} className="critique-section">
                <span className="font-semibold text-xs text-cinnabar block mb-1">【{title}】</span>
                <p className="text-foreground/90 font-serif text-xs leading-6 whitespace-pre-line">
                  {content.trim()}
                </p>
              </div>
            );
          }
          return (
            <p key={idx} className="text-xs leading-6 text-foreground/80">
              {sec.trim()}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div
      className={`bg-surface border rounded-xl p-5 shadow-xs transition-all ${done ? 'border-cinnabar/30' : ''}`}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-dai/10 text-dai font-medium">
            {drill.type}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground font-medium">
            {LEVELS[drill.level]}
          </span>
        </div>
        <button
          onClick={onDone}
          className="text-muted-foreground hover:text-cinnabar transition-colors"
          title={done ? '已完成（点击取消）' : '标记已完成'}
        >
          {done ? (
            <CheckCircle2 className="w-5 h-5 text-cinnabar" />
          ) : (
            <Circle className="w-5 h-5" />
          )}
        </button>
      </div>

      <p className="font-bold text-base leading-7 text-foreground">「{drill.title}」</p>
      <p className="text-xs text-muted-foreground mt-1">—— 原作示范：{drill.source}</p>

      <button
        onClick={() => setOpen((o) => !o)}
        className="mt-3 text-xs text-cinnabar hover:underline font-medium inline-block"
      >
        {open ? '收起练习 ↑' : '开始仿写练笔 ↓'}
      </button>

      {open && (
        <div className="mt-4 border-t pt-3 space-y-3">
          <div className="bg-paper p-3 rounded-lg border text-xs text-dai leading-6">
            <strong>仿写要点：</strong>
            {drill.hint}
          </div>

          <div className="relative">
            <textarea
              value={draft}
              onChange={(e) => onDraft(e.target.value)}
              placeholder="在此写下你的仿写习作……（内容将自动保存于本地浏览器）"
              maxLength={AI_MAX_TOTAL_CHARS}
              rows={4}
              className="w-full rounded-lg border bg-paper p-3 text-sm leading-7 outline-none focus:border-cinnabar/60 resize-y"
            />
          </div>

          <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
            <div className="flex items-center gap-2">
              {/* AI 园丁评阅按钮 */}
              <button
                disabled={loading || !draft.trim()}
                onClick={handleCritique}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs bg-cinnabar/10 text-cinnabar border-cinnabar/20 hover:bg-cinnabar/20 disabled:opacity-40 disabled:pointer-events-none transition-colors font-medium"
              >
                {loading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Sparkles className="w-3.5 h-3.5" />
                )}
                {loading ? '园丁品读中...' : 'AI 园丁点评'}
              </button>

              {draft && (
                <>
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-md hover:bg-secondary/40 text-muted-foreground hover:text-foreground transition-colors"
                    title="复制习作"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-cinnabar" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => onDraft('')}
                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    title="清空重写"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>

            <span className="text-muted-foreground">
              {draft.length}/{AI_MAX_TOTAL_CHARS} 字
            </span>
          </div>

          {/* AI 点评展示盒 */}
          {critique && (
            <div className="mt-4 p-4 rounded-xl border border-cinnabar/20 bg-cinnabar/[0.02] shadow-xs relative overflow-hidden paper-texture">
              <div className="flex items-center gap-1.5 font-bold text-cinnabar text-xs border-b pb-2">
                <Sparkles className="w-3.5 h-3.5" /> 古典导师评阅
              </div>
              {renderStructuredCritique(critique)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
