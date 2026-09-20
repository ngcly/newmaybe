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
