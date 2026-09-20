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
      className={`p-5 rounded-sm border transition-all duration-300 cursor-pointer flex flex-col justify-between ${
        isSelected
          ? 'bg-[var(--paper-deep)] border-[var(--ochre)] shadow-sm'
          : 'bg-[color-mix(in_srgb,var(--paper-deep)_60%,var(--paper))] border-[var(--line)] hover:border-[color-mix(in_srgb,var(--ochre)_40%,var(--line))] hover:-translate-y-0.5'
      }`}
    >
      <div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-2xl">{topic.icon}</span>
          <span className="text-xs font-serif text-[var(--ink-faint)] bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] px-2 py-0.5 rounded border border-[var(--line)]">
            {topic.articleCount} 篇
          </span>
        </div>
        <h4 className="font-serif font-medium text-base text-[var(--ink)] mb-1.5">{topic.name}</h4>
        <p className="text-xs text-[var(--ink-soft)] leading-relaxed font-light line-clamp-2">
          {topic.desc}
        </p>
      </div>

      <div className="mt-4 pt-2.5 border-t border-dashed border-[var(--line)] flex items-center justify-between text-xs text-[var(--ochre)] font-serif">
        <span>探索专题</span>
        <span>→</span>
      </div>
    </div>
  );
}
