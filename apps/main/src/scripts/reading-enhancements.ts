export function setupReadingBar() {
  if (window._onScrollReadingBar) {
    window.removeEventListener('scroll', window._onScrollReadingBar);
    delete window._onScrollReadingBar;
  }

  const bar = document.getElementById('reading-bar');
  if (!bar) return;

  let rafPending = false;
  const update = () => {
    if (rafPending) return;
    rafPending = true;
    requestAnimationFrame(() => {
      rafPending = false;
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = total > 0 ? `${(scrolled / total) * 100}%` : '0%';
    });
  };

  window.addEventListener('scroll', update, { passive: true });
  window._onScrollReadingBar = update;
  update();
}

export function setupTocSpy() {
  if (window._onScrollToc) {
    window.removeEventListener('scroll', window._onScrollToc);
    delete window._onScrollToc;
  }

  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  if (tocLinks.length === 0) return;

  const headings = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.editorial-content .prose h2[id], .editorial-content .prose h3[id]',
    ),
  );
  if (headings.length === 0) return;

  const linkMap = new Map<string, Element[]>();
  tocLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const rawId = href.slice(1);
      const decodedId = decodeURIComponent(rawId);
      if (!linkMap.has(decodedId)) linkMap.set(decodedId, []);
      linkMap.get(decodedId)!.push(link);
      if (rawId !== decodedId) {
        if (!linkMap.has(rawId)) linkMap.set(rawId, []);
        linkMap.get(rawId)!.push(link);
      }
    }
  });

  const setActive = (activeId: string | null) => {
    tocLinks.forEach((link) => link.classList.remove('active'));
    if (activeId && linkMap.has(activeId)) {
      linkMap.get(activeId)!.forEach((link) => link.classList.add('active'));
    }
  };

  let ticking = false;
  const updateActiveHeading = () => {
    if (window.scrollY < 120) {
      setActive(null);
      return;
    }
    let currentId: string | null = null;
    for (const h of headings) {
      const rect = h.getBoundingClientRect();
      if (rect.top <= 150) {
        currentId = h.id;
      } else {
        break;
      }
    }
    setActive(currentId);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveHeading();
        ticking = false;
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window._onScrollToc = onScroll;
  updateActiveHeading();

  document.querySelectorAll('.toc-mobile .toc-link').forEach((link) => {
    link.addEventListener('click', () => {
      const details = link.closest('.toc-mobile');
      if (details) details.removeAttribute('open');
    });
  });
}

export function setupReadingBookmark() {
  if (window._onScrollReadingBookmark) {
    window.removeEventListener('scroll', window._onScrollReadingBookmark);
    delete window._onScrollReadingBookmark;
  }

  const toast = document.getElementById('resume-toast');
  if (!toast) return;

  const postId = toast.dataset.postId;
  if (!postId) return;

  const pctSpan = document.getElementById('resume-pct');
  const resumeBtn = document.getElementById('resumeBtn');
  const closeBtn = document.getElementById('resumeClose');

  const STORAGE_KEY = `newmaybe:read-pos:${postId}`;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      if (saved && saved.pct >= 15 && saved.pct <= 90 && window.scrollY < 120) {
        if (pctSpan) pctSpan.textContent = `${saved.pct}%`;
        toast.classList.add('is-visible');

        const dismissToast = () => {
          toast.classList.remove('is-visible');
        };

        if (resumeBtn) {
          resumeBtn.onclick = () => {
            window.scrollTo({ top: saved.y, behavior: 'smooth' });
            dismissToast();
          };
        }

        if (closeBtn) {
          closeBtn.onclick = () => {
            dismissToast();
          };
        }

        const autoDismissCheck = () => {
          if (window.scrollY > 350) {
            dismissToast();
            window.removeEventListener('scroll', autoDismissCheck);
          }
        };
        window.addEventListener('scroll', autoDismissCheck, { passive: true });
      }
    }
  } catch {
    /* ignore */
  }

  let ticking = false;
  const recordProgress = () => {
    const total = document.documentElement.scrollHeight - window.innerHeight;
    if (total <= 0) return;
    const pct = Math.round((window.scrollY / total) * 100);

    try {
      if (pct > 92) {
        localStorage.removeItem(STORAGE_KEY);
      } else if (pct >= 15) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ y: window.scrollY, pct }));
      }
    } catch {
      /* ignore */
    }
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        recordProgress();
        ticking = false;
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window._onScrollReadingBookmark = onScroll;
}

export function setupFontScaler() {
  const STORAGE_KEY = 'newmaybe:font-scale';
  type Level = 'sm' | 'base' | 'lg';

  const getScale = (): Level => {
    try {
      const val = localStorage.getItem(STORAGE_KEY);
      if (val === 'sm' || val === 'lg') return val;
    } catch {
      /* ignore */
    }
    return 'base';
  };

  const applyScale = (level: Level) => {
    document.querySelectorAll('.prose').forEach((el) => {
      el.classList.remove('font-size-sm', 'font-size-lg');
      if (level === 'sm') el.classList.add('font-size-sm');
      if (level === 'lg') el.classList.add('font-size-lg');
    });
  };

  const setScale = (level: Level) => {
    try {
      localStorage.setItem(STORAGE_KEY, level);
    } catch {
      /* ignore */
    }
    applyScale(level);
  };

  applyScale(getScale());

  if (window._handleFontScaleClick) {
    document.removeEventListener('click', window._handleFontScaleClick);
  }

  const handleFontScaleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const downBtn = target.closest('.font-scale-down');
    const upBtn = target.closest('.font-scale-up');
    if (downBtn) {
      const cur = getScale();
      if (cur === 'lg') setScale('base');
      else if (cur === 'base') setScale('sm');
    } else if (upBtn) {
      const cur = getScale();
      if (cur === 'sm') setScale('base');
      else if (cur === 'base') setScale('lg');
    }
  };

  document.addEventListener('click', handleFontScaleClick);
  window._handleFontScaleClick = handleFontScaleClick;
}

export function setupPoetryLayout() {
  const poemWrap = document.querySelector<HTMLElement>('.poem-wrap');
  const toggle = document.getElementById('layoutToggle');

  // 如果不是诗歌页面，清理诗歌专属的滚动和点击监听器
  if (!poemWrap) {
    if (window._onScrollPoetry) {
      window.removeEventListener('scroll', window._onScrollPoetry);
      delete window._onScrollPoetry;
      const hdr = document.getElementById('hdr');
      if (hdr) {
        hdr.style.transform = '';
        hdr.style.opacity = '';
        hdr.style.transition = '';
      }
    }
    if (window._handleLayoutClick) {
      document.removeEventListener('click', window._handleLayoutClick);
      delete window._handleLayoutClick;
    }
    return;
  }

  const LAYOUT_KEY = 'poetry-layout';

  // 1. 沉浸式滚动监听器：向上滚动露出导航，向下滚动自动隐藏
  let lastScrollY = window.scrollY;
  const hdr = document.getElementById('hdr');
  if (hdr) {
    if (window._onScrollPoetry) {
      window.removeEventListener('scroll', window._onScrollPoetry);
    }
    const onScrollPoetry = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > 100 && currentScrollY > lastScrollY) {
        hdr.style.transform = 'translateY(-100%)';
        hdr.style.opacity = '0';
        hdr.style.transition = 'transform 0.4s ease, opacity 0.4s ease';
      } else {
        hdr.style.transform = 'translateY(0)';
        hdr.style.opacity = '1';
      }
      lastScrollY = currentScrollY;
    };
    window.addEventListener('scroll', onScrollPoetry, { passive: true });
    window._onScrollPoetry = onScrollPoetry;
  }

  // 2. 应用排版：
  // isHorizontal: true  -> 横向长卷模式（红格左右横滑，高亮「横」）
  // isHorizontal: false -> 常规纵向滚动模式（现代居中段落，高亮「竖」）
  const applyLayout = (isHorizontal: boolean) => {
    poemWrap.classList.toggle('is-horizontal', isHorizontal);
    if (toggle) {
      toggle.classList.toggle('is-vertical', !isHorizontal);
      toggle.setAttribute(
        'aria-label',
        isHorizontal ? '切换诗歌版式（当前：横向长卷）' : '切换诗歌版式（当前：纵向滚动）',
      );
    }

    const watermark = poemWrap.querySelector<HTMLElement>('.watermark');
    const hint = document.getElementById('poetryScrollHint');
    const prose = poemWrap.querySelector<HTMLElement>('.prose');

    // 清理上一次的事件监听，防止 View Transitions 页面载入时泄漏与重复绑定
    const wrapWithHandlers = poemWrap as HTMLElement & {
      _onProseScroll?: () => void;
      _onProseWheel?: (e: WheelEvent) => void;
      _onScrollPoetryHint?: () => void;
    };

    if (wrapWithHandlers._onProseScroll) {
      poemWrap.removeEventListener('scroll', wrapWithHandlers._onProseScroll);
      wrapWithHandlers._onProseScroll = undefined;
    }
    if (wrapWithHandlers._onProseWheel) {
      poemWrap.removeEventListener('wheel', wrapWithHandlers._onProseWheel);
      wrapWithHandlers._onProseWheel = undefined;
    }
    if (wrapWithHandlers._onScrollPoetryHint) {
      poemWrap.removeEventListener('scrollend', wrapWithHandlers._onScrollPoetryHint);
      wrapWithHandlers._onScrollPoetryHint = undefined;
    }

    if (isHorizontal && prose) {
      const onProseScroll = () => {
        if (watermark) {
          // 水印视差滚动平移（监听外层滚动容器 poemWrap 的 scrollLeft）
          watermark.style.transform = `translate(calc(-50% - ${poemWrap.scrollLeft * 0.25}px), -50%)`;
        }
      };
      poemWrap.addEventListener('scroll', onProseScroll, { passive: true });
      wrapWithHandlers._onProseScroll = onProseScroll;
      onProseScroll(); // 初始化对齐

      // 解决桌面端鼠标滚轮无法横向滚动的问题
      const onProseWheel = (e: WheelEvent) => {
        if (e.deltaY !== 0) {
          poemWrap.scrollLeft -= e.deltaY;
          e.preventDefault();
        }
      };
      poemWrap.addEventListener('wheel', onProseWheel, { passive: false });
      wrapWithHandlers._onProseWheel = onProseWheel;

      if (hint) {
        hint.style.opacity = '';
        hint.style.pointerEvents = '';
        const handleScrollEnd = () => {
          hint.style.opacity = '0';
          hint.style.pointerEvents = 'none';
          poemWrap.removeEventListener('scrollend', handleScrollEnd);
        };
        poemWrap.addEventListener('scrollend', handleScrollEnd);
        wrapWithHandlers._onScrollPoetryHint = handleScrollEnd;
      }
    } else {
      poemWrap.scrollLeft = 0;
      if (watermark) watermark.style.transform = '';
      if (hint) {
        hint.style.opacity = '0';
        hint.style.pointerEvents = 'none';
      }
    }
  };

  // 读取已保存的排版偏好：默认是横向长卷 (horizontal)
  let savedLayout = 'horizontal';
  try {
    savedLayout = localStorage.getItem(LAYOUT_KEY) || 'horizontal';
  } catch {
    /* ignore */
  }
  const initialHorizontal = savedLayout !== 'vertical';
  applyLayout(initialHorizontal);

  // 3. 布局切换按钮点击事件
  if (window._handleLayoutClick) {
    document.removeEventListener('click', window._handleLayoutClick);
  }

  const handleLayoutClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement | null;
    if (!target) return;
    const btn = target.closest('#layoutToggle');
    if (!btn) return;

    const currentHorizontal = poemWrap.classList.contains('is-horizontal');
    const optHoriz = target.closest('.opt-horiz');
    const optVert = target.closest('.opt-vert');

    let nextHorizontal: boolean;
    if (optHoriz) {
      nextHorizontal = true; // 点击「横」明确切为横向长卷
    } else if (optVert) {
      nextHorizontal = false; // 点击「竖」明确切为常规纵向滚动
    } else {
      nextHorizontal = !currentHorizontal;
    }

    try {
      localStorage.setItem(LAYOUT_KEY, nextHorizontal ? 'horizontal' : 'vertical');
    } catch {
      /* ignore */
    }

    applyLayout(nextHorizontal);
  };

  document.addEventListener('click', handleLayoutClick);
  window._handleLayoutClick = handleLayoutClick;
}

document.addEventListener('astro:page-load', () => {
  setupReadingBar();
  setupTocSpy();
  setupReadingBookmark();
  setupFontScaler();
  setupPoetryLayout();
});
