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

  const handleLayoutClick = (e: Event) => {
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

    if (nextHorizontal === currentHorizontal) return;

    try {
      localStorage.setItem(LAYOUT_KEY, nextHorizontal ? 'horizontal' : 'vertical');
    } catch {
      /* ignore */
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      applyLayout(nextHorizontal);
      return;
    }

    // 轻柔水墨晕染淡出，切换排版后再淡入重组
    poemWrap.classList.add('is-switching');
    setTimeout(() => {
      applyLayout(nextHorizontal);
      requestAnimationFrame(() => {
        poemWrap.classList.remove('is-switching');
      });
    }, 140);
  };

  document.addEventListener('click', handleLayoutClick);
  window._handleLayoutClick = handleLayoutClick;
}
