import { dark, light, studyDark, studyLight } from './index';
import { createBrowserTheme, type SiteTheme } from './browser-theme-core';

export type { SiteTheme } from './browser-theme-core';

function controller() {
  return (window.__newmaybeTheme ??= createBrowserTheme({
    light: light.paper,
    dark: dark.paper,
    studyLight: studyLight['study-paper'],
    studyDark: studyDark['study-paper'],
  }));
}

export function getPreferredTheme(): SiteTheme {
  return controller().getTheme();
}

export function getCurrentTheme(): SiteTheme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function subscribeTheme(listener: () => void): () => void {
  document.addEventListener('newmaybe:theme-change', listener);
  return () => document.removeEventListener('newmaybe:theme-change', listener);
}

/** Keep browser chrome in step with the theme selected by the site. */
export function syncBrowserTheme(theme: SiteTheme, targetDocument: Document = document): void {
  controller().sync(theme, targetDocument);
}
