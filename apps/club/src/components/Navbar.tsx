import { useState } from 'react';
import { PenTool, Search, Moon, Sun, ArrowLeft, X } from 'lucide-react';

interface NavbarProps {
  currentTab: 'plaza' | 'topics';
  onSelectTab: (tab: 'plaza' | 'topics') => void;
  onOpenWriter: () => void;
  resolveSubdomain: (url: string) => string;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export default function Navbar({
  currentTab,
  onSelectTab,
  onOpenWriter,
  resolveSubdomain,
  searchQuery,
  onSearchChange,
}: NavbarProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    <header className="sticky top-0 z-40 bg-[var(--paper)]/92 backdrop-blur-md border-b border-[var(--line)] transition-colors duration-500">
      <div className="max-w-[1080px] mx-auto px-6 h-16 flex items-center justify-between gap-4">
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
              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-serif transition-all cursor-pointer ${
                currentTab === 'plaza'
                  ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold shadow-2xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
              }`}
            >
              文友广场
            </button>
            <button
              onClick={() => onSelectTab('topics')}
              className={`px-3 py-1.5 rounded text-xs sm:text-sm font-serif transition-all cursor-pointer ${
                currentTab === 'topics'
                  ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold shadow-2xs'
                  : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
              }`}
            >
              专题分类
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Search */}
          {isSearchOpen ? (
            <div className="relative flex items-center">
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder="搜索标题、文友或金句..."
                className="w-36 sm:w-56 pl-3 pr-7 py-1 text-xs font-serif bg-[var(--paper-deep)] border border-[var(--ochre)] rounded text-[var(--ink)] focus:outline-none shadow-xs"
              />
              <button
                onClick={() => {
                  onSearchChange('');
                  setIsSearchOpen(false);
                }}
                className="absolute right-1.5 p-0.5 text-[var(--ink-faint)] hover:text-[var(--ink)] cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs font-serif rounded border border-transparent hover:border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] flex items-center gap-1.5 transition-colors cursor-pointer"
              title="搜索文稿"
            >
              <Search className="w-3.5 h-3.5 text-[var(--ink-faint)]" />
              <span className="hidden md:inline">搜索</span>
            </button>
          )}

          {/* Write Button */}
          <button
            onClick={onOpenWriter}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs sm:text-sm font-serif font-medium text-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_30%,var(--line))] rounded hover:bg-[color-mix(in_srgb,var(--ochre)_15%,transparent)] transition-all cursor-pointer active:scale-95 shadow-xs"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>即刻落笔</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] bg-[var(--paper-deep)] transition-all cursor-pointer"
            aria-label="切换明暗主题"
            title="切换明暗主题"
          >
            <Sun className="w-4 h-4 dark:hidden" />
            <Moon className="w-4 h-4 hidden dark:block" />
          </button>

          {/* Return to main site */}
          <a
            href={resolveSubdomain('https://newmaybe.com')}
            className="hidden lg:inline-flex items-center gap-1 text-xs font-serif text-[var(--ink-faint)] hover:text-[var(--ochre)] transition-colors no-underline ml-1"
          >
            <ArrowLeft className="w-3 h-3" />
            <span>主站</span>
          </a>
        </div>
      </div>
    </header>
  );
}
