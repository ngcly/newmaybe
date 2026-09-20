export function setupTocSpy() {
  if (window._onScrollToc) {
    window.removeEventListener('scroll', window._onScrollToc);
    delete window._onScrollToc;
  }

  const tocLinks = Array.from(document.querySelectorAll('.toc-link'));
  if (tocLinks.length === 0) return;

  const headings = Array.from(
    document.querySelectorAll<HTMLElement>(
      '.editorial-content .prose h2[id], .editorial-content .prose h3[id]',
    ),
  );
  if (headings.length === 0) return;

  const linkMap = new Map<string, Element[]>();
  tocLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href && href.startsWith('#')) {
      const rawId = href.slice(1);
      const decodedId = decodeURIComponent(rawId);
      if (!linkMap.has(decodedId)) linkMap.set(decodedId, []);
      linkMap.get(decodedId)!.push(link);
      if (rawId !== decodedId) {
        if (!linkMap.has(rawId)) linkMap.set(rawId, []);
        linkMap.get(rawId)!.push(link);
      }
    }
  });

  const setActive = (activeId: string | null) => {
    tocLinks.forEach((link) => link.classList.remove('active'));
    if (activeId && linkMap.has(activeId)) {
      linkMap.get(activeId)!.forEach((link) => link.classList.add('active'));
    }
  };

  let ticking = false;
  const updateActiveHeading = () => {
    if (window.scrollY < 120) {
      setActive(null);
      return;
    }
    let currentId: string | null = null;
    for (const h of headings) {
      const rect = h.getBoundingClientRect();
      if (rect.top <= 150) {
        currentId = h.id;
      } else {
        break;
      }
    }
    setActive(currentId);
  };

  const onScroll = () => {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(() => {
        updateActiveHeading();
        ticking = false;
      });
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window._onScrollToc = onScroll;
  updateActiveHeading();

  document.querySelectorAll('.toc-mobile .toc-link').forEach((link) => {
    link.addEventListener('click', () => {
      const details = link.closest('.toc-mobile');
      if (details) details.removeAttribute('open');
    });
  });
}
