import { useState, useEffect } from 'react';
import type { DailyPoem, Prompt } from '../types';

interface InspirationEngineProps {
  resolveSubdomain: (url: string) => string;
}

const CATEGORIES = ['随笔', '诗歌', '散文', '观察', '念头', '记忆'] as const;

export default function InspirationEngine({ resolveSubdomain }: InspirationEngineProps) {
  const [dailyPoem, setDailyPoem] = useState<DailyPoem | null>(null);
  const [aiPrompt, setAiPrompt] = useState<Prompt | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('随笔');
  const [copiedPromptMsg, setCopiedPromptMsg] = useState(false);

  // Daily poem via jinrishici SDK
  useEffect(() => {
    const today = new Date().toDateString();
    try {
      const cached = localStorage.getItem('jinrishici_poem');
      if (cached) {
        const { date, poem } = JSON.parse(cached) as { date: string; poem: DailyPoem };
        if (date === today) {
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setDailyPoem(poem);
          return;
        }
      }
    } catch (e) {
      console.warn('Failed to parse cached poem from localStorage', e);
    }

    const loadPoemFromSDK = () => {
      const sdk = (
        window as unknown as {
          jinrishici?: {
            load: (
              cb: (result: {
                status: string;
                data: { content: string; origin: { author: string; title: string } };
              }) => void,
            ) => void;
          };
        }
      ).jinrishici;
      if (sdk) {
        sdk.load((result) => {
          if (result && result.status === 'success') {
            const poem: DailyPoem = {
              content: result.data.content,
              author: result.data.origin.author,
              origin: result.data.origin.title,
            };

            setDailyPoem(poem);
            localStorage.setItem('jinrishici_poem', JSON.stringify({ date: today, poem }));
          }
        });
      }
    };

    if ((window as unknown as { jinrishici?: unknown }).jinrishici) {
      loadPoemFromSDK();
    } else {
      const script = document.createElement('script');
      script.src = 'https://sdk.jinrishici.com/v2/browser/jinrishici.js';
      script.charset = 'utf-8';
      script.onload = loadPoemFromSDK;
      document.head.appendChild(script);
    }
  }, []);

  const handleGeneratePrompt = async () => {
    setAiLoading(true);
    setAiPrompt(null);
    try {
      const endpoint = resolveSubdomain('https://ai.newmaybe.com') + '/api/chat';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content:
                '你是一位中文文学写作教练，擅长随笔、诗歌、散文创作。请根据用户指定的写作分类，生成一条具体、有画面感的写作命题。只返回命题本身，50-80字，不加任何前缀或解释，以句号结尾。',
            },
            { role: 'user', content: `请为"${selectedCategory}"分类生成一条写作命题。` },
          ],
        }),
      });
      const data = (await res.json()) as { text?: string };
      if (data.text) {
        setAiPrompt({ category: selectedCategory, text: data.text.trim() });
      }
    } catch {
      setAiPrompt({
        category: selectedCategory,
        text: '在一个没有手机信号的山中小屋里，用一封信记录下这24小时内所有细微的感受与念头。',
      });
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopyToZenWriter = () => {
    if (!aiPrompt) return;
    void navigator.clipboard.writeText(aiPrompt.text);
    setCopiedPromptMsg(true);
    setTimeout(() => {
      setCopiedPromptMsg(false);
      window.open(
        `${resolveSubdomain('https://lab.newmaybe.com/zen-writer')}?draft=${encodeURIComponent(aiPrompt.text)}`,
        '_blank',
      );
    }, 1200);
  };

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-8 py-4">
      <div>
        <h2 className="text-2xl font-medium text-[var(--ink)]">文学写作灵感启发</h2>
        <p className="text-sm text-[var(--ink-soft)] mt-1">
          今日诗词为你铺垫情绪，AI 为你生成专属写作命题，一键直达禅意写作空间。
        </p>
      </div>

      {/* Daily Poem */}
      <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg px-8 py-6 shadow-sm">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)]">
          今日诗词
        </span>
        {dailyPoem ? (
          <div className="mt-4">
            <p className="font-serif text-xl leading-loose text-[var(--ink)] tracking-wider">
              {dailyPoem.content}
            </p>
            <p className="text-xs text-[var(--ink-faint)] mt-3">
              {dailyPoem.author} · 《{dailyPoem.origin}》
            </p>
          </div>
        ) : (
          <p className="font-serif text-base text-[var(--ink-faint)] mt-4 animate-pulse">
            正在拾取今日诗意…
          </p>
        )}
      </div>

      {/* AI Prompt */}
      <div className="bg-[var(--paper-deep)] border border-[var(--line)] rounded-lg p-8 md:p-10 flex flex-col gap-6 shadow-sm">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded text-sm transition-colors cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-[var(--ochre)] text-[var(--paper)] font-medium'
                  : 'bg-[var(--paper)] border border-[var(--line)] text-[var(--ink-soft)] hover:border-[var(--ochre)]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="min-h-[120px] flex items-center">
          {aiLoading ? (
            <p className="font-serif text-lg text-[var(--ink-faint)] animate-pulse">
              AI 正在生成命题…
            </p>
          ) : aiPrompt ? (
            <div>
              <p className="font-serif text-2xl leading-relaxed text-[var(--ink)] text-justify">
                &ldquo;{aiPrompt.text}&rdquo;
              </p>
              <span className="inline-block mt-3 text-xs text-[var(--ink-faint)] border border-[var(--line)] px-2 py-0.5 rounded">
                {aiPrompt.category} · 由 AI 生成
              </span>
            </div>
          ) : (
            <p className="font-serif text-base text-[var(--ink-faint)]">
              选择分类后点击「生成命题」，AI 将为你定制一条写作任务。
            </p>
          )}
        </div>

        <div className="flex flex-wrap justify-between items-center gap-3 pt-2 border-t border-[var(--line)]">
          <button
            onClick={handleGeneratePrompt}
            disabled={aiLoading}
            className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] disabled:opacity-50 text-[var(--paper)] px-5 py-2.5 rounded text-sm transition-all cursor-pointer font-medium hover:scale-[1.02] active:scale-[0.98]"
          >
            {aiLoading ? '生成中…' : '生成命题 ✦'}
          </button>
          {aiPrompt && (
            <button
              onClick={handleCopyToZenWriter}
              className="bg-[var(--paper)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-5 py-2.5 rounded text-sm transition-colors cursor-pointer font-medium"
            >
              {copiedPromptMsg ? '已复制，前往写作中… ✍' : '复制并前往禅意写作空间 ↗'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
