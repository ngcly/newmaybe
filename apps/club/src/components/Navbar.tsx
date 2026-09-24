import { useRef, useState } from 'react';
import { PenTool, Search, Moon, Sun, ArrowLeft, X } from 'lucide-react';
import { syncBrowserTheme } from '@newmaybe/design-tokens/browser-theme';

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
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const closeSearch = () => {
    onSearchChange('');
    setIsSearchOpen(false);
    searchTrigger.current?.focus();
  };

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
    syncBrowserTheme(newTheme);
    const domainAttr = window.location.hostname.includes('newmaybe.com')
      ? '; domain=.newmaybe.com'
      : '';
    document.cookie = `theme=${newTheme}; path=/${domainAttr}; max-age=31536000; SameSite=Lax`;
  };

  return (
    <header className="sticky top-0 z-40 bg-[var(--paper)]/92 backdrop-blur-md border-b border-[var(--line)] transition-colors duration-500">
      <div className="max-w-[1080px] mx-auto px-4 sm:px-6 min-h-16 py-2 flex flex-wrap items-center justify-between gap-x-2 lg:gap-4 gap-y-2">
        {/* Logo & Brand */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('plaza');
          }}
          className="flex shrink-0 items-baseline gap-1.5 whitespace-nowrap no-underline group"
        >
          <span className="font-serif font-semibold text-xl tracking-tight text-[var(--ink)]">
            newmaybe
          </span>
          <span className="font-serif text-sm text-[var(--ochre)] italic">.club</span>
          <span className="hidden xl:inline-block ml-2 text-xs text-[var(--ink-faint)] border-l border-[var(--line)] pl-2 font-serif">
            文友雅集
          </span>
        </a>

        {/* Nav Tabs: a dedicated second row on phones prevents Chinese labels wrapping vertically. */}
        <nav
          aria-label="雅集导航"
          className="order-3 lg:order-none basis-full lg:basis-auto flex items-center justify-center gap-1 border-t border-[var(--line)] lg:border-0 pt-2 lg:pt-0"
        >
          <button
            onClick={() => onSelectTab('plaza')}
            aria-pressed={currentTab === 'plaza'}
            className={`min-h-11 flex-1 lg:flex-none whitespace-nowrap px-3 py-1.5 rounded text-sm font-serif transition-all cursor-pointer ${
              currentTab === 'plaza'
                ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold shadow-2xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
            }`}
          >
            文友广场
          </button>
          <button
            onClick={() => onSelectTab('topics')}
            aria-pressed={currentTab === 'topics'}
            className={`min-h-11 flex-1 lg:flex-none whitespace-nowrap px-3 py-1.5 rounded text-sm font-serif transition-all cursor-pointer ${
              currentTab === 'topics'
                ? 'text-[var(--ochre)] bg-[var(--paper-deep)] font-semibold shadow-2xs'
                : 'text-[var(--ink-soft)] hover:text-[var(--ink)] hover:bg-[var(--paper-deep)]/60'
            }`}
          >
            专题分类
          </button>
        </nav>

        {/* Right Actions */}
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {/* Quick Search */}
          <button
            ref={searchTrigger}
            onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
            aria-label="搜索文稿"
            aria-expanded={isSearchOpen}
            aria-controls="club-nav-search"
            className="min-w-11 min-h-11 justify-center px-2 text-xs font-serif rounded border border-transparent hover:border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] flex items-center gap-1.5 transition-colors cursor-pointer"
            title="搜索文稿"
          >
            <Search className="w-3.5 h-3.5 text-[var(--ink-faint)]" />
            <span className="hidden md:inline">搜索</span>
          </button>

          {/* Write Button */}
          <button
            onClick={onOpenWriter}
            className="min-w-11 min-h-11 flex justify-center items-center gap-1.5 p-2 sm:px-3 sm:py-1.5 text-xs sm:text-sm whitespace-nowrap font-serif font-medium text-[var(--ochre)] bg-[color-mix(in_srgb,var(--ochre)_8%,transparent)] border border-[color-mix(in_srgb,var(--ochre)_30%,var(--line))] rounded hover:bg-[color-mix(in_srgb,var(--ochre)_15%,transparent)] transition-all cursor-pointer active:scale-95 shadow-xs"
            aria-label="即刻落笔"
            title="即刻落笔"
          >
            <PenTool className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">即刻落笔</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="w-11 h-11 flex items-center justify-center rounded border border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ochre)] bg-[var(--paper-deep)] transition-all cursor-pointer"
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
        {isSearchOpen && (
          <div id="club-nav-search" className="order-4 basis-full flex items-center gap-2 pb-1">
            <input
              type="search"
              autoFocus
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape') closeSearch();
              }}
              aria-label="搜索标题、文友或金句"
              placeholder="搜索标题、文友或金句..."
              className="min-w-0 flex-1 min-h-11 px-3 text-base font-serif bg-[var(--paper-deep)] border border-[var(--ochre)] rounded text-[var(--ink)] shadow-xs"
            />
            <button
              onClick={closeSearch}
              aria-label="关闭搜索"
              className="w-11 h-11 shrink-0 flex items-center justify-center text-[var(--ink-soft)] hover:text-[var(--ink)] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
