import { setupReadingBar } from './reading/progress';
import { setupTocSpy } from './reading/toc';
import { setupReadingBookmark } from './reading/bookmark';
import { setupFontScaler } from './reading/font-scale';
import { setupPoetryLayout } from './reading/poetry-layout';

export { setupReadingBar, setupTocSpy, setupReadingBookmark, setupFontScaler, setupPoetryLayout };

document.addEventListener('astro:page-load', () => {
  setupReadingBar();
  setupTocSpy();
  setupReadingBookmark();
  setupFontScaler();
  setupPoetryLayout();
});
