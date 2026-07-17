import type { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  resolveSubdomain: (url: string) => string;
}

export default function Sidebar({ activeTab, onTabChange, resolveSubdomain }: SidebarProps) {
  return (
    <aside className="w-full md:w-72 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500">
      <div className="mb-8">
        <a
          href={resolveSubdomain('https://newmaybe.com')}
          className="text-xl font-semibold tracking-wide flex items-baseline gap-1 text-[var(--ink)] no-underline"
        >
          newmaybe<span className="text-[var(--ochre)] font-serif">.</span>
        </a>
        <p className="text-xs text-[var(--ink-faint)] mt-2">使用心智 · 思考加工厂</p>
      </div>

      <nav className="flex flex-row md:flex-col gap-2 flex-grow">
        <button
          onClick={() => onTabChange('formatter')}
          className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
            activeTab === 'formatter'
              ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
          }`}
        >
          中英文混排排版优化
        </button>
        <button
          onClick={() => onTabChange('exporter')}
          className={`flex-grow md:flex-grow-0 text-left px-4 py-3 rounded text-sm font-medium transition-all ${
            activeTab === 'exporter'
              ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
          }`}
        >
          念头/拾遗卡片生成器
        </button>
      </nav>

      <div className="mt-8 pt-4 border-t border-[var(--line)] hidden md:block">
        <a
          href={resolveSubdomain('https://newmaybe.com')}
          className="text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline"
        >
          ← 返回主展厅 newmaybe.com
        </a>
      </div>
    </aside>
  );
}
