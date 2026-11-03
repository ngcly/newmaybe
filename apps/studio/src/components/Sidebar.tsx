import type { Tab } from '../types';

interface SidebarProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  resolveSubdomain: (url: string) => string;
}

export default function Sidebar({ activeTab, onTabChange, resolveSubdomain }: SidebarProps) {
  return (
    <aside className="studio-sidebar w-full md:w-72 bg-[var(--paper-deep)] border-b md:border-b-0 md:border-r border-[var(--line)] flex flex-col p-6 shrink-0 transition-colors duration-500">
      <div className="mb-3 md:mb-8">
        <a href="/" className="nm-brand nm-brand--stacked">
          <span className="nm-brand-seal" aria-hidden="true">
            坊
          </span>
          <span className="nm-brand-text">
            <span className="nm-brand-word">
              newmaybe<span className="nm-brand-dot">.</span>
              <span className="nm-brand-sub">studio</span>
            </span>
            <span className="nm-brand-name">创作工坊</span>
          </span>
        </a>
      </div>

      <label className="md:hidden text-sm flex items-center gap-3">
        <span>创作工具</span>
        <select
          aria-label="创作工具"
          value={activeTab}
          onChange={(event) => onTabChange(event.target.value as Tab)}
          className="min-w-0 flex-1 border border-[var(--line)] bg-[var(--paper)] p-2 rounded"
        >
          <option value="poster">封面海报</option>
          <option value="card">念头与拾遗卡片</option>
          <option value="formatter">文字排版</option>
          <option value="inspiration">写作命题</option>
          <option value="assets">素材画廊</option>
        </select>
      </label>
      <nav className="hidden md:flex flex-col gap-5 flex-grow">
        <div>
          <span className="text-xs tracking-[0.2em] text-[var(--ink-faint)] block mb-1.5 px-2">
            排版与卡片
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
                className={`text-left px-3.5 py-2.5 rounded-[var(--corner-sm)] text-sm font-medium transition-all cursor-pointer ${
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
          <span className="text-xs tracking-[0.2em] text-[var(--ink-faint)] block mb-1.5 px-2">
            灵感与素材
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
                className={`text-left px-3.5 py-2.5 rounded-[var(--corner-sm)] text-sm font-medium transition-all cursor-pointer ${
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
