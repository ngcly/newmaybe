export default function TypingIndicator() {
  return (
    <div className="flex flex-col items-start mr-auto max-w-[70%] msg-animate">
      <div className="p-4 rounded-lg bg-[var(--paper)] border border-[var(--line)] rounded-bl-none shadow-sm flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce" />
        <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce [animation-delay:0.2s]" />
        <span className="w-1.5 h-1.5 bg-[var(--ochre)] rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  );
}
