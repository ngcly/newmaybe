import { useState, useEffect, useRef } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  references?: { type: string; title: string; url: string }[];
}

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
  const [apiKey, setApiKey] = useState('');
  const [showConfig, setShowConfig] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // 加载本地 API Key
  useEffect(() => {
    const savedKey = localStorage.getItem('newmaybe_api_key');
    if (savedKey) setApiKey(savedKey);
  }, []);

  // 滚动到底部
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const saveApiKey = (key: string) => {
    setApiKey(key);
    localStorage.setItem('newmaybe_api_key', key);
    setShowConfig(false);
  };

  // 模拟 Agent 智能检索响应
  const getAgentResponse = (query: string): { text: string; refs?: { type: string; title: string; url: string }[] } => {
    const q = query.toLowerCase();
    
    if (q.includes('慢阅读') || q.includes('slow')) {
      return {
        text: '关于「慢阅读 (Slow Reading)」，您的档案库（v1.0.0）记录道：这是一种有意识地降低阅读速度以实现深入理解、批判性思考和审美享受的阅读态度。在信息洪流中，慢阅读是一种主动的撤退和反抗。它要求“无任务”的沉浸感，并允许阅读后产生的想法在时间中慢慢沉淀，化作“落叶”落入您的数字花园中。',
        refs: [{ type: '记忆', title: '慢阅读 (Slow Reading)', url: 'https://newmaybe.com/memory/slow-reading' }]
      };
    }
    
    if (q.includes('隐私') || q.includes('privacy')) {
      return {
        text: '根据您在「隐私优先原则」档案（v1.0.2）中的记录，隐私优先是系统底层的核心约束。其实践包括：1) 零追踪：拒绝引入类似 Google Analytics 的第三方代码；2) 静态生成 (SSG)：消除服务端动态追踪的可能；3) 零 Cookie 运行：完全匿名化读者的浏览路径。',
        refs: [{ type: '记忆', title: '隐私优先原则', url: 'https://newmaybe.com/memory/privacy-first' }]
      };
    }
    
    if (q.includes('追踪') || q.includes('tracking')) {
      return {
        text: '您在笔记《对抗现代互联网的追踪机制》中探讨过：现代互联网的追踪无处不在，对抗追踪不是退缩，而是一种尊重的表达。在主站中，您通过使用 Pagefind 本地索引实现纯静态搜索、使用 Cloudflare Web Analytics 进行无 Cookie 统计、以及全面使用 Vanilla CSS 保持精简，把选择权完全交还给了读者。',
        refs: [
          { type: '笔记', title: '对抗现代互联网的追踪机制', url: 'https://newmaybe.com/notes/anti-tracking' },
          { type: '记忆', title: '隐私优先原则', url: 'https://newmaybe.com/memory/privacy-first' }
        ]
      };
    }

    if (q.includes('花园') || q.includes('garden')) {
      return {
        text: '在笔记《数字花园的生长机制》中，您将网站定义为一个“持续生长的生命系统”。它遵循三个核心准则：1) 先记录，后整理（快速捕获灵感）；2) 永远允许未完成（笔记可以长期处于半成品草稿状态）；3) 链接优于分类（利用 Connections 建立网状脉络，而不是强行用文件夹分类）。',
        refs: [
          { type: '笔记', title: '数字花园的生长机制', url: 'https://newmaybe.com/notes/digital-garden' }
        ]
      };
    }

    return {
      text: `我已经检索了您的知识库。根据您的数字花园配置，您的文字、笔记和摘录均共享同一套 Markdown 内容中枢。

如果您配置了自定义 API Key（支持 OpenAI/Gemini），我可以借助底层大模型进行更加深度的发散推理。当前本地模拟状态下，您可以向我提问关于：“慢阅读”、“隐私优先”、“数字花园” 或 “对抗追踪” 的核心思想。`,
      refs: [
        { type: '主站', title: 'newmaybe.com', url: 'https://newmaybe.com' }
      ]
    };
  };

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text: inputText,
      timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // 模拟思考延迟 (1.2秒)
    setTimeout(() => {
      const response = getAgentResponse(userMessage.text);
      const assistantMessage: Message = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: response.text,
        references: response.refs,
        timestamp: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[var(--paper)]">
      
      {/* 左侧控制栏 */}
      <aside className="w-full md:w-80 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500 overflow-y-auto">
        <div className="mb-6">
          <a href="https://newmaybe.com" className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline">
            newmaybe<span className="text-[var(--ochre)] font-serif">.ai</span>
          </a>
          <p className="text-xs text-[var(--ink-faint)] mt-2">智能层 · 个人知识 Agent 终端</p>
        </div>

        {/* 状态统计 */}
        <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-4 mb-6">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-[var(--ochre)] mb-3">知识图谱索引状态</h4>
          <ul className="text-xs text-[var(--ink-soft)] space-y-2 list-none">
            <li className="flex justify-between"><span>🌲 文章节点 (Writing)</span> <span className="font-semibold">9 篇</span></li>
            <li className="flex justify-between"><span>🌱 笔记节点 (Note)</span> <span className="font-semibold">2 篇</span></li>
            <li className="flex justify-between"><span>🌳 记忆节点 (Memory)</span> <span className="font-semibold">2 个</span></li>
            <li className="flex justify-between"><span>📖 拾遗节点 (Excerpt)</span> <span className="font-semibold">3 条</span></li>
            <li className="flex justify-between"><span>🍂 念头节点 (Fragment)</span> <span className="font-semibold">1 个</span></li>
          </ul>
        </div>

        {/* 大模型配置面板 */}
        <div className="mt-auto pt-4 border-t border-[var(--line)]">
          {showConfig ? (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] uppercase font-semibold text-[var(--ink-faint)]">自定义 API 密钥 (保存于本地)</label>
              <input
                type="password"
                placeholder="输入 API 密钥..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => saveApiKey(apiKey)}
                  className="flex-grow bg-[var(--ochre)] text-[var(--paper)] py-1.5 rounded text-xs font-medium cursor-pointer"
                >
                  保存
                </button>
                <button
                  onClick={() => setShowConfig(false)}
                  className="px-3 border border-[var(--line)] text-[var(--ink-soft)] py-1.5 rounded text-xs cursor-pointer"
                >
                  取消
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[var(--ink-faint)]">推理模式:</span>
                <span className="font-semibold text-[var(--ochre)]">{apiKey ? '实时 API 交互' : '本地中枢模拟'}</span>
              </div>
              <button
                onClick={() => setShowConfig(true)}
                className="w-full text-center border border-[var(--line)] hover:border-[var(--ochre)] text-[var(--ink-soft)] hover:text-[var(--ochre)] py-2 rounded text-xs transition-all cursor-pointer bg-[var(--paper)]/50"
              >
                配置推理引擎 API Key
              </button>
            </div>
          )}
        </div>

        <a href="https://newmaybe.com" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline mt-6 block md:hidden">
          ← 返回主站 newmaybe.com
        </a>
      </aside>

      {/* 右侧聊天区域 */}
      <section className="flex-grow flex flex-col h-full overflow-hidden">
        {/* 聊天头部 */}
        <header className="h-16 border-b border-[var(--line)] bg-[var(--paper)] flex items-center justify-between px-6 shrink-0 transition-colors duration-500">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-sm font-semibold text-[var(--ink)]">思考 Agent 终端</span>
          </div>
          <a href="https://newmaybe.com" className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline hidden md:block">
            ← 返回主站 newmaybe.com
          </a>
        </header>

        {/* 消息历史区 */}
        <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col max-w-[85%] md:max-w-[70%] msg-animate ${
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
                {msg.text}
                
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
        <div className="p-6 border-t border-[var(--line)] bg-[var(--paper-deep)] shrink-0 transition-colors duration-500">
          <div className="max-w-4xl mx-auto flex gap-3">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="向您的个人知识 Agent 终端提问...（支持回车）"
              className="flex-grow p-3 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] text-sm focus:border-[var(--ochre)] outline-none transition-colors"
            />
            <button
              onClick={handleSend}
              className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] px-6 rounded font-semibold text-sm transition-colors cursor-pointer"
            >
              发送
            </button>
          </div>
        </div>

      </section>

    </div>
  );
}
