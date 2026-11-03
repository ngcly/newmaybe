import { useEffect, useRef, useState } from 'react';
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
  // The field keeps its own text so pinyin composition is never filtered mid-word.
  const [draft, setDraft] = useState(searchQuery);
  const [syncedQuery, setSyncedQuery] = useState(searchQuery);
  if (syncedQuery !== searchQuery) {
    setSyncedQuery(searchQuery);
    setDraft(searchQuery);
  }
  const searchTrigger = useRef<HTMLButtonElement>(null);
  const header = useRef<HTMLElement>(null);
  // Sticky page parts (the home sidebar) sit below the header, whose height changes with search.
  useEffect(() => {
    const element = header.current;
    if (!element) return;
    const observer = new ResizeObserver(() =>
      document.documentElement.style.setProperty('--club-nav-h', `${element.offsetHeight}px`),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  // Pressing a close control ends an IME composition before the click lands; that pinyin must
  // not become a query on its way out.
  const closing = useRef(false);
  const closeSearch = () => {
    closing.current = false;
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
    <header className="club-nav" ref={header}>
      <div className="club-nav-inner">
        <a
          href="/"
          className="club-brand nm-brand"
          onClick={(event) => {
            if (
              event.metaKey ||
              event.ctrlKey ||
              event.shiftKey ||
              event.altKey ||
              event.button !== 0
            )
              return;
            event.preventDefault();
            onSelectTab('plaza');
          }}
        >
          <span className="nm-brand-seal" aria-hidden="true">
            雅
          </span>
          <span className="nm-brand-text">
            <span className="nm-brand-word">
              newmaybe<span className="nm-brand-dot">.</span>
              <span className="nm-brand-sub">club</span>
            </span>
            <span className="nm-brand-name">文友雅集</span>
          </span>
        </a>
        <nav aria-label="雅集导航" className="club-primary-nav">
          <button onClick={() => onSelectTab('plaza')} aria-pressed={currentTab === 'plaza'}>
            文友广场
          </button>
          <button onClick={() => onSelectTab('topics')} aria-pressed={currentTab === 'topics'}>
            专题分类
          </button>
          <a href="/featured">
            一期一文
            <span aria-hidden="true" className="club-nav-dot" />
          </a>
        </nav>
        <div className="club-nav-actions">
          <button
            ref={searchTrigger}
            onPointerDown={() => {
              closing.current = isSearchOpen;
            }}
            onClick={() => (isSearchOpen ? closeSearch() : setIsSearchOpen(true))}
            aria-label="搜索文稿"
            aria-expanded={isSearchOpen}
            aria-controls="club-nav-search"
            className="club-icon-button"
            title="搜索文稿"
          >
            <Search aria-hidden="true" />
          </button>
          <a href="/me" className="club-my-drafts">
            我的文稿
          </a>
          <button
            onClick={onOpenWriter}
            className="club-write-button"
            aria-label="即刻落笔"
            title="即刻落笔"
          >
            <PenTool aria-hidden="true" />
            <span>即刻落笔</span>
          </button>
          <button
            onClick={toggleTheme}
            className="club-icon-button club-theme-button"
            aria-label="切换明暗主题"
            title="切换明暗主题"
          >
            <Sun aria-hidden="true" className="dark:hidden" />
            <Moon aria-hidden="true" className="hidden dark:block" />
          </button>
          <a href={resolveSubdomain('https://newmaybe.com')} className="club-home-link">
            <ArrowLeft aria-hidden="true" />
            主站
          </a>
        </div>
        {isSearchOpen && (
          <div id="club-nav-search" className="club-nav-search" role="search">
            <Search aria-hidden="true" />
            <input
              type="search"
              autoFocus
              value={draft}
              onChange={(event) => {
                setDraft(event.target.value);
                if (!(event.nativeEvent as InputEvent).isComposing)
                  onSearchChange(event.target.value);
              }}
              onFocus={() => {
                closing.current = false;
              }}
              onCompositionEnd={(event) => {
                if (!closing.current) onSearchChange(event.currentTarget.value);
              }}
              onKeyDown={(event) => {
                // The first Escape while composing belongs to the IME.
                // The Escape that cancels a composition belongs to the IME (Safari reports 229).
                if (
                  event.key === 'Escape' &&
                  !event.nativeEvent.isComposing &&
                  event.nativeEvent.keyCode !== 229
                )
                  closeSearch();
              }}
              aria-label="搜索标题、文友或金句"
              placeholder="搜索标题、文友或金句..."
            />
            <span className="club-search-hint">ESC 退出</span>
            <button
              onPointerDown={() => {
                closing.current = true;
              }}
              onClick={closeSearch}
              aria-label="关闭搜索"
              className="club-icon-button"
            >
              <X aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
