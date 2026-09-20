import { useState } from 'react';
import { CheckCircle2, Circle, Sparkles, Loader2, Copy, Check, Trash2 } from 'lucide-react';
import type { DRILLS } from '@/data/practice';
import { fetchAICritique } from '@/lib/critique';
const LEVELS = ['', '筑基', '进阶', '融通'];
const AI_MAX_TOTAL_CHARS = 800;

export default function DrillCard({
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
