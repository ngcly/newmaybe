import type { Message } from '../types';

interface ChatMessageProps {
  msg: Message;
  resolveSubdomain: (url: string) => string;
}

export default function ChatMessage({ msg, resolveSubdomain }: ChatMessageProps) {
  const isUser = msg.role === 'user';
  const isError = msg.id.includes('error');
  const isWelcome = msg.id === 'welcome';

  return (
    <div
      className={`flex flex-col max-w-[90%] md:max-w-[70%] msg-animate ${
        isUser ? 'ml-auto items-end' : 'mr-auto items-start'
      }`}
    >
      <div
        className={`p-4 rounded-lg text-sm leading-relaxed text-justify font-serif border ${
          isUser
            ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ink)] rounded-br-none'
            : 'bg-[var(--paper)] border-[var(--line)] text-[var(--ink)] rounded-bl-none shadow-sm'
        }`}
      >
        <div className="whitespace-pre-wrap">{msg.text}</div>

        {/* References */}
        {msg.references && msg.references.length > 0 && (
          <div className="mt-4 pt-3 border-t border-dashed border-[var(--line)]">
            <span className="block text-[10px] text-[var(--ochre)] tracking-wider uppercase mb-1.5 font-sans font-semibold">
              参考引证 (References)
            </span>
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

        {/* Cross-app actions for assistant messages */}
        {!isUser && !isWelcome && !isError && (
          <div className="mt-4 pt-2.5 border-t border-dashed border-[var(--line)] flex flex-wrap gap-2 justify-end">
            <button
              onClick={() => {
                window.open(
                  `${resolveSubdomain('https://tools.newmaybe.com')}?content=${encodeURIComponent(msg.text)}`,
                  '_blank',
                );
              }}
              className="px-2 py-1 rounded text-[10px] border border-[var(--line)] bg-[var(--paper-deep)] hover:bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
              title="将此回答发送到卡片生成器"
            >
              ✨ 发送至卡片加工厂
            </button>
            <button
              onClick={() => {
                window.open(
                  `${resolveSubdomain('https://studio.newmaybe.com')}?quote=${encodeURIComponent(msg.text)}`,
                  '_blank',
                );
              }}
              className="px-2 py-1 rounded text-[10px] border border-[var(--line)] bg-[var(--paper-deep)] hover:bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.97]"
              title="将此回答发送到海报生成器"
            >
              🎨 发送至海报工作室
            </button>
            <button
              onClick={() => {
                window.open(
                  `${resolveSubdomain('https://graph.newmaybe.com')}?add_node=${encodeURIComponent(msg.text)}`,
                  '_blank',
                );
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
  );
}
