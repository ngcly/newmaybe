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
    let scheme = targetDocument.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
    if (!scheme) {
      scheme = targetDocument.createElement('meta');
      scheme.name = 'color-scheme';
      targetDocument.head.appendChild(scheme);
    }
    scheme.content = theme;
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
