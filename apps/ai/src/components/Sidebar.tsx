import type { ProviderType, ContentStats } from '../types';
import { DAILY_FREE_LIMIT, SUGGESTIONS, QUICK_ACTIONS } from '../constants';

interface SidebarProps {
  stats: ContentStats | null;
  contentLoading: boolean;
  contentError: string | null;
  provider: ProviderType;
  model: string;
  apiKey: string;
  customBaseUrl: string;
  freeTurnsLeft: number;
  showConfig: boolean;
  messageCount: number;
  onProviderChange: (p: ProviderType) => void;
  onModelChange: (m: string) => void;
  onApiKeyChange: (k: string) => void;
  onCustomBaseUrlChange: (b: string) => void;
  onToggleConfig: (v: boolean) => void;
  onSaveConfig: () => void;
  onClearConfig: () => void;
  onCancelConfig: () => void;
  onClearMessages: () => void;
  onSetInputText: (t: string) => void;
  onCloseMobile: () => void;
}

export default function Sidebar(props: SidebarProps) {
  const {
    stats,
    contentLoading,
    contentError,
    provider,
    model,
    apiKey,
    customBaseUrl,
    freeTurnsLeft,
    showConfig,
    messageCount,
    onProviderChange,
    onModelChange,
    onApiKeyChange,
    onCustomBaseUrlChange,
    onToggleConfig,
    onSaveConfig,
    onClearConfig,
    onCancelConfig,
    onClearMessages,
    onSetInputText,
    onCloseMobile,
  } = props;

  return (
    <>
      <div className="mb-6 flex justify-between items-start">
        <a href="/" className="nm-brand nm-brand--stacked">
          <span className="nm-brand-seal" aria-hidden="true">
            园
          </span>
          <span className="nm-brand-text">
            <span className="nm-brand-word">
              newmaybe<span className="nm-brand-dot">.</span>
              <span className="nm-brand-sub">ai</span>
            </span>
            <span className="nm-brand-name">AI 园丁</span>
          </span>
        </a>
        <button
          onClick={onCloseMobile}
          className="md:hidden p-1.5 rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Stats */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-4 mb-5">
        <h4 className="text-xs font-semibold tracking-wider text-[var(--ochre)] mb-2.5">
          知识图谱索引状态
        </h4>
        {contentError && <p className="text-xs text-[var(--cinnabar-text)] mb-2">{contentError}</p>}
        <ul className="text-xs text-[var(--ink-soft)] space-y-1.5 list-none">
          {[
            ['文章', stats?.posts, '篇'],
            ['笔记', stats?.notes, '篇'],
            ['记忆', stats?.memories, '个'],
            ['拾遗', stats?.excerpts, '条'],
            ['念头', stats?.fragments, '个'],
          ].map(([label, count, unit]) => (
            <li key={label as string} className="flex justify-between">
              <span>{label}</span>
              <span className="font-semibold">
                {contentLoading || contentError ? '—' : `${count} ${unit}`}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick actions */}
      <div className="bg-[var(--paper)] border border-[var(--line)] rounded p-4 mb-5">
        <h4 className="text-xs font-semibold tracking-wider text-[var(--ochre)] mb-2.5">
          创意写作快捷指令
        </h4>
        <div className="flex flex-col gap-2">
          {QUICK_ACTIONS.map((action) => (
            <button
              key={action.label}
              onClick={() => {
                onSetInputText(action.prompt);
                onCloseMobile();
              }}
              className="text-left w-full p-2 border border-[var(--line)] hover:border-[var(--ochre)] rounded text-xs text-[var(--ink-soft)] bg-transparent hover:bg-[var(--paper-deep)] cursor-pointer transition-all"
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Config panel */}
      <div className="mt-auto pt-4 border-t border-[var(--line)]">
        {showConfig ? (
          <div className="flex flex-col gap-3">
            <label className="text-xs font-semibold text-[var(--ink-faint)]">接口协议模式</label>
            <select
              value={provider}
              onChange={(e) => {
                const val = e.target.value as ProviderType;
                onProviderChange(val);
                if (val === 'gemini') {
                  onCustomBaseUrlChange('https://generativelanguage.googleapis.com');
                  onModelChange('gemini-3.5-flash');
                } else if (val === 'openai') {
                  onCustomBaseUrlChange('https://api.openai.com/v1');
                  onModelChange('gpt-4o-mini');
                } else {
                  onCustomBaseUrlChange('');
                  onModelChange('workers-ai');
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
                <label className="text-xs font-semibold text-[var(--ink-faint)]">
                  API Base URL
                </label>
                <input
                  type="text"
                  value={customBaseUrl}
                  onChange={(e) => onCustomBaseUrlChange(e.target.value)}
                  placeholder={
                    provider === 'openai'
                      ? 'https://api.openai.com/v1'
                      : 'https://generativelanguage.googleapis.com'
                  }
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />
                <label className="text-xs font-semibold text-[var(--ink-faint)]">推理模型</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => onModelChange(e.target.value)}
                  placeholder={provider === 'openai' ? 'gpt-4o-mini' : 'gemini-3.5-flash'}
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />

                <div className="border border-[var(--line)] rounded p-2.5 bg-[var(--paper)]/50">
                  <span className="block text-xs font-semibold text-[var(--ochre)] tracking-wider mb-1.5">
                    常用服务快速填制
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {SUGGESTIONS.filter((s) => {
                      if (provider === 'gemini') return s.url.includes('generativelanguage');
                      return !s.url.includes('generativelanguage');
                    }).map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          onCustomBaseUrlChange(s.url);
                          onModelChange(s.model);
                        }}
                        className="text-xs bg-[var(--paper-deep)] hover:bg-[var(--line)] border border-[var(--line)] text-[var(--ink-soft)] px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>

                <label className="text-xs font-semibold text-[var(--ink-faint)]">API 密钥</label>
                <input
                  type="password"
                  placeholder="输入 API Key..."
                  value={apiKey}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  className="w-full p-2 text-[16px] md:text-xs border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] outline-none"
                />
              </>
            )}

            <div className="flex gap-2 mt-1">
              <button
                onClick={onSaveConfig}
                className="flex-grow bg-[var(--ochre)] text-[var(--paper)] py-1.5 rounded text-xs font-medium cursor-pointer hover:bg-[var(--ochre-deep)] transition-colors"
              >
                保存
              </button>
              {apiKey && (
                <button
                  onClick={onClearConfig}
                  className="px-2 border border-[var(--cinnabar)]/40 text-[var(--cinnabar-text)] py-1.5 rounded text-xs cursor-pointer hover:bg-[var(--cinnabar-bg)]"
                >
                  注销
                </button>
              )}
              <button
                onClick={onCancelConfig}
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
                <span className="font-semibold text-[var(--ink-soft)]">
                  {freeTurnsLeft} / {DAILY_FREE_LIMIT} 次
                </span>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => onToggleConfig(true)}
                className="flex-grow text-center border border-[var(--line)] hover:border-[var(--ochre)] text-[var(--ink-soft)] hover:text-[var(--ochre)] py-2 rounded text-xs transition-all cursor-pointer bg-[var(--paper)]/50"
              >
                配置推理引擎
              </button>
              {messageCount > 1 && (
                <button
                  onClick={() => {
                    if (confirm('确认清空所有对话历史吗？')) {
                      onClearMessages();
                    }
                  }}
                  className="px-3 border border-[var(--cinnabar)]/40 hover:border-[var(--cinnabar)] text-[var(--cinnabar-text)] hover:bg-[var(--cinnabar-bg)] py-2 rounded text-xs transition-all cursor-pointer bg-[var(--paper)]/50"
                  title="清空对话历史"
                >
                  清空
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
