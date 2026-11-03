import { ArrowUpRight } from 'lucide-react';
import type { Topic } from '../types';

const topicMarks: Record<string, string> = {
  'deep-night': '夜',
  'slow-living': '读',
  'years-splendid': '年',
  'walking-verse': '行',
  'urban-notes': '城',
};

interface TopicCardProps {
  topic: Topic;
  isSelected?: boolean;
  onSelect: (topicId: string) => void;
}

export default function TopicCard({ topic, isSelected, onSelect }: TopicCardProps) {
  return (
    <button
      type="button"
      onClick={() => onSelect(topic.id)}
      aria-pressed={isSelected}
      className="club-topic-card"
    >
      <div className="club-topic-card-top">
        <span className="club-topic-mark" aria-hidden="true">
          {topicMarks[topic.id] || '文'}
        </span>
        <span>{topic.articleCount} 篇文字</span>
      </div>
      <h2>{topic.name}</h2>
      <p>{topic.desc}</p>
      <div className="club-topic-card-footer">
        <span>探索专题</span>
        <ArrowUpRight aria-hidden="true" />
      </div>
    </button>
  );
}
