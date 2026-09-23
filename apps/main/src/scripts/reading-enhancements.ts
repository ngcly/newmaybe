import { setupReadingBar } from './reading/progress';
import { setupTocSpy } from './reading/toc';
import { setupReadingBookmark } from './reading/bookmark';
import { setupFontScaler } from './reading/font-scale';
import { setupPoetryLayout } from './reading/poetry-layout';
import { setupReadingDock } from './reading/reading-dock';
import { setupTextSelection } from './reading/text-selection';

export {
  setupReadingBar,
  setupTocSpy,
  setupReadingBookmark,
  setupFontScaler,
  setupPoetryLayout,
  setupReadingDock,
  setupTextSelection,
};

document.addEventListener('astro:page-load', () => {
  setupReadingBar();
  setupTocSpy();
  setupReadingBookmark();
  setupFontScaler();
  setupPoetryLayout();
  setupReadingDock();
  setupTextSelection();
});
