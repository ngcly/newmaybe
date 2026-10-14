export function setupGraphPanel() {
  const toggle = document.getElementById('graph-controls-toggle');
  const controls = document.getElementById('graph-controls');
  if (!toggle || !controls) return;
  toggle.addEventListener('click', () => {
    const expanded = toggle.getAttribute('aria-expanded') === 'true';
    toggle.setAttribute('aria-expanded', String(!expanded));
    toggle.textContent = expanded ? '展开面板' : '收起面板';
    controls.hidden = expanded;
  });
}
