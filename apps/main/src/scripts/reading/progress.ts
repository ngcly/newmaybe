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
