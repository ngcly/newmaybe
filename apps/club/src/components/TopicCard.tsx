import type { Topic } from '../types';

interface TopicCardProps {
  topic: Topic;
  isSelected?: boolean;
  onSelect: (topicId: string) => void;
}

export default function TopicCard({ topic, isSelected, onSelect }: TopicCardProps) {
  return (
    <div
      onClick={() => onSelect(topic.id)}
      className={`p-6 rounded border transition-all duration-300 cursor-pointer flex flex-col justify-between group ${
        isSelected
          ? 'bg-[var(--paper)] border-[var(--ochre)] shadow-sm'
          : 'bg-[var(--paper)] border-[var(--line)]/70 hover:border-[var(--ochre)]/60 hover:shadow-[var(--shadow-paper-hover)] hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3.5">
          <span className="text-2xl">{topic.icon}</span>
          <span className="text-[11px] font-serif text-[var(--ink-faint)] px-2 py-0.5 rounded border border-[var(--line)]/50 font-sans">
            {topic.articleCount} 篇
          </span>
        </div>
        <h4 className="font-serif font-medium text-base sm:text-lg text-[var(--ink)] group-hover:text-[var(--ochre)] transition-colors mb-2">
          {topic.name}
        </h4>
        <p className="text-xs sm:text-sm text-[var(--ink-soft)] leading-relaxed font-light line-clamp-2 font-serif">
          {topic.desc}
        </p>
      </div>

      <div className="mt-5 pt-3 border-t border-[var(--line)]/40 flex items-center justify-between text-xs text-[var(--ochre)] font-serif">
        <span>探索专题</span>
        <span className="group-hover:translate-x-1 transition-transform">→</span>
      </div>
    </div>
  );
}
