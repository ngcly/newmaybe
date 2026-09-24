import { syncBrowserTheme } from '@newmaybe/design-tokens/browser-theme';

let pageController: AbortController | undefined;
let revealObserver: IntersectionObserver | undefined;

function cleanupPage() {
  pageController?.abort();
  revealObserver?.disconnect();
  document.body.style.overflow = '';
}

export function setupPage() {
  cleanupPage();
  pageController = new AbortController();
  const { signal } = pageController;
  // 汉堡菜单
  const menuBtn = document.querySelector('.menu-btn') as HTMLButtonElement | null;
  const mobileMenu = document.getElementById('mobileMenu');
  const close = () => {
    menuBtn?.classList.remove('open');
    mobileMenu?.classList.remove('open');
    menuBtn?.setAttribute('aria-expanded', 'false');
    mobileMenu?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };
  menuBtn?.addEventListener(
    'click',
    () => {
      const open = menuBtn.classList.toggle('open');
      mobileMenu?.classList.toggle('open', open);
      menuBtn.setAttribute('aria-expanded', String(open));
      mobileMenu?.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    },
    { signal },
  );
  mobileMenu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', close, { signal }));
  document.getElementById('mobileOverlay')?.addEventListener('click', close, { signal });

  // Keydown 监听器清理与绑定
  if (document._handleEscape) {
    document.removeEventListener('keydown', document._handleEscape);
  }
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') close();
  };
  document.addEventListener('keydown', handleEscape, { signal });
  document._handleEscape = handleEscape;

  // 导航栏滚动细线清理与绑定
  const hdr = document.getElementById('hdr');
  if (window._onScroll) {
    window.removeEventListener('scroll', window._onScroll);
  }
  const onScroll = () => hdr?.classList.toggle('scrolled', window.scrollY > 20);
  window.addEventListener('scroll', onScroll, { passive: true, signal });
  window._onScroll = onScroll;
  onScroll();

  // 清理诗歌沉浸式滚动监听器，仅在非诗歌页面上执行（诗歌页由 is:inline 脚本重建）
  if (window._onScrollPoetry && !document.querySelector('.poem-wrap')) {
    window.removeEventListener('scroll', window._onScrollPoetry);
    delete window._onScrollPoetry;
    if (hdr) {
      hdr.style.transform = '';
      hdr.style.opacity = '';
      hdr.style.transition = '';
    }
  }

  // 清理诗歌版式点击监听器，仅在非诗歌页面上执行
  if (window._handleLayoutClick && !document.querySelector('.poem-wrap')) {
    document.removeEventListener('click', window._handleLayoutClick);
    delete window._handleLayoutClick;
  }

  // 滚动进场
  if (window._revealObserver) {
    window._revealObserver.disconnect();
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.15 },
  );
  document.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  window._revealObserver = io;
  revealObserver = io;

  // 生态下拉菜单
  const ecoTrigger = document.getElementById('ecoNavTrigger');
  const ecoDropdown = document.getElementById('ecoDropdown');
  const toggleEco = (show?: boolean) => {
    const isOpen = show !== undefined ? show : !ecoDropdown?.classList.contains('open');
    ecoDropdown?.classList.toggle('open', isOpen);
    ecoTrigger?.setAttribute('aria-expanded', String(isOpen));
    ecoDropdown?.setAttribute('aria-hidden', String(!isOpen));
    if (ecoDropdown) ecoDropdown.inert = !isOpen;
  };
  ecoTrigger?.addEventListener(
    'click',
    (e) => {
      e.stopPropagation();
      toggleEco();
    },
    { signal },
  );
  document.addEventListener(
    'click',
    (e) => {
      if (!ecoDropdown?.contains(e.target as Node) && e.target !== ecoTrigger) {
        toggleEco(false);
      }
    },
    { signal },
  );

  // 暗色模式手动切换
  const themeToggle = document.getElementById('themeToggle');
  if (themeToggle) {
    themeToggle.addEventListener(
      'click',
      () => {
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
        // Cookie is the authoritative store — no localStorage write needed.
        const domainAttr = window.location.hostname.includes('newmaybe.com')
          ? '; domain=.newmaybe.com'
          : '';
        document.cookie = `theme=${newTheme}; path=/${domainAttr}; max-age=31536000; SameSite=Lax`;
      },
      { signal },
    );
  }
}

// 初次加载与视图切换后重新绑定
document.addEventListener('astro:page-load', setupPage);

document.addEventListener('astro:before-swap', cleanupPage);
