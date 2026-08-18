import { Link, NavLink, Outlet, useLocation } from 'react-router';
import { totalReadCount, streakDays } from '@/lib/store';
import { getTheme, toggleTheme, type Theme } from '@/lib/theme';
import { useEffect, useState } from 'react';
import {
  BookOpen,
  Map,
  PenLine,
  Wrench,
  Library,
  Home,
  Moon,
  Sun,
  Menu,
  X,
  Compass,
} from 'lucide-react';

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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const f = () => {
      setRead(totalReadCount());
      setStreak(streakDays());
    };
    f();
    window.addEventListener('linxia:update', f);
    return () => window.removeEventListener('linxia:update', f);
  }, []);

  // 路由跳转时自动关闭移动端菜单
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground selection:bg-cinnabar/20 selection:text-cinnabar">
      <header className="sticky top-0 z-40 border-b bg-paper/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group">
            <span className="seal w-8 h-8 text-lg leading-none group-hover:scale-105 transition-transform">
              书
            </span>
            <div className="flex flex-col">
              <span className="font-brush text-xl tracking-wide leading-tight group-hover:text-cinnabar transition-colors">
                林下书房
              </span>
              <span className="text-[10px] text-muted-foreground scale-90 origin-left hidden sm:inline -mt-0.5">
                为古风写作而读
              </span>
            </div>
          </Link>

          {/* 桌面端导航 */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                    isActive
                      ? 'text-cinnabar font-semibold bg-cinnabar/10 shadow-xs'
                      : 'text-foreground/75 hover:text-cinnabar hover:bg-surface'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* 右侧功能区 */}
          <div className="flex items-center gap-2">
            {/* 日/夜读模式切换 */}
            <button
              onClick={() => setTheme(toggleTheme())}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs text-foreground/75 hover:text-cinnabar hover:bg-surface border border-transparent hover:border-border transition-colors"
              aria-label={theme === 'dark' ? '切换日读' : '切换夜读'}
              title={theme === 'dark' ? '切换日读（素白米纸）' : '切换夜读（玄青深墨）'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-dai" />
              )}
              <span className="hidden sm:inline">{theme === 'dark' ? '日读' : '夜读'}</span>
            </button>

            {/* 累计打卡统计 */}
            <div className="hidden lg:flex items-center gap-2.5 text-xs text-muted-foreground border-l pl-3 py-1">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                已读 <strong className="text-foreground">{read}</strong> 章
              </span>
              <span className="text-cinnabar font-medium">连续 {streak} 天</span>
            </div>

            {/* 移动端汉堡按钮 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-md text-foreground/80 hover:text-cinnabar hover:bg-surface transition-colors"
              aria-label={mobileMenuOpen ? '关闭菜单' : '打开菜单'}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 移动端抽屉式下拉菜单 */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b bg-surface/98 backdrop-blur p-4 space-y-3 shadow-lg animate-in slide-in-from-top duration-200">
            <div className="flex items-center justify-between pb-2 border-b text-xs text-muted-foreground">
              <span>阅读进度</span>
              <div className="flex items-center gap-3">
                <span>
                  已读 <strong className="text-cinnabar">{read}</strong> 章
                </span>
                <span className="text-cinnabar font-medium">连续 {streak} 天</span>
              </div>
            </div>

            <nav className="grid grid-cols-2 gap-2">
              {NAV.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
                      isActive
                        ? 'text-cinnabar font-semibold bg-cinnabar/10'
                        : 'text-foreground/80 hover:text-cinnabar hover:bg-paper'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </nav>

            <div className="pt-2 border-t flex items-center justify-between text-xs text-muted-foreground">
              <a
                href="https://newmaybe.com"
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-cinnabar transition-colors"
              >
                <Compass className="w-3.5 h-3.5" />
                <span>返回 newmaybe 数字花园</span>
              </a>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t mt-16 bg-paper/50">
        <div className="mx-auto max-w-6xl px-4 py-10 text-center text-xs text-muted-foreground leading-6 space-y-2">
          <p className="font-brush text-lg text-foreground/80 tracking-wide">
            操千曲而后晓声，观千剑而后识器
          </p>
          <p className="text-muted-foreground">
            林下书房 · 以古人之规矩，开自己之生面 · 收录古籍四十三部，全文四千余章
          </p>
          <div className="flex items-center justify-center gap-4 text-[11px] pt-1">
            <a
              href="https://newmaybe.com"
              target="_blank"
              rel="noreferrer"
              className="hover:text-cinnabar transition-colors"
            >
              newmaybe 主站
            </a>
            <span>·</span>
            <Link to="/books" className="hover:text-cinnabar transition-colors">
              书目索引
            </Link>
            <span>·</span>
            <Link to="/path" className="hover:text-cinnabar transition-colors">
              进阶路径
            </Link>
            <span>·</span>
            <Link to="/practice" className="hover:text-cinnabar transition-colors">
              仿写修炼
            </Link>
            <span>·</span>
            <Link to="/tools" className="hover:text-cinnabar transition-colors">
              格律工具箱
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
