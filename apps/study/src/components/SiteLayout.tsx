import { Link, NavLink, Outlet } from 'react-router';
import { totalReadCount, streakDays } from '@/lib/store';
import { getTheme, toggleTheme, type Theme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import { BookOpen, Map, PenLine, Wrench, Library, Home, Moon, Sun } from 'lucide-react';

const NAV = [
  { to: '/', label: '首页', icon: Home },
  { to: '/books', label: '书目', icon: Library },
  { to: '/path', label: '进阶路径', icon: Map },
  { to: '/practice', label: '修炼场', icon: PenLine },
  { to: '/tools', label: '工具箱', icon: Wrench },
];

export default function SiteLayout() {
  const [read, setRead] = useState(0);
  const [streak, setStreak] = useState(0);
  const [theme, setTheme] = useState<Theme>(getTheme());
  useEffect(() => {
    const f = () => {
      setRead(totalReadCount());
      setStreak(streakDays());
    };
    f();
    window.addEventListener('linxia:update', f);
    return () => window.removeEventListener('linxia:update', f);
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b bg-paper/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0">
            <span className="seal w-8 h-8 text-lg leading-none">林</span>
            <span className="font-brush text-xl tracking-wide">林下书房</span>
            <span className="hidden md:inline text-xs text-muted-foreground mt-1">
              为古风写作而读
            </span>
          </Link>
          <nav className="ml-auto flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-2.5 md:px-3 py-1.5 rounded-md text-sm transition-colors ${
                    isActive
                      ? 'text-cinnabar font-semibold bg-cinnabar/5'
                      : 'text-foreground/70 hover:text-cinnabar'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
          <button
            onClick={() => setTheme(toggleTheme())}
            className="ml-1 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm text-foreground/70 hover:text-cinnabar transition-colors"
            aria-label={theme === 'dark' ? '切换日读' : '切换夜读'}
            title={theme === 'dark' ? '切换日读' : '切换夜读（玄青）'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            <span className="hidden sm:inline">{theme === 'dark' ? '日读' : '夜读'}</span>
          </button>
          <div className="hidden lg:flex items-center gap-2 text-xs text-muted-foreground border-l pl-3">
            <BookOpen className="w-3.5 h-3.5" />
            <span>已读 {read} 章</span>
            <span className="text-cinnabar">连续 {streak} 天</span>
          </div>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t mt-16">
        <div className="mx-auto max-w-6xl px-4 py-8 text-center text-xs text-muted-foreground leading-6">
          <p className="font-brush text-base text-foreground/70">操千曲而后晓声，观千剑而后识器</p>
          <p className="mt-2">
            林下书房 · 以古人之规矩，开自己之生面 | 收录古籍四十三部，全文四千余章
          </p>
          <p className="mt-1">文本均为公版古籍，采自开源语料，仅供学习使用</p>
        </div>
      </footer>
    </div>
  );
}
