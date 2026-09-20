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
