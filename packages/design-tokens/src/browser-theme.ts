import { dark, light, studyDark, studyLight } from './index';

export type SiteTheme = 'light' | 'dark';

/** Keep browser chrome in step with the theme selected by the site. */
export function syncBrowserTheme(theme: SiteTheme, targetDocument: Document = document): void {
  const themeColors = targetDocument.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  let themeColor = themeColors[0];
  if (!themeColor) {
    themeColor = targetDocument.createElement('meta');
    themeColor.name = 'theme-color';
    targetDocument.head.appendChild(themeColor);
  }
  themeColors.forEach((element, index) => {
    if (index > 0) element.remove();
  });
  themeColor.removeAttribute('media');
  const isStudy = targetDocument.documentElement.dataset.themePalette === 'study';
  themeColor.content = isStudy
    ? theme === 'dark'
      ? studyDark['study-paper']
      : studyLight['study-paper']
    : theme === 'dark'
      ? dark.paper
      : light.paper;
  targetDocument.documentElement.style.colorScheme = theme;
  targetDocument.documentElement.style.backgroundColor = themeColor.content;
}
