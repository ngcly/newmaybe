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

document.addEventListener('astro:page-load', () => {
  setupReadingBar();
  setupTocSpy();
  setupReadingBookmark();
  setupFontScaler();
});
