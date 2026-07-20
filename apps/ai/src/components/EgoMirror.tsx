import { useState, useEffect, useMemo, useRef } from 'react';
import { type Message, type ProviderType } from '../types';
import { retrieveRelevantDocs, type ContentItem } from '../utils/rag';
import TypingIndicator from './TypingIndicator';
import MarkdownText from './MarkdownText';

interface EgoMirrorProps {
  allContent: ContentItem[];
  resolveSubdomain: (url: string) => string;
  provider: ProviderType;
  model: string;
  apiKey: string;
  customBaseUrl: string;
}

function timestamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export default function EgoMirror({
  allContent,
  resolveSubdomain,
  provider,
  model,
  apiKey,
  customBaseUrl,
}: EgoMirrorProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newmaybe_ai_ego_messages');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch {
          // ignore
        }
      }
    }
    return [
      {
        id: 'ego-welcome',
        role: 'assistant',
        text: '你好，我是你在数字花园里的“思想镜像”。在这里，我将引用你过去写过的文字，来审视、对撞或拓展你此刻的新灵感。请输入你近期的某种顿悟、想法或创作草稿，让我们开始对话。',
        timestamp: timestamp(),
      },
    ];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [focusedRefs, setFocusedRefs] = useState<ContentItem[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Persist messages
  useEffect(() => {
    localStorage.setItem('newmaybe_ai_ego_messages', JSON.stringify(messages));
  }, [messages]);

  // Derive all unique reference documents referenced in this session to show in right panel
  const sessionReferences = useMemo(() => {
    const titles = new Set<string>();
    messages.forEach((msg) => {
      if (msg.references) {
        msg.references.forEach((ref) => {
          titles.add(ref.title);
        });
      }
    });
    return allContent.filter((item) => titles.has(item.title));
  }, [messages, allContent]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isTyping) return;

    const userText = input.trim();
    setInput('');

    const userMessage: Message = {
      id: `ego-msg-${Date.now()}`,
      role: 'user',
      text: userText,
      timestamp: timestamp(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // 1. RAG retrieval (more liberal limit to get contradictory ideas)
      const matchedDocs = retrieveRelevantDocs(userText, allContent, 4);
      const references = matchedDocs.map((m) => ({
        type: m.doc.type === 'notes' ? '笔记' : '文章',
        title: m.doc.title,
        url: m.doc.url,
      }));

      // Focus on these right away
      setFocusedRefs(matchedDocs.map((m) => m.doc));

      // 2. Build special Ego prompt
      let systemPrompt = `你叫“林的思维镜像”，是作者林数字花园中历史心智的化身。
你扮演林本人的“自我批判镜”或“概念对撞者”。你的语气保持沉静、内省、逻辑严密且具有思辨色彩。你不能唯唯诺诺，要针对用户输入的新想法进行温和的挑衅和反思。

你的对撞法则：
1. 找出检索到的历史文献中，与创作者此刻的想法相互佐证、甚至相互矛盾的地方。
2. 明确引用文献名称和原文，以质询的形式提出对撞（例如：“在《X》中林曾写道：『Y』，而你今天写道：『Z』。这是否意味着你在概念上退缩了？抑或是你发现曾经的坚持出现了裂纹？”）。
3. 帮助他梳理从 sprout（绿芽）到 evergreen（常青）的思考演化轨迹。
`;

      if (matchedDocs.length > 0) {
        systemPrompt += `\n以下是为你检索到的林的历史写作文献，请把它们作为你论辩和质询的内容依据，在提到文献时以 [文献标题](URL) 的 markdown 格式进行引用：\n\n`;
        matchedDocs.forEach((m, idx) => {
          systemPrompt += `---
[历史文献 #${idx + 1}] 标题: ${m.doc.title}
发布时间: ${m.doc.pubDate}
正文:
${m.doc.content}
---\n\n`;
        });
      } else {
        systemPrompt += `\n林的历史花园中未发现直接语义重合的文献，请基于你对林“干净、留白、内省”美学的了解，对用户输入的想法展开纯哲学层面的发散质询，并指出林在哪些地方可能会表示存疑。`;
      }

      const promptHistory = [
        { role: 'system', content: systemPrompt },
        ...messages
          .filter((m) => m.id !== 'ego-welcome')
          .map((m) => ({ role: m.role, content: m.text })),
        { role: 'user', content: userText },
      ];

      let replyText = '';
      const assistantMsgId = `ego-msg-assistant-${Date.now()}`;

      if (provider === 'free' || provider === 'openai') {
        const cleanBaseUrl =
          provider === 'openai'
            ? (customBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
            : '';
        const endpoint = provider === 'free' ? '/api/chat' : `${cleanBaseUrl}/chat/completions`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (provider === 'openai') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const body =
          provider === 'free'
            ? JSON.stringify({ messages: promptHistory })
            : JSON.stringify({
                model,
                messages: promptHistory.map((m) => ({ role: m.role, content: m.content })),
                stream: false,
              });

        const res = await fetch(endpoint, { method: 'POST', headers, body });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || '连接接口失败');
        }

        const data = await res.json();
        replyText = data.choices?.[0]?.message?.content || data.response || data.text || '';
      } else if (provider === 'gemini') {
        const cleanBaseUrl = (customBaseUrl || 'https://generativelanguage.googleapis.com').replace(
          /\/$/,
          '',
        );

        const geminiMessages = promptHistory
          .filter((m) => m.role !== 'system')
          .map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          }));

        const res = await fetch(
          `${cleanBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: geminiMessages,
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
          },
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || 'Gemini 接口调用出错');
        }
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      setMessages((prev) => [
        ...prev,
        {
          id: assistantMsgId,
          role: 'assistant',
          text: replyText,
          references,
          timestamp: timestamp(),
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ego-msg-error-${Date.now()}`,
          role: 'assistant',
          text: `【对撞机故障】无法唤醒思想镜像：${msg}。`,
          timestamp: timestamp(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: 'ego-welcome',
        role: 'assistant',
        text: '你好，我是你在数字花园里的“思想镜像”。在这里，我将引用你过去写过的文字，来审视、对撞或拓展你此刻的新灵感。请输入你近期的某种顿悟、想法或创作草稿，让我们开始对话。',
        timestamp: timestamp(),
      },
    ]);
    setFocusedRefs([]);
  };

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 overflow-y-auto lg:overflow-hidden">
      {/* Dialogue sandbox */}
      <div className="flex-grow flex flex-col h-[65vh] max-lg:shrink-0 lg:h-full bg-[var(--paper)] border border-[var(--line)] rounded-lg overflow-hidden min-w-0">
        <header className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-deep)] flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-sm font-semibold text-[var(--ink)] font-serif">思想对撞沙盒</span>
          </div>
          <button
            onClick={handleClear}
            className="text-[10px] text-[var(--ink-soft)] hover:text-[var(--ochre)] px-2 py-1 rounded border border-[var(--line)] bg-[var(--paper)] cursor-pointer"
          >
            清空对撞记录
          </button>
        </header>

        {/* Message area */}
        <div className="flex-grow overflow-y-auto p-4 md:p-6 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isError = msg.id.includes('error');
            return (
              <div
                key={msg.id}
                className={`flex flex-col max-w-[90%] md:max-w-[80%] msg-animate ${
                  isUser ? 'ml-auto items-end' : 'mr-auto items-start'
                }`}
              >
                <div
                  className={`p-3.5 rounded-lg text-sm leading-relaxed text-justify font-serif border ${
                    isUser
                      ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink)] rounded-br-none'
                      : isError
                        ? 'bg-[var(--cinnabar-bg)] border-[var(--cinnabar)]/40 text-[var(--cinnabar)] rounded-bl-none'
                        : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] rounded-bl-none shadow-sm'
                  }`}
                >
                  <MarkdownText text={msg.text} />
                </div>
                <span className="text-[9px] text-[var(--ink-faint)] mt-1 px-1">
                  {msg.timestamp}
                </span>
              </div>
            );
          })}
          {isTyping && <TypingIndicator />}
          <div ref={chatEndRef} />
        </div>

        {/* Text Area */}
        <form
          onSubmit={handleSend}
          className="p-4 border-t border-[var(--line)] bg-[var(--paper-deep)] shrink-0"
        >
          <div className="flex gap-2 max-w-4xl mx-auto w-full">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isTyping}
              placeholder="说出你此刻偏激、不成熟或全新的灵感观点..."
              className="flex-grow min-w-0 p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm focus:border-[var(--ochre)] outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] px-4 rounded font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              对撞
            </button>
          </div>
        </form>
      </div>

      {/* Right Column: Historical citation references */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col h-auto lg:h-full bg-[color-mix(in_srgb,var(--paper-deep)_50%,transparent)] border border-[var(--line)] rounded-lg overflow-hidden">
        <header className="px-4 py-3 border-b border-[var(--line)] bg-[var(--paper-deep)] shrink-0">
          <span className="text-xs font-semibold text-[var(--ink-soft)] font-sans uppercase tracking-wider">
            历史文献投影 ({sessionReferences.length})
          </span>
        </header>

        <div className="flex-grow overflow-y-auto p-4 space-y-3 scrollbar-none">
          {focusedRefs.length > 0 && (
            <div className="space-y-3 pb-3 border-b border-dashed border-[var(--line)]">
              <span className="text-[10px] text-[var(--ochre)] font-semibold uppercase tracking-wider block">
                ⚡ 本次对撞重点引证
              </span>
              {focusedRefs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 rounded bg-[var(--paper)] border border-[var(--ochre)] text-xs space-y-1.5 shadow-sm"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[var(--ink)] font-serif line-clamp-1">
                      {doc.title}
                    </span>
                    <a
                      href={resolveSubdomain(doc.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[9px] text-[var(--ochre)] font-sans hover:underline shrink-0 ml-1"
                    >
                      阅读全文 →
                    </a>
                  </div>
                  <p className="text-[11px] text-[var(--ink-soft)] font-serif leading-relaxed line-clamp-4">
                    {doc.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <span className="text-[10px] text-[var(--ink-faint)] font-semibold uppercase tracking-wider block">
              📚 本轮对话全部关联
            </span>
            {sessionReferences.length === 0 ? (
              <p className="text-xs text-[var(--ink-faint)] py-8 text-center font-serif">
                暂无关联的历史投影。输入内容后，此处将陈列被对撞的旧文章。
              </p>
            ) : (
              sessionReferences.map((doc) => {
                // If it's already in focusedRefs, we don't duplicate it in visual layout
                if (focusedRefs.some((fd) => fd.id === doc.id)) return null;
                return (
                  <div
                    key={doc.id}
                    className="p-3 rounded bg-[var(--paper)] border border-[var(--line)] text-xs space-y-1.5 hover:border-[var(--ink-soft)] transition-colors"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-[var(--ink)] font-serif line-clamp-1">
                        {doc.title}
                      </span>
                      <a
                        href={resolveSubdomain(doc.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] text-[var(--ink-soft)] font-sans hover:text-[var(--ochre)] shrink-0 ml-1"
                      >
                        阅读全文 →
                      </a>
                    </div>
                    <p className="text-[11px] text-[var(--ink-soft)] font-serif leading-relaxed line-clamp-3">
                      {doc.content}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// (Helper removed; logic inline in useMemo)
