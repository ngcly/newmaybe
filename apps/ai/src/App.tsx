import { useState, useEffect, useRef } from 'react';
import { resolveSubdomain as _resolveSubdomain } from '@newmaybe/content/utils';
import { useChat } from './hooks/useChat';
import Sidebar from './components/Sidebar';
import ChatMessage from './components/ChatMessage';
import TypingIndicator from './components/TypingIndicator';
import Gardener from './components/Gardener';
import CapturePad from './components/CapturePad';
import EgoMirror from './components/EgoMirror';

const _isDev =
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
const resolveSubdomain = (url: string) => _resolveSubdomain(url, _isDev);

export default function App() {
  const chat = useChat();
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'gardener' | 'capture' | 'ego'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Handle initial ?q= parameter from cross-app linking
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const query = params.get('q');
      if (query) {
        chat.setInputText(query);
        // Clear URL param so refresh doesn't re-send
        const url = new URL(window.location.href);
        url.searchParams.delete('q');
        window.history.replaceState({}, '', url.toString());
      }
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-send initial query once content loads
  const initialQuerySent = useRef(false);
  useEffect(() => {
    if (!chat.contentLoading && chat.inputText && !initialQuerySent.current) {
      initialQuerySent.current = true;
      chat.handleSend(chat.inputText);
    }
  }, [chat.contentLoading, chat.inputText, chat.handleSend]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chat.messages, chat.isTyping, activeTab]);

  const sidebarContent = (
    <Sidebar
      resolveSubdomain={resolveSubdomain}
      stats={chat.stats}
      contentLoading={chat.contentLoading}
      provider={chat.provider}
      model={chat.model}
      apiKey={chat.apiKey}
      customBaseUrl={chat.customBaseUrl}
      freeTurnsLeft={chat.freeTurnsLeft}
      showConfig={chat.showConfig}
      messageCount={chat.messages.length}
      onProviderChange={chat.setProvider}
      onModelChange={chat.setModel}
      onApiKeyChange={chat.setApiKey}
      onCustomBaseUrlChange={chat.setCustomBaseUrl}
      onToggleConfig={chat.setShowConfig}
      onSaveConfig={chat.saveConfig}
      onClearConfig={chat.clearConfig}
      onCancelConfig={() => {
        const savedProvider =
          (localStorage.getItem('newmaybe_ai_provider') as typeof chat.provider | null) || 'free';
        const savedModel = localStorage.getItem('newmaybe_ai_model') || 'workers-ai';
        const savedKey = (localStorage.getItem('newmaybe_api_key') || '').trim();
        const savedBaseUrl = (localStorage.getItem('newmaybe_custom_base_url') || '').trim();
        chat.setProvider(savedProvider);
        chat.setModel(savedModel);
        chat.setApiKey(savedKey);
        chat.setCustomBaseUrl(savedBaseUrl);
        chat.setShowConfig(false);
      }}
      onClearMessages={chat.clearMessages}
      onSetInputText={chat.setInputText}
      onCloseMobile={() => setIsMobileSidebarOpen(false)}
    />
  );

  return (
    <div className="h-dvh flex flex-col md:flex-row overflow-hidden bg-[var(--paper)]">
      {/* Mobile sidebar drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <aside className="relative w-80 max-w-[80vw] h-full bg-[var(--paper)] border-r border-[var(--line)] flex flex-col p-6 overflow-y-auto transition-colors duration-500 z-10 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden md:flex md:w-80 bg-[color-mix(in_srgb,var(--paper-deep)_80%,transparent)] backdrop-blur-md border-r border-[var(--line)] flex-col p-6 shrink-0 transition-colors duration-500 overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* Main Content area */}
      <section className="flex-grow flex flex-col h-full overflow-hidden">
        <header className="h-16 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--paper)_80%,transparent)] backdrop-blur-md flex items-center justify-between px-4 md:px-6 shrink-0 transition-colors duration-500">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              className="flex md:hidden items-center justify-center p-2 rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] hover:border-[var(--ochre)] bg-transparent cursor-pointer transition-colors"
              title="打开设置与状态"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-semibold text-[var(--ink)]">思考 Agent 终端</span>
            </div>
          </div>
          <a
            href={resolveSubdomain('https://newmaybe.com')}
            className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline"
          >
            ← <span className="hidden md:inline">返回主站 </span>newmaybe.com
          </a>
        </header>

        {/* Tab navigation */}
        <nav className="flex border-b border-[var(--line)] bg-[var(--paper-deep)] px-6 shrink-0 gap-4 transition-colors duration-500">
          <button
            onClick={() => setActiveTab('chat')}
            className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'chat'
                ? 'border-[var(--ochre)] text-[var(--ochre)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            问答终端
          </button>
          <button
            onClick={() => setActiveTab('gardener')}
            className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'gardener'
                ? 'border-[var(--ochre)] text-[var(--ochre)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            花园园丁
          </button>
          <button
            onClick={() => setActiveTab('capture')}
            className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'capture'
                ? 'border-[var(--ochre)] text-[var(--ochre)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            灵感捕获
          </button>
          <button
            onClick={() => setActiveTab('ego')}
            className={`py-3.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
              activeTab === 'ego'
                ? 'border-[var(--ochre)] text-[var(--ochre)] font-bold'
                : 'border-transparent text-[var(--ink-soft)] hover:text-[var(--ink)]'
            }`}
          >
            自我对撞
          </button>
        </nav>

        {/* Tab Content Panels */}
        <div className="flex-grow overflow-hidden relative">
          {activeTab === 'chat' && (
            <div className="h-full flex flex-col justify-between">
              {/* Messages */}
              <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-6">
                {chat.messages.map((msg) => (
                  <ChatMessage key={msg.id} msg={msg} resolveSubdomain={resolveSubdomain} />
                ))}
                {chat.isTyping && <TypingIndicator />}
                <div ref={chatEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 md:p-6 border-t border-[var(--line)] bg-[var(--paper-deep)] shrink-0 transition-colors duration-500">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    chat.handleSend();
                  }}
                  className="max-w-4xl mx-auto flex gap-2 md:gap-3 w-full"
                >
                  <input
                    type="text"
                    value={chat.inputText}
                    onChange={(e) => chat.setInputText(e.target.value)}
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
            </div>
          )}

          {activeTab === 'gardener' && (
            <div className="h-full overflow-y-auto p-6 md:p-8">
              <Gardener
                allContent={chat.allContent}
                resolveSubdomain={resolveSubdomain}
                onSwitchToChat={(prompt) => {
                  chat.setInputText(prompt);
                  setActiveTab('chat');
                  chat.handleSend(prompt);
                }}
              />
            </div>
          )}

          {activeTab === 'capture' && (
            <div className="h-full overflow-y-auto p-6 md:p-8">
              <CapturePad
                provider={chat.provider}
                model={chat.model}
                apiKey={chat.apiKey}
                customBaseUrl={chat.customBaseUrl}
              />
            </div>
          )}

          {activeTab === 'ego' && (
            <div className="h-full p-6">
              <EgoMirror
                allContent={chat.allContent}
                resolveSubdomain={resolveSubdomain}
                provider={chat.provider}
                model={chat.model}
                apiKey={chat.apiKey}
                customBaseUrl={chat.customBaseUrl}
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
