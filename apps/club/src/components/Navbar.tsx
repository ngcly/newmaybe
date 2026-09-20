interface NavbarProps {
  currentTab: 'plaza' | 'topics';
  onSelectTab: (tab: 'plaza' | 'topics') => void;
  onOpenWriter: () => void;
  resolveSubdomain: (url: string) => string;
}

export default function Navbar({
  currentTab,
  onSelectTab,
  onOpenWriter,
  resolveSubdomain,
}: NavbarProps) {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains('dark');
    const newTheme = isDark ? 'light' : 'dark';
    if (isDark) {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    const domainAttr = window.location.hostname.includes('newmaybe.com')
      ? '; domain=.newmaybe.com'
      : '';
    document.cookie = `theme=${newTheme}; path=/${domainAttr}; max-age=31536000; SameSite=Lax`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/90 backdrop-blur-md border-b border-[var(--line)] transition-colors duration-500">
      <div className="max-w-[1080px] mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo & Brand */}
        <div className="flex items-center gap-6">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              onSelectTab('plaza');
            }}
            className="flex items-baseline gap-1.5 no-underline group"
          >
            <span className="font-serif font-semibold text-xl tracking-tight text-[var(--ink)]">
              newmaybe
            </span>
            <span className="font-serif text-sm text-[var(--ochre)] italic">.club</span>
            <span className="hidden sm:inline-block ml-2 text-xs text-[var(--ink-faint)] border-l border-[var(--line)] pl-2 font-serif">
              文友雅集
            </span>
          </a>

          {/* Nav Tabs */}
          <nav className="flex items-center gap-1">
            <button
              onClick={() => onSelectTab('plaza')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'plaza'
                  ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
              }`}
            >
              广场
            </button>
            <button
              onClick={() => onSelectTab('topics')}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-all cursor-pointer ${
                currentTab === 'topics'
                  ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
              }`}
            >
              专题文集
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          {/* Write Button */}
          <button
            onClick={onOpenWriter}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-sm font-medium text-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_30%,var(--line))] rounded hover:bg-[color-mix(in_srgb,var(--ochre)_15%,transparent)] transition-all cursor-pointer active:scale-95"
          >
            <span>✍️</span>
            <span>即刻落笔</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] bg-[var(--paper-deep)] transition-all cursor-pointer"
            aria-label="切换主题模式"
            title="切换明暗主题"
          >
            <span className="text-xs">🌓</span>
          </button>

          {/* Return to main site */}
          <a
            href={resolveSubdomain('https://newmaybe.com')}
            className="hidden md:inline-flex items-center text-xs text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline ml-1"
          >
            ← 主站
          </a>
        </div>
      </div>
    </header>
  );
}
