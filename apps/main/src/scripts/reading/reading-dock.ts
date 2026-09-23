export function setupReadingDock() {
  const dock = document.getElementById('readingDock');
  const trigger = document.getElementById('readingDockTrigger');
  const panel = document.getElementById('readingDockPanel');
  const topBtn = document.getElementById('readingDockTop');

  if (!dock || !trigger || !panel) return;

  // 1. 展开/折叠面板
  const toggleDock = (open?: boolean) => {
    const isOpen = open ?? !dock.classList.contains('is-open');
    dock.classList.toggle('is-open', isOpen);
    trigger.setAttribute('aria-expanded', String(isOpen));
  };

  const handleTriggerClick = (e: MouseEvent) => {
    e.stopPropagation();
    toggleDock();
  };

  trigger.removeEventListener('click', trigger._readingDockClick as EventListener);
  trigger.addEventListener('click', handleTriggerClick);
  trigger._readingDockClick = handleTriggerClick;

  // 2. 点击外部收起
  const handleDocClick = (e: MouseEvent) => {
    if (!dock.contains(e.target as Node)) {
      toggleDock(false);
    }
  };

  document.removeEventListener('click', document._readingDockDocClick as EventListener);
  document.addEventListener('click', handleDocClick);
  document._readingDockDocClick = handleDocClick;

  // 3. 按 ESC 键关闭
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && dock.classList.contains('is-open')) {
      toggleDock(false);
      trigger.focus();
    }
  };

  document.removeEventListener('keydown', document._readingDockKeyClick as EventListener);
  document.addEventListener('keydown', handleKeyDown);
  document._readingDockKeyClick = handleKeyDown;

  // 4. 回顶操作
  if (topBtn) {
    const handleTopClick = (e: MouseEvent) => {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: 'smooth' });
      toggleDock(false);
    };
    topBtn.removeEventListener('click', topBtn._topClick as EventListener);
    topBtn.addEventListener('click', handleTopClick);
    topBtn._topClick = handleTopClick;
  }

  // 5. 持续滚动时轻度淡化防遮挡 (Auto-dim on continuous scroll)
  let scrollTimer: ReturnType<typeof setTimeout> | null = null;
  const onScroll = () => {
    dock.classList.add('is-scrolling');
    if (scrollTimer) clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      dock.classList.remove('is-scrolling');
    }, 1200);
  };

  window.removeEventListener('scroll', window._readingDockScroll as EventListener);
  window.addEventListener('scroll', onScroll, { passive: true });
  window._readingDockScroll = onScroll;
}

declare global {
  interface HTMLElement {
    _readingDockClick?: (e: MouseEvent) => void;
    _topClick?: (e: MouseEvent) => void;
  }
  interface Document {
    _readingDockDocClick?: (e: MouseEvent) => void;
    _readingDockKeyClick?: (e: KeyboardEvent) => void;
  }
  interface Window {
    _readingDockScroll?: () => void;
  }
}
