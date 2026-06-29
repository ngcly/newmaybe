import { useState, useEffect, useRef } from 'react';
import { fetchAllContent, retrieveRelevantDocs, buildSystemPrompt, type ContentItem } from './utils/rag';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  references?: { type: string; title: string; url: string }[];
}

type ProviderType = 'free' | 'openai' | 'gemini';

interface Suggestion {
  name: string;
  url: string;
  model: string;
}

const SUGGESTIONS: Suggestion[] = [
  { name: 'DeepSeek 官方', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  { name: '硅基流动 (SiliconFlow)', url: 'https://api.siliconflow.cn/v1', model: 'deepseek-ai/DeepSeek-V3' },
  { name: '月之暗面 (Kimi)', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  { name: '阿里通义千问', url: 'https://dashscope.aliyuncs.com/compatible-mode/v1', model: 'qwen-plus' },
  { name: '智谱 AI (GLM)', url: 'https://open.bigmodel.cn/api/paas/v1', model: 'glm-4-flash' },
  { name: 'OpenAI 官方', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  { name: 'Gemini 官方', url: 'https://generativelanguage.googleapis.com', model: 'gemini-2.5-flash' },
];

const DAILY_FREE_LIMIT = 20;

const _isDev = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

export default function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: '您好，我是 newmaybe 的智能园丁。我可以通过您的内容中枢，为您检索、重组并分析您的数字花园。您可以随时向我提问，例如关于“慢阅读”、“隐私优先”或“对抗追踪”的思考。',
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  
  // 推理配置状态
  const [provider, setProvider] = useState<ProviderType>('free');
  const [model, setModel] = useState('workers-ai');
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  
  // RAG 语料库
  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [freeTurnsLeft, setFreeTurnsLeft] = useState(DAILY_FREE_LIMIT);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 初始化配置与数据拉取
  useEffect(() => {
    // 加载本地 API 密钥与服务商配置
    const savedProvider = localStorage.getItem('newmaybe_ai_provider') as ProviderType | null;
    const savedModel = localStorage.getItem('newmaybe_ai_model');
    const savedKey = localStorage.getItem('newmaybe_api_key');
    const savedBaseUrl = localStorage.getItem('newmaybe_custom_base_url');

    if (savedProvider) setProvider(savedProvider);
    if (savedModel) {
      setModel(savedModel);
    } else if (savedProvider === 'gemini') {
      setModel('gemini-2.5-flash');
    } else if (savedProvider === 'openai') {
      setModel('gpt-4o-mini');
    }
    if (savedKey) setApiKey(savedKey.trim());
    if (savedBaseUrl) setCustomBaseUrl(savedBaseUrl.trim());

    // 获取 RAG 全文库
    fetchAllContent().then(data => {
      setAllContent(data);
      setContentLoading(false);
    });

    // 检查每日免费额度
    const limitStatus = checkFreeTurns();
    setFreeTurnsLeft(limitStatus.remaining);
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // 1. 额度控制助手
  const checkFreeTurns = (): { ok: boolean; remaining: number } => {
    const limitJson = localStorage.getItem('newmaybe_free_turns_limit');
    const today = new Date().toDateString();
    
    if (limitJson) {
      try {
        const { date, count } = JSON.parse(limitJson);
        if (date === today) {
          if (count >= DAILY_FREE_LIMIT) {
            return { ok: false, remaining: 0 };
          }
          return { ok: true, remaining: DAILY_FREE_LIMIT - count };
        }
      } catch (e) {}
    }
    return { ok: true, remaining: DAILY_FREE_LIMIT };
  };

  const decrementFreeTurns = (): number => {
    const limitJson = localStorage.getItem('newmaybe_free_turns_limit');
    const today = new Date().toDateString();
    let count = 0;
    if (limitJson) {
      try {
        const parsed = JSON.parse(limitJson);
        if (parsed.date === today) {
          count = parsed.count;
        }
      } catch (e) {}
    }
    count += 1;
    localStorage.setItem('newmaybe_free_turns_limit', JSON.stringify({ date: today, count }));
    return DAILY_FREE_LIMIT - count;
  };

  // 保存模型设置
  const saveConfig = (p: ProviderType, m: string, key: string, baseUrl: string) => {
    const trimmedKey = key.trim();
    const trimmedBaseUrl = baseUrl.trim();
    setProvider(p);
    setModel(m);
    setApiKey(trimmedKey);
    setCustomBaseUrl(trimmedBaseUrl);
    localStorage.setItem('newmaybe_ai_provider', p);
    localStorage.setItem('newmaybe_ai_model', m);
    localStorage.setItem('newmaybe_api_key', trimmedKey);
    localStorage.setItem('newmaybe_custom_base_url', trimmedBaseUrl);
    setShowConfig(false);
  };

  // 清除配置/注销 Key
  const clearConfig = () => {
    setProvider('free');
    setModel('workers-ai');
    setApiKey('');
    setCustomBaseUrl('');
    localStorage.removeItem('newmaybe_ai_provider');
    localStorage.removeItem('newmaybe_ai_model');
    localStorage.removeItem('newmaybe_api_key');
    localStorage.removeItem('newmaybe_custom_base_url');
    setShowConfig(false);
  };

  // 获取动态节点数量统计
  const stats = contentLoading ? null : {
    posts: allContent.filter(item => item.type === 'posts').length,
    notes: allContent.filter(item => item.type === 'notes').length,
    memories: allContent.filter(item => item.type === 'memories').length,
    excerpts: allContent.filter(item => item.type === 'excerpts').length,
    fragments: allContent.filter(item => item.type === 'fragments').length,
  };

  // 发送消息与推理主流程
  const handleSend = async () => {
    if (!inputText.trim()) return;

    // A. 免费体验模式下的频次拦截
    if (provider === 'free') {
      const limitStatus = checkFreeTurns();
      if (!limitStatus.ok) {
        setMessages(prev => [...prev, {
          id: `limit-error-${Date.now()}`,
          role: 'assistant',
          text: `您好，今日免费对话额度（${DAILY_FREE_LIMIT}次）已用完。免费模式旨在提供基础的体验，若要解除限制，您可以点击左下角配置您个人的 Gemini 或 OpenAI API 密钥（您的密钥将仅保存在本地浏览器中，十分安全）。`,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);
        setInputText('');
        return;
      }
    }

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      // B. 执行本地 RAG 搜索引擎检索匹配文章
      const matchedDocs = retrieveRelevantDocs(userMessage.text, allContent);
      const references = matchedDocs.map(item => ({
        type: item.doc.type === 'posts' ? '文章' : item.doc.type === 'notes' ? '笔记' : item.doc.type === 'memories' ? '记忆' : item.doc.type === 'excerpts' ? '拾遗' : '念头',
        title: item.doc.title,
        url: item.doc.url
      }));

      // C. 组装 System Prompt (包含 RAG 上下文)
      const systemPromptContent = buildSystemPrompt(matchedDocs.map(m => m.doc));

      // D. 构建多轮对话上下文结构
      const promptHistory = [
        { role: 'system', content: systemPromptContent },
        ...messages.filter(m => m.id !== 'welcome').map(m => ({
          role: m.role,
          content: m.text
        })),
        { role: 'user', content: userMessage.text }
      ];

      let replyText = '';
      const assistantMsgId = `msg-assistant-${Date.now()}`;

      if (provider === 'free') {
        // 调用 Cloudflare Workers AI 后端代理接口
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: promptHistory })
        });
        if (!res.ok) {
          const errData = await res.json() as any;
          throw new Error(errData.error || '后端接口响应错误');
        }

        // 插入助理空消息作为占位符，关闭等待动效
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          references: references,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('无法读取响应流');

        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;
            
            // 兼容有些环境不带 data: 前缀的情况，直接按 JSON 解析
            if (trimmed.startsWith('data: ')) {
              trimmed = trimmed.slice(6).trim();
            }
            
            if (trimmed === '[DONE]') break;
            
            if (trimmed.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmed);
                // 兼容不同平台的返回结构：Cloudflare (response) / OpenAI (choices[0].delta.content)
                const token = parsed.response || parsed.text || parsed.content || parsed.choices?.[0]?.delta?.content;
                if (token) {
                  replyText += token;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId ? { ...m, text: replyText } : m
                  ));
                }
              } catch (e) {
                console.warn('Failed to parse SSE line:', trimmed, e);
              }
            }
          }
        }

        // 扣减额度并更新状态
        const left = decrementFreeTurns();
        setFreeTurnsLeft(left);

      } else if (provider === 'openai') {
        // 直连 OpenAI 兼容接口 (浏览器前端调用)
        const baseUrl = customBaseUrl || 'https://api.openai.com/v1';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        const res = await fetch(`${cleanBaseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: model,
            messages: promptHistory.map(m => ({
              role: m.role,
              content: m.content
            })),
            stream: true // 开启流式
          })
        });

        if (!res.ok) {
          const errData = await res.json() as any;
          throw new Error(errData.error?.message || errData.error || 'OpenAI 兼容接口调用出错');
        }

        // 插入助理空消息作为占位符，关闭等待动效
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          text: '',
          references: references,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        if (!reader) throw new Error('无法读取响应流');

        let buffer = '';
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            let trimmed = line.trim();
            if (!trimmed) continue;
            
            // 兼容有些环境不带 data: 前缀的情况，直接按 JSON 解析
            if (trimmed.startsWith('data: ')) {
              trimmed = trimmed.slice(6).trim();
            }
            
            if (trimmed === '[DONE]') break;
            
            if (trimmed.startsWith('{')) {
              try {
                const parsed = JSON.parse(trimmed);
                const token = parsed.response || parsed.text || parsed.content || parsed.choices?.[0]?.delta?.content;
                if (token) {
                  replyText += token;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMsgId ? { ...m, text: replyText } : m
                  ));
                }
              } catch (e) {
                console.warn('Failed to parse OpenAI SSE line:', trimmed, e);
              }
            }
          }
        }

      } else if (provider === 'gemini') {
        // 直连 Gemini 兼容接口 (浏览器前端调用)
        const geminiMessages = promptHistory
          .filter(m => m.role !== 'system')
          .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }));

        const baseUrl = customBaseUrl || 'https://generativelanguage.googleapis.com';
        const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

        const res = await fetch(`${cleanBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: geminiMessages,
            systemInstruction: {
              parts: [{ text: systemPromptContent }]
            }
          })
        });
        const data = await res.json() as any;
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || data.error || 'Gemini 接口调用出错');
        }
        replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '未能获取回复，请重试。';

        // 非流式直接插入结果
        setIsTyping(false);
        setMessages(prev => [...prev, {
          id: assistantMsgId,
          role: 'assistant',
          text: replyText,
          references: references,
          timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        }]);
      }

    } catch (err: any) {
      console.error(err);
      setMessages(prev => [...prev, {
        id: `msg-error-${Date.now()}`,
        role: 'assistant',
        text: `【错误反馈】AI 连接发生故障：${err.message || err}。请确保您的 API 密钥配置正确，或者检查网络连接（自带 Key 直连可能需要特殊网络环境支持）。`,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const sidebarContent = (
    <>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
            newmaybe<span className="text-[var(--ochre)] font-serif">.ai</span>
          </a>
          <p className="text-xs text-[var(--ink-faint)] mt-2">智能层 · 个人知识 Agent 终端</p>
        </div>
        {/* 仅在移动端抽屉里显示关闭按钮 */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="md:hidden p-1.5 rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 状态统计 */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-4 mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)] mb-2.5">知识图谱索引状态</h4>
        <ul className="text-xs text-[var(--ink-soft)] space-y-1.5 list-none">
          <li className="flex justify-between"><span>🌲 文章节点 (Writing)</span> <span className="font-semibold">{stats ? `${stats.posts} 篇` : '—'}</span></li>
          <li className="flex justify-between"><span>🌱 笔记节点 (Note)</span> <span className="font-semibold">{stats ? `${stats.notes} 篇` : '—'}</span></li>
          <li className="flex justify-between"><span>🌳 记忆节点 (Memory)</span> <span className="font-semibold">{stats ? `${stats.memories} 个` : '—'}</span></li>
          <li className="flex justify-between"><span>📖 拾遗节点 (Excerpt)</span> <span className="font-semibold">{stats ? `${stats.excerpts} 条` : '—'}</span></li>
          <li className="flex justify-between"><span>🍂 念头节点 (Fragment)</span> <span className="font-semibold">{stats ? `${stats.fragments} 个` : '—'}</span></li>
        </ul>
      </div>

      {/* 创意写作同伴快捷指令 */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-4 mb-5">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)] mb-2.5">创意写作快捷指令</h4>
        <div className="flex flex-col gap-2">
          <button
            onClick={() => {
              setInputText('【文字留白诊断】\n\n请帮我分析以下文字的段落节奏、密度与留白美感，并给出优化润色建议：\n\n「在此替换为你的文字」');
              setIsMobileSidebarOpen(false);
            }}
            className="text-left w-full p-2 border border-[var(--line)] hover:border-[var(--ochre)] rounded text-[11px] text-[var(--ink-soft)] bg-transparent hover:bg-[var(--paper-deep)] cursor-pointer transition-all"
          >
            ✍ 文字留白诊断
          </button>
          <button
            onClick={() => {
              setInputText('【古典意象润色】\n\n请将以下这段大白话或描述，润色为富有东方古典意境、诗意画面感和衬线质感的唯美句子：\n\n「在此替换为你的描述」');
              setIsMobileSidebarOpen(false);
            }}
            className="text-left w-full p-2 border border-[var(--line)] hover:border-[var(--ochre)] rounded text-[11px] text-[var(--ink-soft)] bg-transparent hover:bg-[var(--paper-deep)] cursor-pointer transition-all"
          >
            🍃 古典意象润色
          </button>
          <button
            onClick={() => {
              setInputText('【灵感词汇发散】\n\n请以这个词或念头为中心，为我发散相关的古典隐喻、感官连结与散文联想意象：\n\n「在此替换为你的核心词」');
              setIsMobileSidebarOpen(false);
            }}
            className="text-left w-full p-2 border border-[var(--line)] hover:border-[var(--ochre)] rounded text-[11px] text-[var(--ink-soft)] bg-transparent hover:bg-[var(--paper-deep)] cursor-pointer transition-all"
          >
            💡 灵感词汇发散
          </button>
          <button
            onClick={() => {
              setInputText('【念头共鸣启发】\n\n这是我最近写下或脑海中闪现的一个念头：\n\n「在此替换为你的念头/想法」\n\n请在林的数字花园中寻找与我产生共鸣的相似随笔、笔记或想法，并与我开启一场跨越时空的文字共鸣探讨。');
              setIsMobileSidebarOpen(false);
            }}
            className="text-left w-full p-2 border border-[var(--line)] hover:border-[var(--ochre)] rounded text-[11px] text-[var(--ink-soft)] bg-transparent hover:bg-[var(--paper-deep)] cursor-pointer transition-all"
          >
            🌸 念头共鸣启发
          </button>
        </div>
      </div>

      {/* 大模型配置面板 */}
      <div className="mt-auto pt-4 border-t border-[var(--line)]">
        {showConfig ? (
          <div className="flex flex-col gap-3">
            <label className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">接口协议模式</label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value as ProviderType;
                setProvider(val);
                if (val === 'gemini') {
                  setCustomBaseUrl('https://generativelanguage.googleapis.com');
                  setModel('gemini-2.5-flash');
                } else if (val === 'openai') {
                  setCustomBaseUrl('https://api.openai.com/v1');
                  setModel('gpt-4o-mini');
                } else {
                  setCustomBaseUrl('');
                  setModel('workers-ai');
                }
              }}
              className="w-full p-2 text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
            >
              <option value="free">Cloudflare Workers AI (免费体验)</option>
              <option value="openai">OpenAI 兼容协议 (自定义/国内模型)</option>
              <option value="gemini">Gemini 协议 (自定义/官方)</option>
            </select>

            {provider !== 'free' && (
              <>
                <label className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">API Base URL</label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => setCustomBaseUrl(e.target.value)}
                  placeholder={provider === 'openai' ? 'https://api.openai.com/v1' : 'https://generativelanguage.googleapis.com'}
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />

                <label className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">推理模型 (Model Name)</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-2.5-flash'}
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />

                {/* 一键填入助手 */}
                <div className="border border-[var(--line)] rounded p-2.5 bg-[var(--paper)]/50">
                  <span className="block text-[9px] font-semibold text-[var(--ochre)] tracking-wider uppercase mb-1.5">💡 常用服务快速填制</span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS
                      .filter(s => {
                        if (provider === 'gemini') return s.url.includes('generativelanguage');
                        return !s.url.includes('generativelanguage');
                      })
                      .map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            setCustomBaseUrl(s.url);
                            setModel(s.model);
                          }}
                          className="text-[10px] bg-[var(--paper-deep)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                        >
                          {s.name}
                        </button>
                      ))}
                  </div>
                </div>

                <label className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">API 密钥 (API Key)</label>
                <input
                  type="password"
                  placeholder="输入 API Key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />
              </>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={() => saveConfig(provider, model, apiKey, customBaseUrl)}
                className="flex-grow bg-[var(--ochre)] text-[var(--paper)] py-1.5 rounded text-xs font-medium cursor-pointer hover:bg-[var(--ochre-deep)] transition-colors"
              >
                保存
              </button>
              {apiKey && (
                <button
                  onClick={clearConfig}
                  className="px-2 border border-red-200 text-red-500 py-1.5 rounded text-xs cursor-pointer hover:bg-red-50/20"
                >
                  注销
                </button>
              )}
              <button
                onClick={() => {
                  // 恢复已保存的设置
                  const savedProvider = localStorage.getItem('newmaybe_ai_provider') as ProviderType | null || 'free';
                  const savedModel = localStorage.getItem('newmaybe_ai_model') || 'workers-ai';
                  const savedKey = (localStorage.getItem('newmaybe_api_key') || '').trim();
                  const savedBaseUrl = (localStorage.getItem('newmaybe_custom_base_url') || '').trim();
                  setProvider(savedProvider);
                  setModel(savedModel);
                  setApiKey(savedKey);
                  setCustomBaseUrl(savedBaseUrl);
                  setShowConfig(false);
                }}
                className="px-3 border border-[var(--line)] text-[var(--ink-soft)] py-1.5 rounded text-xs cursor-pointer hover:bg-[var(--paper)] transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[var(--ink-faint)]">推理模式:</span>
              <span className="font-semibold text-[var(--ochre)] text-right break-all max-w-[60%]">
                {provider === 'free' && 'Workers AI (免费模式)'}
                {provider === 'openai' && `${model}`}
                {provider === 'gemini' && `${model}`}
              </span>
            </div>
            {provider === 'free' && (
              <div className="flex justify-between items-center text-xs border-b border-dashed border-[var(--line)] pb-2 mb-1">
                <span className="text-[var(--ink-faint)]">今日体验额度:</span>
                <span className="font-semibold text-[var(--ink-soft)]">{freeTurnsLeft} / {DAILY_FREE_LIMIT} 次</span>
              </div>
            )}
            <button
              onClick={() => setShowConfig(true)}
              className="w-full text-center border border-[var(--line)] hover:border-[var(--ochre)] text-[var(--ink-soft)] hover:text-[var(--ochre)] py-2 rounded text-xs transition-all cursor-pointer bg-[var(--paper)]/50"
            >
              配置推理引擎 / API Key
            </button>
          </div>
        )}
      </div>
    </>
  );

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-[var(--paper)]">
      
      {/* 移动端侧边栏抽屉/遮罩 */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* 遮罩背景 */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          {/* 抽屉主体 */}
          <aside className="relative w-80 max-w-[80vw] h-full bg-[var(--paper)] border-r border-[var(--line)] flex flex-col p-6 overflow-y-auto transition-colors duration-500 z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* 桌面端侧边栏 */}
      <aside className="hidden md:flex md:w-80 bg-[color-mix(in_srgb,var(--paper-deep)_80%,transparent)] backdrop-blur-md border-r border-[var(--line)] flex-col p-6 shrink-0 transition-colors duration-500 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* 右侧聊天区域 */}
      <section className="flex-grow flex flex-col h-full overflow-hidden">
        {/* 聊天头部 */}
        <header className="h-16 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_80%,transparent)] backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 transition-colors duration-500">
          <div className="flex items-center gap-3">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex md:hidden items-center justify-center p-2 rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:border-[var(--ochre)] bg-transparent cursor-pointer transition-colors"
              title="打开设置与状态"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-sm font-semibold text-[var(--ink)]">思考 Agent 终端</span>
            </div>
          </div>
          <a href={resolveSubdomain("https://newmaybe.com")} className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline">
            ← <span className="hidden md:inline">返回主站 </span>newmaybe.com
          </a>
        </header>

        {/* 消息历史区 */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[90%] md:max-w-[70%] msg-animate ${
                msg.role === 'user' ? 'ml-auto items-end' : 'mr-auto items-start'
              }`}
            >
              <div
                className={`p-4 rounded-lg text-sm leading-relaxed text-justify font-serif border ${
                  msg.role === 'user'
                    ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink)] rounded-br-none'
                    : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] rounded-bl-none shadow-sm'
                }`}
              >
                {/* 格式化输出回答文本 */}
                <div className="whitespace-pre-wrap">{msg.text}</div>
                
                {/* 知识来源引证 */}
                {msg.references && msg.references.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)]">
                    <span className="block text-[10px] text-[var(--ochre)] tracking-wider uppercase mb-1.5 font-sans font-semibold">参考引证 (References)</span>
                    <div className="flex flex-wrap gap-2 font-sans text-xs">
                      {msg.references.map((ref, idx) => (
                        <a
                          key={idx}
                          href={ref.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="bg-[var(--paper-deep)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] px-2.5 py-1 rounded transition-colors no-underline"
                        >
                          [{ref.type}] {ref.title}
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* 如果是助手的回答，且非错误，提供发送到卡片加工厂/海报工作室/思维沙盒的功能 */}
                {msg.role === 'assistant' && msg.id !== 'welcome' && !msg.id.includes('error') && (
                  <div className="mt-4 pt-2.5 border-t border-dashed border-[var(--line)] flex flex-wrap gap-2 justify-end">
                    <button
                      onClick={() => {
                        window.open(`${resolveSubdomain('https://tools.newmaybe.com')}?content=${encodeURIComponent(msg.text)}`, '_blank');
                      }}
                      className="px-2 py-1 rounded text-[10px] border border-[var(--line)] bg-[var(--paper-deep)] hover:bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
                      title="将此回答发送到卡片生成器"
                    >
                      ✨ 发送至卡片加工厂
                    </button>
                    <button
                      onClick={() => {
                        window.open(`${resolveSubdomain('https://studio.newmaybe.com')}?quote=${encodeURIComponent(msg.text)}`, '_blank');
                      }}
                      className="px-2 py-1 rounded text-[10px] border border-[var(--line)] bg-[var(--paper-deep)] hover:bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
                      title="将此回答发送到海报生成器"
                    >
                      🎨 发送至海报工作室
                    </button>
                    <button
                      onClick={() => {
                        window.open(`${resolveSubdomain('https://graph.newmaybe.com')}?add_node=${encodeURIComponent(msg.text)}`, '_blank');
                      }}
                      className="px-2 py-1 rounded text-[10px] border border-[var(--line)] bg-[var(--paper-deep)] hover:bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
                      title="将此回答发送到思维沙盒"
                    >
                      🌐 发送至思维沙盒
                    </button>
                  </div>
                )}
              </div>
              <span className="text-[10px] text-[var(--ink-faint)] mt-1.5 px-1">{msg.timestamp}</span>
            </div>
          ))}
          
          {/* 打字机思考中状态 */}
          {isTyping && (
            <div className="flex flex-col items-start mr-auto max-w-[70%] msg-animate">
              <div className="p-4 rounded-lg bg-[var(--paper)] border border-[var(--line)] rounded-bl-none shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce"></span>
                <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>

        {/* 聊天输入框 */}
        <div className="p-4 md:p-6 border-t border-[var(--line)] bg-[var(--paper-deep)] shrink-0 transition-colors duration-500">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="max-w-4xl mx-auto flex gap-2 md:gap-3 w-full"
          >
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="向您的个人知识 Agent 终端提问..."
              className="flex-grow min-w-0 p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-[16px] md:text-sm focus:border-[var(--ochre)] outline-none transition-colors"
            />
            <button
              type="submit"
              className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] px-4 md:px-6 rounded font-semibold text-sm transition-colors cursor-pointer shrink-0"
            >
              发送
            </button>
          </form>
        </div>

      </section>

    </div>
  );
}
