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
          newmaybe<span className="text-[var(--ochre)] font-serif">.studio</span>
        </a>
        <p className="text-xs text-[var(--ink-faint)] mt-2">创作层 · 排版工具与灵感工坊</p>
      </div>

      <nav className="flex flex-col gap-5 flex-grow">
        <div>
          <span className="text-[10px] uppercase font-serif tracking-wider text-[var(--ink-faint)] block mb-1.5 px-2">
            排版与卡片 · Formatting
          </span>
          <div className="flex flex-col gap-1">
            {(
              [
                ['poster', '新可能排版封面海报'],
                ['card', '念头/拾遗卡片生成器'],
                ['formatter', '中英文混排优化'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`text-left px-3.5 py-2.5 rounded text-sm font-medium transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <span className="text-[10px] uppercase font-serif tracking-wider text-[var(--ink-faint)] block mb-1.5 px-2">
            灵感与素材 · Inspiration
          </span>
          <div className="flex flex-col gap-1">
            {(
              [
                ['inspiration', '灵感写作命题库'],
                ['assets', '共享素材资产画廊'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                onClick={() => onTabChange(key)}
                className={`text-left px-3.5 py-2.5 rounded text-sm font-medium transition-all cursor-pointer ${
                  activeTab === key
                    ? 'bg-[var(--paper)] text-[var(--ochre)] border border-[var(--line)] shadow-sm'
                    : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper)]/50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
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
