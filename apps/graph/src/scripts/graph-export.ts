const getThemeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();
export function setupGraphExport() {
  // cloneNode/XMLSerializer 不携带文档样式表：导出前把 .link/.node 关键样式
  // 按当前主题色注入克隆节点，否则导出图连线全部丢失、文字回退为默认黑色
  function serializeGraphSvg({ withBackground = false } = {}) {
    const graphEl = document.getElementById('graph');
    if (!graphEl) return '';
    const clonedSvg = graphEl.cloneNode(true) as SVGElement;
    const { width, height } = graphEl.getBoundingClientRect();
    clonedSvg.setAttribute('width', String(width));
    clonedSvg.setAttribute('height', String(height));
    clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    const styleEl = document.createElementNS('http://www.w3.org/2000/svg', 'style');
    styleEl.textContent = `
      .link { stroke: ${getThemeColor('--line')}; stroke-opacity: 0.45; stroke-width: 1px; }
      .link.highlighted, .link.active-selected-link { stroke: ${getThemeColor('--ochre')}; stroke-opacity: 0.9; stroke-width: 2px; }
      .node circle { stroke: ${getThemeColor('--paper')}; stroke-width: 2px; }
      .node.active circle, .node.active-selected circle { stroke: ${getThemeColor('--ochre')}; stroke-width: 3px; }
      .node.dimmed circle, .node.dimmed text { opacity: 0.22; }
      .node text { font-family: 'Noto Serif SC', 'Songti SC', serif; font-size: 11px; fill: ${getThemeColor('--ink-soft')}; opacity: 0.85; }
      .node.active text, .node.active-selected text { fill: ${getThemeColor('--ink')}; font-size: 13px; font-weight: 500; opacity: 1; }
    `;
    clonedSvg.insertBefore(styleEl, clonedSvg.firstChild);

    if (withBackground) {
      const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
      bgRect.setAttribute('width', '100%');
      bgRect.setAttribute('height', '100%');
      bgRect.setAttribute('fill', getThemeColor('--paper'));
      clonedSvg.insertBefore(bgRect, clonedSvg.firstChild);
    }

    let source = new XMLSerializer().serializeToString(clonedSvg);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink="http:\/\/www\.w3\.org\/1999\/xlink"/)) {
      source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }
    return source;
  }

  document.getElementById('btn-download-svg')?.addEventListener('click', () => {
    const source = serializeGraphSvg({ withBackground: true });
    const url = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(source);
    const a = document.createElement('a');
    a.href = url;
    a.download = `newmaybe-mindmap-${Date.now()}.svg`;
    a.click();
  });

  document.getElementById('btn-download-png')?.addEventListener('click', () => {
    const source = serializeGraphSvg();

    const svgBlob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth * 2;
      canvas.height = image.naturalHeight * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        return;
      }

      ctx.fillStyle = getThemeColor('--paper');
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(2, 2);
      ctx.drawImage(image, 0, 0, image.naturalWidth, image.naturalHeight);

      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `newmaybe-mindmap-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
    };
    image.onerror = () => URL.revokeObjectURL(url);
    image.src = url;
  });
}
