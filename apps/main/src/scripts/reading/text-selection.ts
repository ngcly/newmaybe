export function setupTextSelection() {
  const prose = document.querySelector('.prose');
  if (!prose) return;

  // 1. 获取现有或创建浮动气泡
  let popover = document.getElementById('textSelectionPopover');
  if (!popover) {
    popover = document.createElement('div');
    popover.id = 'textSelectionPopover';
    popover.className = 'text-selection-popover';
    popover.innerHTML = `
      <button type="button" class="sel-btn sel-copy-btn" id="selCopyBtn" title="复制金句引文">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
        </svg>
        <span class="sel-text">摘录</span>
      </button>
      <span class="sel-divider">/</span>
      <button type="button" class="sel-btn sel-card-btn" id="selCardBtn" title="前往工坊生成卡片">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
        </svg>
        <span class="sel-text">制卡 ↗</span>
      </button>
    `;
    document.body.appendChild(popover);
  }

  let selectedQuote = '';

  const hidePopover = () => {
    if (popover) {
      popover.classList.remove('is-visible');
    }
  };

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      hidePopover();
      return;
    }

    const text = selection.toString().trim();
    if (text.length < 3) {
      hidePopover();
      return;
    }

    // 检查是否在正文 prose 容器内
    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !prose.contains(range.commonAncestorContainer)) {
      hidePopover();
      return;
    }

    selectedQuote = text;

    const rect = range.getBoundingClientRect();
    const popoverWidth = 140;
    const x = Math.max(
      16,
      Math.min(
        window.innerWidth - popoverWidth - 16,
        rect.left + rect.width / 2 - popoverWidth / 2,
      ),
    );
    const y = Math.max(12, rect.top - 46);

    if (popover) {
      popover.style.left = `${x}px`;
      popover.style.top = `${y}px`;
      popover.classList.add('is-visible');
    }
  };

  // 绑定选择变化事件
  document.removeEventListener('selectionchange', window._onTextSelectionChange as EventListener);
  document.addEventListener('selectionchange', handleSelection);
  window._onTextSelectionChange = handleSelection;

  // 绑定点击事件
  const copyBtn = document.getElementById('selCopyBtn');
  const cardBtn = document.getElementById('selCardBtn');

  if (copyBtn) {
    copyBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const titleEl = document.querySelector('h1');
      const title = titleEl ? titleEl.textContent?.trim() : '随笔';
      const quoteStr = `“${selectedQuote}” —— 《${title}》· newmaybe（${window.location.href}）`;
      void navigator.clipboard.writeText(quoteStr);

      const textSpan = copyBtn.querySelector('.sel-text');
      if (textSpan) textSpan.textContent = '已复制 ✔';
      setTimeout(() => {
        if (textSpan) textSpan.textContent = '摘录';
        hidePopover();
      }, 1500);
    };
  }

  if (cardBtn) {
    cardBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const isDev =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
      const studioBase = isDev ? 'http://localhost:4326' : 'https://studio.newmaybe.com';
      const targetUrl = `${studioBase}?tab=card&content=${encodeURIComponent(selectedQuote)}`;
      window.open(targetUrl, '_blank', 'noopener,noreferrer');
      hidePopover();
    };
  }
}

declare global {
  interface Window {
    _onTextSelectionChange?: () => void;
  }
}
