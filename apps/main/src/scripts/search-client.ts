interface LocalItem {
  title: string;
  url: string;
  content: string;
  category?: string;
}

interface PagefindResultItem {
  data: () => Promise<{
    url: string;
    meta: { title?: string };
    excerpt: string;
  }>;
}

interface PagefindInstance {
  search: (query: string) => Promise<{
    results: PagefindResultItem[];
  }>;
  init: () => Promise<void>;
}

let pagefind: PagefindInstance | null = null;
let localIndex: LocalItem[] = [];
let isLocalMode = false;
let aiUrl = 'https://ai.newmaybe.com';

let overlay: HTMLElement;
let input: HTMLInputElement;
let resultsContainer: HTMLElement;
let queryVersion = 0;
let focusTimeout: ReturnType<typeof setTimeout> | undefined;
let indexError = '';

function invalidateSearch() {
  queryVersion += 1;
  clearTimeout(debounceTimeout);
  clearTimeout(focusTimeout);
  if (input) input.onkeydown = null;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[char] || char,
  );
}

function initElements() {
  overlay = document.getElementById('search-overlay') as HTMLElement;
  input = document.getElementById('search-input') as HTMLInputElement;
  resultsContainer = document.getElementById('search-results') as HTMLElement;
  if (overlay) {
    aiUrl = overlay.getAttribute('data-ai-url') || 'https://ai.newmaybe.com';
  }
}

function getEmptyStateHtml(message: string, query?: string): string {
  const safeMessage = escapeHtml(message);
  const safeAiUrl = escapeHtml(aiUrl);
  if (query) {
    const aiLink = `${aiUrl}?q=${encodeURIComponent(query)}`;
    return `
      <div class="search-empty">
        ${safeMessage}
        <div class="search-ai-tip">
          没有匹配？试试让 <a href="${escapeHtml(aiLink)}" target="_blank" rel="noopener noreferrer" class="search-ai-link">AI 园丁</a> 为您深度联想“${escapeHtml(query)}”？
        </div>
      </div>
    `;
  }
  return `
    <div class="search-empty">
      ${safeMessage}
      <div class="search-ai-tip">
        或者，试试直接向 <a href="${safeAiUrl}" target="_blank" rel="noopener noreferrer" class="search-ai-link">AI 园丁</a> 提问交互？
      </div>
    </div>
  `;
}

// ── 根据 URL 推断内容类型标签 ──
function guessCategoryFromUrl(url: string, fallback?: string): string {
  if (fallback && fallback !== '其它') return fallback;
  if (url.includes('/writing/')) return '文字';
  if (url.includes('/fragments')) return '念头';
  if (url.includes('/excerpts')) return '拾遗';
  if (url.includes('/notes/')) return '笔记';
  if (url.includes('/memory/')) return '记忆';
  return '其它';
}

// ── 统一的结果卡片渲染（dev 和 prod 共用）──
function createResultItem(
  url: string,
  title: string,
  excerpt: string,
  category?: string,
  terms: string[] = [],
): HTMLAnchorElement {
  const card = document.createElement('a');
  card.href = url;
  card.className = 'search-result-item';
  const cat = guessCategoryFromUrl(url, category);

  const appendHighlightedText = (container: HTMLElement, value: string) => {
    if (terms.length === 0) {
      container.textContent = value;
      return;
    }
    const escapedTerms = terms.map((term) => term.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const pattern = new RegExp(`(${escapedTerms.join('|')})`, 'gi');
    for (const part of value.split(pattern)) {
      if (!part) continue;
      if (terms.some((term) => part.toLowerCase() === term.toLowerCase())) {
        const mark = document.createElement('mark');
        mark.textContent = part;
        container.appendChild(mark);
      } else {
        container.appendChild(document.createTextNode(part));
      }
    }
  };

  const meta = document.createElement('div');
  meta.className = 'result-meta';
  const titleElement = document.createElement('span');
  titleElement.className = 'result-title';
  appendHighlightedText(titleElement, title);
  const categoryElement = document.createElement('span');
  categoryElement.className = 'result-cat';
  categoryElement.textContent = cat;
  meta.append(titleElement, categoryElement);

  const excerptElement = document.createElement('p');
  excerptElement.className = 'result-excerpt';
  appendHighlightedText(excerptElement, excerpt);
  card.append(meta, excerptElement);
  return card;
}

// 1. 初始化 Pagefind (仅在弹窗打开时懒加载)
async function initPagefind() {
  if (pagefind || localIndex.length > 0) return true;

  // 如果是开发环境，使用 /all-content.json 进行本地简易检索，避免 404 报错并使搜索功能可用
  if (import.meta.env.DEV) {
    isLocalMode = true;
    try {
      const res = await fetch('/all-content.json');
      localIndex = await res.json();
      return true;
    } catch (e) {
      console.warn('Failed to load local content index.', e);
      indexError = '本地搜索索引加载失败。';
      return false;
    }
  }

  try {
    // 动态导入编译生成的 pagefind.js (使用 window.location.origin 绕过 Vite 开发服务器的静态依赖分析)
    pagefind = await import(/* @vite-ignore */ `${window.location.origin}/pagefind/pagefind.js`);
    if (pagefind) {
      await pagefind.init();
    }
    return true;
  } catch (e) {
    console.warn('Pagefind is not initialized yet (runs after production build).', e);
    indexError = '搜索索引未就绪，请稍后重试。';
    return false;
  }
}

// 2. 打开弹窗
async function openSearch() {
  if (!overlay || !input) return;
  const version = queryVersion;
  overlay.style.display = 'flex';
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  focusTimeout = setTimeout(() => input.focus(), 50);

  // 打开时开始初始化 pagefind
  const ready = await initPagefind();
  if (!ready && version === queryVersion && resultsContainer) {
    resultsContainer.innerHTML = `<div class="search-error">${escapeHtml(indexError)}</div>`;
  }
}

// 3. 关闭弹窗
function closeSearch() {
  invalidateSearch();
  if (!overlay || !input || !resultsContainer) return;
  overlay.style.display = 'none';
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  input.value = '';
  resultsContainer.innerHTML = getEmptyStateHtml('输入关键字开始搜索...');
}

// 4. 执行搜索
let debounceTimeout: ReturnType<typeof setTimeout> | undefined;
async function handleSearch() {
  invalidateSearch();
  const version = queryVersion;
  const isCurrent = () => version === queryVersion && resultsContainer?.isConnected;
  if (!input || !resultsContainer) return;
  const query = input.value.trim();
  if (!query) {
    resultsContainer.innerHTML = getEmptyStateHtml('输入关键字开始搜索...');
    return;
  }

  // 开发环境本地搜索逻辑
  if (isLocalMode) {
    resultsContainer.innerHTML = '<div class="search-loading">本地搜索中...</div>';

    clearTimeout(debounceTimeout);
    debounceTimeout = setTimeout(() => {
      if (!isCurrent()) return;
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return;

      const matches = localIndex.filter((item) => {
        const title = (item.title || '').toLowerCase();
        const content = (item.content || '').toLowerCase();
        const cat = (item.category || '').toLowerCase();
        return terms.every(
          (term) => title.includes(term) || content.includes(term) || cat.includes(term),
        );
      });

      if (matches.length === 0) {
        resultsContainer.innerHTML = getEmptyStateHtml('未找到匹配的结果。', query);
        return;
      }

      resultsContainer.innerHTML = '';
      // 仅展示前 8 条结果
      matches.slice(0, 8).forEach((item) => {
        // 查找匹配的片段，截取高亮内容周围文字
        let excerpt = item.content.slice(0, 100);
        const firstTerm = terms[0];
        if (firstTerm) {
          const idx = item.content.toLowerCase().indexOf(firstTerm);
          if (idx > -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(item.content.length, idx + 70);
            excerpt =
              (start > 0 ? '...' : '') +
              item.content.slice(start, end) +
              (end < item.content.length ? '...' : '');
          }
        }

        const card = createResultItem(item.url, item.title, excerpt, item.category, terms);
        resultsContainer.appendChild(card);
      });

      setupKeyboardNavigation();
    }, 200);
    return;
  }

  if (!pagefind) {
    const ready = await initPagefind();
    if (!isCurrent()) return;
    if (!ready) {
      resultsContainer.innerHTML = `<div class="search-error">${escapeHtml(indexError)}</div>`;
      return;
    }
  }

  resultsContainer.innerHTML = '<div class="search-loading">搜索中...</div>';

  // 搜索接口防抖
  clearTimeout(debounceTimeout);
  debounceTimeout = setTimeout(async () => {
    try {
      if (!pagefind) return;
      const searchResult = await pagefind.search(query);
      if (!isCurrent()) return;
      if (searchResult.results.length === 0) {
        resultsContainer.innerHTML = getEmptyStateHtml('未找到匹配的结果。', query);
        return;
      }

      // 仅展示前 8 条结果
      const limitedResults = searchResult.results.slice(0, 8);
      const resolvedData = await Promise.all(
        limitedResults.map((r: PagefindResultItem) => r.data()),
      );
      if (!isCurrent()) return;

      resultsContainer.innerHTML = '';
      resolvedData.forEach((data: { url: string; meta: { title?: string }; excerpt: string }) => {
        const excerptDocument = new DOMParser().parseFromString(data.excerpt, 'text/html');
        const card = createResultItem(
          data.url,
          data.meta.title || '无标题',
          excerptDocument.body.textContent || '',
          undefined,
          query.toLowerCase().split(/\s+/).filter(Boolean),
        );
        resultsContainer.appendChild(card);
      });

      // 绑定键盘上下选择
      setupKeyboardNavigation();
    } catch (e) {
      if (!isCurrent()) return;
      console.error('Error during search:', e);
      resultsContainer.innerHTML = '<div class="search-error">搜索过程中出错。</div>';
    }
  }, 200);
}

// 5. 键盘导航 (↑↓ 选择，Enter 进入)
function setupKeyboardNavigation() {
  if (!resultsContainer || !input) return;
  const items = resultsContainer.querySelectorAll('.search-result-item');
  if (items.length === 0) {
    input.onkeydown = null;
    return;
  }

  let activeIndex = -1;

  // 清理之前的选中状态
  items.forEach((el) => el.classList.remove('active'));

  input.onkeydown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      activeIndex = (activeIndex + 1) % items.length;
      updateActiveItem();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      activeIndex = (activeIndex - 1 + items.length) % items.length;
      updateActiveItem();
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        const target = items[activeIndex] as HTMLAnchorElement;
        const href = target.getAttribute('href');
        if (href) {
          import('astro:transitions/client')
            .then(({ navigate }) => {
              navigate(href);
            })
            .catch(() => {
              window.location.href = href;
            });
          closeSearch();
        }
      }
    }
  };

  function updateActiveItem() {
    items.forEach((item, idx) => {
      if (idx === activeIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }
}

// 6. 全局监听
function setupListeners() {
  if (!overlay || !input) return;

  // 监听快捷键 Cmd+K / Ctrl+K (清理旧的，防止 View Transitions 重复绑定)
  if (window._searchKeydownHandler) {
    window.removeEventListener('keydown', window._searchKeydownHandler);
  }

  const keydownHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      if (overlay.style.display === 'flex') {
        closeSearch();
      } else {
        openSearch();
      }
    }
    if (e.key === 'Escape' && overlay.style.display === 'flex') {
      closeSearch();
    }
  };

  window.addEventListener('keydown', keydownHandler);
  window._searchKeydownHandler = keydownHandler;

  // 绑定搜索框输入 (使用 oninput 确保同一个节点不重复累加 listener)
  input.oninput = handleSearch;

  // 点击蒙层关闭
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeSearch();
    }
  };

  // 绑定导航栏放大镜图标触发
  const searchBtn = document.getElementById('search-nav-trigger');
  if (searchBtn) {
    searchBtn.onclick = (e) => {
      e.preventDefault();
      openSearch();
    };
  }
}

// 支持 View Transitions 的生命周期绑定
document.addEventListener('astro:page-load', () => {
  invalidateSearch();
  initElements();
  setupListeners();
});

document.addEventListener('astro:before-swap', () => {
  closeSearch();
  if (window._searchKeydownHandler) {
    window.removeEventListener('keydown', window._searchKeydownHandler);
    delete window._searchKeydownHandler;
  }
});
