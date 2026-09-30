export type SiteTheme = 'light' | 'dark';

export interface BrowserThemeColors {
  light: string;
  dark: string;
  studyLight: string;
  studyDark: string;
}

/** Self-contained so tokens:build can also emit this module as a pre-paint inline script. */
export function createBrowserTheme(colors: BrowserThemeColors) {
  let started = false;

  function savedTheme(): SiteTheme | null {
    const cookie = document.cookie.match(/(?:^|;\s*)theme=(dark|light)(?:;|$)/)?.[1];
    if (cookie === 'dark' || cookie === 'light') return cookie;
    const keys =
      document.documentElement.dataset.themePalette === 'study'
        ? ['linxia:theme', 'theme']
        : ['theme'];
    try {
      for (const key of keys) {
        const value = localStorage.getItem(key);
        if (value === 'dark' || value === 'light') return value;
      }
    } catch {
      // Cookie and system preferences still work when storage is unavailable.
    }
    return null;
  }

  function getTheme(): SiteTheme {
    return (
      savedTheme() || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    );
  }

  function sync(theme: SiteTheme, targetDocument: Document = document): void {
    const isStudy = targetDocument.documentElement.dataset.themePalette === 'study';
    const color = isStudy
      ? theme === 'dark'
        ? colors.studyDark
        : colors.studyLight
      : colors[theme];
    // Replace the node as well as its value to refresh browser chrome.
    targetDocument.querySelectorAll('meta[name="theme-color"]').forEach((meta) => meta.remove());
    const meta = targetDocument.createElement('meta');
    meta.name = 'theme-color';
    meta.content = color;
    targetDocument.head.appendChild(meta);

    // Replace color-scheme meta as well; WebKit ignores attribute mutations on existing head nodes.
    targetDocument.querySelectorAll('meta[name="color-scheme"]').forEach((el) => el.remove());
    const scheme = targetDocument.createElement('meta');
    scheme.name = 'color-scheme';
    scheme.content = theme;
    targetDocument.head.appendChild(scheme);

    targetDocument.documentElement.style.colorScheme = theme;
    targetDocument.documentElement.style.backgroundColor = color;
    if (targetDocument.body) {
      targetDocument.body.style.backgroundColor = color;
    } else {
      targetDocument.addEventListener(
        'DOMContentLoaded',
        () => {
          // Read the latest color in case the theme changed before the body was parsed.
          targetDocument.body.style.backgroundColor =
            targetDocument.documentElement.style.backgroundColor;
        },
        { once: true },
      );
    }
    // Force iOS Safari to commit the pending themeColor to UIProcess immediately.
    // WebKit marks themeColor as pending in WebPage, but on iOS it is only transmitted
    // to UIProcess within a RemoteLayerTreeTransaction during willCommitLayerTree().
    // Creating a temporary composited layer and performing an instant 1px scroll tick
    // forces WebKit to commit the layer tree and triggers Safari's live color-sampling observer.
    if (typeof window !== 'undefined' && targetDocument === document) {
      if (targetDocument.body) {
        const nudge = targetDocument.createElement('div');
        nudge.setAttribute('aria-hidden', 'true');
        nudge.style.cssText =
          'position:fixed;top:0;left:0;width:1px;height:1px;transform:translateZ(0);opacity:0.01;pointer-events:none;z-index:-1;';
        targetDocument.body.appendChild(nudge);

        const y = window.scrollY;
        const tickY = y === 0 ? 1 : y - 1;
        try {
          window.scrollTo({ top: tickY, behavior: 'instant' });
        } catch {
          window.scrollTo(0, tickY);
        }

        let cleaned = false;
        let frame = 0;

        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          clearTimeout(timer);
          if (frame && typeof window.cancelAnimationFrame === 'function') {
            window.cancelAnimationFrame(frame);
          }
          nudge.remove();
          // Only restore if scroll position is still at the 1px tick offset,
          // avoiding overriding any user-initiated scrolling.
          if (window.scrollY === tickY) {
            try {
              window.scrollTo({ top: y, behavior: 'instant' });
            } catch {
              window.scrollTo(0, y);
            }
          }
        };

        if (typeof window.requestAnimationFrame === 'function') {
          frame = window.requestAnimationFrame(cleanup);
        }
        const timer = setTimeout(cleanup, 80);
      }
    }
    targetDocument.dispatchEvent(new Event('newmaybe:theme-change'));
  }

  function apply(theme: SiteTheme, targetDocument: Document = document): void {
    targetDocument.documentElement.classList.toggle('dark', theme === 'dark');
    targetDocument.documentElement.classList.toggle('light', theme === 'light');
    sync(theme, targetDocument);
  }

  function start(): void {
    // Astro can execute the inline bootstrap again after navigation.
    if (started) return;
    started = true;
    apply(getTheme());
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      if (!savedTheme()) apply(event.matches ? 'dark' : 'light');
    });
    document.addEventListener('astro:before-swap', (event) => {
      const { newDocument } = event as Event & { newDocument: Document };
      apply(document.documentElement.classList.contains('dark') ? 'dark' : 'light', newDocument);
    });
    document.addEventListener('astro:after-swap', () => {
      sync(document.documentElement.classList.contains('dark') ? 'dark' : 'light');
    });
  }

  return { getTheme, sync, apply, start };
}

declare global {
  interface Window {
    __newmaybeTheme?: ReturnType<typeof createBrowserTheme>;
  }
}
