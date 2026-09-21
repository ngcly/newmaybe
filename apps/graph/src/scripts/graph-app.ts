/* eslint-disable @typescript-eslint/no-explicit-any */
import * as d3 from 'd3';
import { setupGraphExport } from './graph-export';
import { parseGardenData } from './graph-data';
import { resolveSubdomain as resolveSubdomainUrl } from '@newmaybe/content/utils';
import type { GraphNode, GraphLink, GardenData, GraphMode } from './graph-types';

const svg = d3.select('#graph');
const width = window.innerWidth;
const height = window.innerHeight;

// 配置信息
const configEl = document.getElementById('subdomain-config');
const isDev = configEl?.getAttribute('data-dev') === 'true';
const resolveSubdomain = (url: string) => resolveSubdomainUrl(url, isDev);

// 状态数据
let originalGardenData: GardenData = { nodes: [], links: [] };
let nodes: GraphNode[] = [];
let links: GraphLink[] = [];
let currentMode: GraphMode = 'view'; // 'view' / 'sandbox'
let selectedNode: GraphNode | null = null;
let selectedLink: GraphLink | null = null;
let linkSourceNode: GraphNode | null = null;
let linkTargetNode: GraphNode | null = null;
let simulation: any = null;

// 主容器，供缩放平移使用
const g = svg.append('g');

// 缩放
const zoom = d3
  .zoom()
  .scaleExtent([0.1, 4])
  .on('zoom', (event: any) => {
    g.attr('transform', event.transform);
  });
svg.call(zoom);

// 窗口重置自适应
window.addEventListener('resize', () => {
  if (simulation) {
    simulation.force('center', d3.forceCenter(window.innerWidth / 2, window.innerHeight / 2));
    simulation.alpha(0.3).restart();
  }
});

const getThemeColor = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

const colors: Record<string, () => string> = {
  posts: () => getThemeColor('--ink'),
  notes: () => getThemeColor('--ochre'),
  memories: () => getThemeColor('--ink-soft'),
  excerpts: () => getThemeColor('--ink-faint'),
  fragments: () => getThemeColor('--line'),
};

const nodeRadii: Record<string, number> = {
  posts: 12,
  notes: 10,
  memories: 9,
  excerpts: 8,
  fragments: 7,
};

const typeLabels: Record<string, string> = {
  posts: '文章 / Writing',
  notes: '笔记 / Note',
  memories: '记忆 / Memory',
  excerpts: '拾遗 / Excerpt',
  fragments: '念头 / Fragment',
};

const linkGroup = g.append('g').attr('class', 'links-group');
const nodeGroup = g.append('g').attr('class', 'nodes-group');

// ── 填充无障碍节点列表 ──
function populateNodeList() {
  const container = document.getElementById('node-list-content');
  if (!container) return;

  const groups: Record<string, GraphNode[]> = {};
  for (const n of nodes) {
    const grp = n.group || 'other';
    if (!groups[grp]) groups[grp] = [];
    groups[grp].push(n);
  }

  const groupOrder = ['posts', 'notes', 'memories', 'excerpts', 'fragments'];
  container.replaceChildren();
  for (const grp of groupOrder) {
    const items = groups[grp];
    if (!items || items.length === 0) continue;
    const group = document.createElement('div');
    group.className = 'node-list-group';
    const label = document.createElement('div');
    label.className = 'node-list-group-label';
    label.textContent = typeLabels[grp] || grp;
    group.appendChild(label);
    for (const n of items) {
      const button = document.createElement('button');
      button.className = 'node-list-item';
      button.dataset.nodeId = n.id;
      button.textContent = n.title;
      button.addEventListener('click', () => focusOnNode(n));
      group.appendChild(button);
    }
    container.appendChild(group);
  }

  if (!container.childElementCount) {
    const empty = document.createElement('div');
    empty.className = 'search-empty';
    empty.style.cssText =
      'font-size:0.78rem;color:var(--ink-faint);padding:1rem 0;text-align:center';
    empty.textContent = '暂无节点数据';
    container.appendChild(empty);
  }
}

function updateGraph() {
  if (
    (linkSourceNode && !nodes.includes(linkSourceNode)) ||
    (linkTargetNode && !nodes.includes(linkTargetNode))
  )
    resetLinkEndpoints();
  // 连线
  const linkSel = linkGroup.selectAll('line').data(links, (d: any) => {
    const s = d.source.id || d.source;
    const t = d.target.id || d.target;
    return `${s}-${t}`;
  });

  linkSel.exit().remove();

  const linkEnter = linkSel
    .enter()
    .append('line')
    .attr('class', 'link')
    .attr('role', 'presentation')
    .on('click', (event: MouseEvent, d: any) => {
      if (currentMode === 'sandbox') {
        event.stopPropagation();
        selectLink(d);
      }
    });

  const link = linkEnter.merge(linkSel);

  // 节点
  const nodeSel = nodeGroup.selectAll('.node').data(nodes, (d: any) => d.id);

  nodeSel.exit().remove();

  const nodeEnter = nodeSel
    .enter()
    .append('g')
    .attr('class', 'node')
    .call(d3.drag().on('start', dragstarted).on('drag', dragged).on('end', dragended));

  nodeEnter
    .append('circle')
    .attr('r', (d: any) => nodeRadii[d.group] || 10)
    .attr('fill', (d: any) => (colors[d.group] ? colors[d.group]() : getThemeColor('--ochre')))
    .attr('role', 'button')
    .attr('tabindex', 0)
    .attr('aria-label', (d: any) => `${d.title} (${typeLabels[d.group] || '想法'})`)
    .on('mouseover', handleMouseOver)
    .on('mouseout', handleMouseOut)
    .on('click', (event: MouseEvent, d: any) => {
      event.stopPropagation();
      selectNode(d);
    })
    .on('dblclick', (_event: MouseEvent, d: any) => {
      if (d.url) {
        window.open(resolveSubdomain(d.url), '_blank');
      }
    });

  nodeEnter
    .append('text')
    .attr('dx', (d: any) => (nodeRadii[d.group] || 10) + 6)
    .attr('dy', 4)
    .text((d: any) => d.title);

  const node = nodeEnter.merge(nodeSel);
  // select propagates the new parent datum to reused children after a keyed import.
  node
    .select('circle')
    .attr('r', (d: GraphNode) => nodeRadii[d.group] || 10)
    .attr('fill', (d: GraphNode) =>
      colors[d.group] ? colors[d.group]() : getThemeColor('--ochre'),
    )
    .attr('aria-label', (d: GraphNode) => `${d.title} (${typeLabels[d.group] || '想法'})`);
  node
    .select('text')
    .attr('dx', (d: GraphNode) => (nodeRadii[d.group] || 10) + 6)
    .text((d: GraphNode) => d.title);

  svg.on('click', () => {
    clearSelection();
  });

  simulation.nodes(nodes);
  simulation.force('link').links(links);

  simulation.on('tick', () => {
    link
      .attr('x1', (d: any) => d.source.x)
      .attr('y1', (d: any) => d.source.y)
      .attr('x2', (d: any) => d.target.x)
      .attr('y2', (d: any) => d.target.y);

    node.attr('transform', (d: any) => `translate(${d.x},${d.y})`);
  });

  simulation.alpha(0.3).restart();

  // 同步更新无障碍节点列表
  populateNodeList();
}

function handleMouseOver(event: any, d: any) {
  const searchInput = document.getElementById('graph-search') as HTMLInputElement | null;
  if (currentMode !== 'view' && !searchInput?.value) return;

  const adjacentNodeIds = new Set<string>();
  adjacentNodeIds.add(d.id);

  const linkSel = linkGroup.selectAll('line');
  const nodeSel = nodeGroup.selectAll('.node');

  linkSel.classed('highlighted', (l: any) => {
    const sId = l.source.id || l.source;
    const tId = l.target.id || l.target;
    if (sId === d.id || tId === d.id) {
      adjacentNodeIds.add(sId);
      adjacentNodeIds.add(tId);
      return true;
    }
    return false;
  });

  nodeSel.classed('dimmed', (n: any) => !adjacentNodeIds.has(n.id));
  d3.select(event.currentTarget.parentNode).classed('active', true);

  if (selectedNode === null && selectedLink === null) {
    const typeEl = document.getElementById('detail-type');
    const titleEl = document.getElementById('detail-title');
    const tipEl = document.getElementById('detail-tip');
    const cardEl = document.getElementById('detail-card');
    const actionsEl = document.getElementById('detail-cross-actions');
    if (typeEl) typeEl.innerText = typeLabels[d.group] || 'Thought';
    if (titleEl) titleEl.innerText = d.title;
    if (tipEl) {
      tipEl.innerText = d.url ? '双击该圆点跳转主域查看全文 ↗' : '心智沙盒自定义节点 ✏';
    }
    if (cardEl) cardEl.style.display = 'block';
    if (actionsEl) actionsEl.style.display = 'flex';
  }
}

function handleMouseOut(event: any, _d: any) {
  const searchInput = document.getElementById('graph-search') as HTMLInputElement | null;
  if (currentMode !== 'view' && !searchInput?.value) return;

  const linkSel = linkGroup.selectAll('line');
  const nodeSel = nodeGroup.selectAll('.node');

  linkSel.classed('highlighted', false);
  nodeSel.classed('dimmed', false);
  d3.select(event.currentTarget.parentNode).classed('active', false);

  if (selectedNode === null && selectedLink === null) {
    const cardEl = document.getElementById('detail-card');
    if (cardEl) cardEl.style.display = 'none';
  }
}

function selectNode(d: any) {
  selectedNode = d;
  selectedLink = null;

  nodeGroup.selectAll('.node').classed('active-selected', (n: any) => n.id === d.id);
  linkGroup.selectAll('line').classed('active-selected-link', false);

  const detailCard = document.getElementById('detail-card');
  const typeEl = document.getElementById('detail-type');
  const titleEl = document.getElementById('detail-title');
  const tipEl = document.getElementById('detail-tip');
  const delNodeBtn = document.getElementById('btn-delete-selected');
  const delLinkBtn = document.getElementById('btn-delete-link');
  const crossActions = document.getElementById('detail-cross-actions');

  if (typeEl) typeEl.innerText = typeLabels[d.group] || 'Custom';
  if (titleEl) titleEl.innerText = d.title;
  if (tipEl) {
    tipEl.innerText = d.url ? '双击该圆点跳转主域查看全文 ↗' : '心智沙盒自定义节点 ✏';
  }

  if (delNodeBtn) delNodeBtn.style.display = currentMode === 'sandbox' ? 'inline-block' : 'none';
  if (delLinkBtn) delLinkBtn.style.display = 'none';
  if (crossActions) crossActions.style.display = 'flex';
  if (detailCard) detailCard.style.display = 'block';

  announceToScreenReader(`已选中：${d.title}，${typeLabels[d.group] || '想法'}`);
}

function selectLink(l: any) {
  selectedLink = l;
  selectedNode = null;

  nodeGroup.selectAll('.node').classed('active-selected', false);

  const sId = l.source.id || l.source;
  const tId = l.target.id || l.target;

  linkGroup.selectAll('line').classed('active-selected-link', (d: any) => {
    const currSId = d.source.id || d.source;
    const currTId = d.target.id || d.target;
    return currSId === sId && currTId === tId;
  });

  const detailCard = document.getElementById('detail-card');
  const typeEl = document.getElementById('detail-type');
  const titleEl = document.getElementById('detail-title');
  const tipEl = document.getElementById('detail-tip');
  const delNodeBtn = document.getElementById('btn-delete-selected');
  const delLinkBtn = document.getElementById('btn-delete-link');
  const crossActions = document.getElementById('detail-cross-actions');

  if (typeEl) typeEl.innerText = '连线 / Connection';

  const sTitle = l.source.title || sId;
  const tTitle = l.target.title || tId;
  if (titleEl) titleEl.innerText = `${sTitle} ↔ ${tTitle}`;
  if (tipEl) tipEl.innerText = '代表想法间的知识关联网络';

  if (delNodeBtn) delNodeBtn.style.display = 'none';
  if (delLinkBtn) delLinkBtn.style.display = 'inline-block';
  if (crossActions) crossActions.style.display = 'none';
  if (detailCard) detailCard.style.display = 'block';

  announceToScreenReader(`已选中连线：${sTitle} 到 ${tTitle}`);
}

function clearSelection() {
  selectedNode = null;
  selectedLink = null;
  nodeGroup.selectAll('.node').classed('active-selected', false);
  linkGroup.selectAll('line').classed('active-selected-link', false);
  const detailCard = document.getElementById('detail-card');
  if (detailCard) detailCard.style.display = 'none';
  announceToScreenReader('已取消选择');
}

function resetLinkEndpoints() {
  linkSourceNode = null;
  linkTargetNode = null;
  const sourceLabel = document.getElementById('link-source-label');
  const targetLabel = document.getElementById('link-target-label');
  if (sourceLabel) sourceLabel.textContent = '起点: 未选择';
  if (targetLabel) targetLabel.textContent = '终点: 未选择';
}

function focusOnNode(d: any) {
  const scale = 1.3;
  const x = width / 2 - d.x * scale;
  const y = height / 2 - d.y * scale;

  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity.translate(x, y).scale(scale));

  selectNode(d);
}

// ── 键盘导航：方向键在可见节点间移动 ──
svg.on('keydown', (event: KeyboardEvent) => {
  if (!selectedNode && !selectedLink) return;
  if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Escape'].includes(event.key)) return;

  if (event.key === 'Escape') {
    event.preventDefault();
    clearSelection();
    announceToScreenReader('已取消选择节点');
    return;
  }

  event.preventDefault();
  const current = selectedNode;
  if (!current) return;

  // 找出所有非 dimmed 的可见节点
  const visibleNodes = nodeGroup
    .selectAll('.node')
    .filter(function (this: Element) {
      return !this.classList.contains('dimmed');
    })
    .data();

  if (visibleNodes.length === 0) return;

  // 找几何距离最近的可见节点（排除自身）
  const others = visibleNodes.filter((n: any) => n.id !== current.id);
  if (others.length === 0) return;

  // 根据方向键偏置目标方向
  const angleMap: Record<string, number> = {
    ArrowUp: -Math.PI / 2,
    ArrowDown: Math.PI / 2,
    ArrowLeft: Math.PI,
    ArrowRight: 0,
  };
  const angle = angleMap[event.key];
  const offsetX = Math.cos(angle) * 200;
  const offsetY = Math.sin(angle) * 200;
  const targetX = (current.x || 0) + offsetX;
  const targetY = (current.y || 0) + offsetY;

  let nearest = others[0];
  let minDist = Infinity;
  for (const n of others) {
    const dx = (n.x || 0) - targetX;
    const dy = (n.y || 0) - targetY;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      nearest = n;
    }
  }

  focusOnNode(nearest);
  announceToScreenReader(`${nearest.title}，${typeLabels[nearest.group] || '想法'}`);
});

// ── 屏幕阅读器播报 ──
function announceToScreenReader(msg: string) {
  const announcer = document.getElementById('aria-announcer');
  if (announcer) {
    announcer.textContent = '';
    // 触发重新播报需要清空再设置
    requestAnimationFrame(() => {
      announcer.textContent = msg;
    });
  }
}

function dragstarted(event: any, d: any) {
  if (!event.active) simulation.alphaTarget(0.3).restart();
  d.fx = d.x;
  d.fy = d.y;
}

function dragged(event: any, d: any) {
  d.fx = event.x;
  d.fy = event.y;
}

function dragended(event: any, d: any) {
  if (!event.active) simulation.alphaTarget(0);
  d.fx = null;
  d.fy = null;
}

function setupInteractionListeners() {
  document.getElementById('btn-mode-view')?.addEventListener('click', () => {
    switchToView();
  });
  document.getElementById('btn-mode-sandbox')?.addEventListener('click', () => {
    switchToSandbox();
  });

  document.getElementById('btn-add-node')?.addEventListener('click', () => {
    const titleInput = document.getElementById('node-title-input') as HTMLInputElement | null;
    const groupInput = document.getElementById('node-group-input') as HTMLSelectElement | null;
    const title = titleInput?.value.trim();
    const group = groupInput?.value || 'notes';
    if (!title) return alert('请输入想法或节点名称');

    const id = `sandbox-${group}-${Date.now()}`;
    const x = width / 2 + (Math.random() - 0.5) * 50;
    const y = height / 2 + (Math.random() - 0.5) * 50;

    nodes.push({
      id,
      title,
      group,
      x,
      y,
      vx: 0,
      vy: 0,
    });

    if (titleInput) titleInput.value = '';
    updateGraph();

    const newNode = nodes.find((n) => n.id === id);
    if (newNode) {
      setTimeout(() => focusOnNode(newNode), 100);
    }
  });

  document.getElementById('btn-set-source')?.addEventListener('click', () => {
    if (!selectedNode) return alert('请在图谱中选中一个节点作为连线起点');
    linkSourceNode = selectedNode;
    const lbl = document.getElementById('link-source-label');
    if (lbl) lbl.innerText = `起点: ${selectedNode.title}`;
  });

  document.getElementById('btn-set-target')?.addEventListener('click', () => {
    if (!selectedNode) return alert('请在图谱中选中一个节点作为连线终点');
    linkTargetNode = selectedNode;
    const lbl = document.getElementById('link-target-label');
    if (lbl) lbl.innerText = `终点: ${selectedNode.title}`;
  });

  document.getElementById('btn-create-link')?.addEventListener('click', () => {
    if (
      (linkSourceNode && !nodes.includes(linkSourceNode)) ||
      (linkTargetNode && !nodes.includes(linkTargetNode))
    )
      resetLinkEndpoints();
    if (!linkSourceNode || !linkTargetNode) return alert('需要同时设置连线的起点和终点端点');
    if (linkSourceNode.id === linkTargetNode.id) return alert('同一个节点不能自我循环连接');

    const sId = linkSourceNode.id;
    const tId = linkTargetNode.id;

    const exists = links.some((l: any) => {
      const currS = l.source.id || l.source;
      const currT = l.target.id || l.target;
      return (currS === sId && currT === tId) || (currS === tId && currT === sId);
    });

    if (exists) return alert('这两个想法之间已存在连线');

    links.push({ source: sId, target: tId });

    resetLinkEndpoints();

    updateGraph();
  });

  document.getElementById('btn-delete-selected')?.addEventListener('click', () => {
    if (!selectedNode) return;
    if (confirm(`确定要在思维沙盒中删除节点「${selectedNode.title}」及其关联的全部线段吗？`)) {
      const nodeId = selectedNode.id;
      nodes = nodes.filter((n) => n.id !== nodeId);
      links = links.filter((l: any) => {
        const sId = l.source.id || l.source;
        const tId = l.target.id || l.target;
        return sId !== nodeId && tId !== nodeId;
      });
      clearSelection();
      updateGraph();
    }
  });

  document.getElementById('btn-delete-link')?.addEventListener('click', () => {
    if (!selectedLink) return;
    if (confirm('确定要断开此关联吗？')) {
      const sId = (selectedLink.source as any).id || selectedLink.source;
      const tId = (selectedLink.target as any).id || selectedLink.target;

      links = links.filter((l: any) => {
        const currS = l.source.id || l.source;
        const currT = l.target.id || l.target;
        return !(currS === sId && currT === tId);
      });
      clearSelection();
      updateGraph();
    }
  });

  document.getElementById('btn-load-garden')?.addEventListener('click', () => {
    if (confirm('这会清空沙盒当前的修改，并重新导入思维花园的默认模版，是否继续？')) {
      nodes = JSON.parse(JSON.stringify(originalGardenData.nodes));
      links = JSON.parse(JSON.stringify(originalGardenData.links));
      clearSelection();
      updateGraph();
    }
  });

  document.getElementById('btn-clear-all')?.addEventListener('click', () => {
    if (confirm('确定要清除画布上全部的想法和连线，从空白网格开始构建吗？')) {
      nodes = [];
      links = [];
      clearSelection();
      updateGraph();
    }
  });

  document.getElementById('btn-export-json')?.addEventListener('click', () => {
    const cleanNodes = nodes.map((n) => ({
      id: n.id,
      title: n.title,
      group: n.group,
      url: n.url || '',
    }));
    const cleanLinks = links.map((l: any) => ({
      source: l.source.id || l.source,
      target: l.target.id || l.target,
    }));

    const dataStr =
      'data:text/json;charset=utf-8,' +
      encodeURIComponent(JSON.stringify({ nodes: cleanNodes, links: cleanLinks }, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `newmaybe-mindmap-${Date.now()}.json`);
    dlAnchor.click();
  });

  document.getElementById('import-json-file')?.addEventListener('change', (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e: any) => {
      try {
        const data = parseGardenData(JSON.parse(e.target.result));
        nodes = data.nodes.map((node) => ({
          ...node,
          x: width / 2 + (Math.random() - 0.5) * 120,
          y: height / 2 + (Math.random() - 0.5) * 120,
        }));
        links = data.links;
        clearSelection();
        updateGraph();
        alert('沙盒网络导入成功！');
      } catch (err: any) {
        alert('解析 JSON 失败: ' + err.message);
      }
    };
    reader.readAsText(file);
  });

  const searchInput = document.getElementById('graph-search') as HTMLInputElement | null;
  const clearSearchBtn = document.getElementById('search-clear-btn');

  searchInput?.addEventListener('input', (e: any) => {
    const query = e.target.value.trim().toLowerCase();
    if (query) {
      if (clearSearchBtn) clearSearchBtn.style.display = 'block';
      nodeGroup
        .selectAll('.node')
        .classed('dimmed', (n: any) => !n.title.toLowerCase().includes(query));
      linkGroup.selectAll('line').classed('highlighted', false);
    } else {
      if (clearSearchBtn) clearSearchBtn.style.display = 'none';
      nodeGroup.selectAll('.node').classed('dimmed', false);
    }
  });

  clearSearchBtn?.addEventListener('click', () => {
    if (searchInput) searchInput.value = '';
    clearSearchBtn.style.display = 'none';
    nodeGroup.selectAll('.node').classed('dimmed', false);
  });

  searchInput?.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      const query = (e.target as HTMLInputElement).value.trim().toLowerCase();
      if (!query) return;
      const match = nodes.find((n) => n.title.toLowerCase().includes(query));
      if (match) {
        focusOnNode(match);
      }
    }
  });

  document.getElementById('slider-link-dist')?.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    const valEl = document.getElementById('val-link-dist');
    if (valEl) valEl.innerText = String(val);
    simulation.force('link').distance(val);
    simulation.alpha(0.1).restart();
  });

  document.getElementById('slider-charge')?.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    const valEl = document.getElementById('val-charge');
    if (valEl) valEl.innerText = String(val);
    simulation.force('charge').strength(-val);
    simulation.alpha(0.1).restart();
  });

  document.getElementById('slider-collision')?.addEventListener('input', (e: any) => {
    const val = parseInt(e.target.value);
    const valEl = document.getElementById('val-collision');
    if (valEl) valEl.innerText = String(val);
    simulation.force(
      'collision',
      d3.forceCollide().radius((d: any) => (nodeRadii[d.group] || 10) + val - 25),
    );
    simulation.alpha(0.1).restart();
  });

  setupGraphExport();

  document.getElementById('btn-send-to-card')?.addEventListener('click', () => {
    if (!selectedNode) return;
    window.open(
      `${resolveSubdomain('https://studio.newmaybe.com')}?content=${encodeURIComponent(selectedNode.title)}`,
      '_blank',
    );
  });

  document.getElementById('btn-send-to-studio')?.addEventListener('click', () => {
    if (!selectedNode) return;
    window.open(
      `${resolveSubdomain('https://studio.newmaybe.com')}?quote=${encodeURIComponent(selectedNode.title)}`,
      '_blank',
    );
  });

  const observer = new MutationObserver(() => {
    nodeGroup
      .selectAll('circle')
      .attr('fill', (d: any) => (colors[d.group] ? colors[d.group]() : getThemeColor('--ochre')));
  });
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class'],
  });
}

function switchToSandbox() {
  switchToSandboxStateUI();
  updateGraph();
}

function switchToView() {
  switchToViewStateUI();
  nodes = JSON.parse(JSON.stringify(originalGardenData.nodes));
  links = JSON.parse(JSON.stringify(originalGardenData.links));
  clearSelection();
  updateGraph();
}

function switchToSandboxStateUI() {
  currentMode = 'sandbox';

  const btnView = document.getElementById('btn-mode-view');
  if (btnView) {
    btnView.classList.remove('active');
    btnView.setAttribute('aria-selected', 'false');
    btnView.style.background = 'transparent';
    btnView.style.color = 'var(--ink-soft)';
  }

  const btnSandbox = document.getElementById('btn-mode-sandbox');
  if (btnSandbox) {
    btnSandbox.classList.add('active');
    btnSandbox.setAttribute('aria-selected', 'true');
    btnSandbox.style.background = 'var(--paper-deep)';
    btnSandbox.style.color = 'var(--ink)';
  }

  const sbControls = document.getElementById('sandbox-controls');
  if (sbControls) sbControls.style.display = 'flex';
  if (selectedNode) {
    const delBtn = document.getElementById('btn-delete-selected');
    if (delBtn) delBtn.style.display = 'inline-block';
  }
}

function switchToViewStateUI() {
  currentMode = 'view';

  const btnSandbox = document.getElementById('btn-mode-sandbox');
  if (btnSandbox) {
    btnSandbox.classList.remove('active');
    btnSandbox.setAttribute('aria-selected', 'false');
    btnSandbox.style.background = 'transparent';
    btnSandbox.style.color = 'var(--ink-soft)';
  }

  const btnView = document.getElementById('btn-mode-view');
  if (btnView) {
    btnView.classList.add('active');
    btnView.setAttribute('aria-selected', 'true');
    btnView.style.background = 'var(--paper-deep)';
    btnView.style.color = 'var(--ink)';
  }

  const sbControls = document.getElementById('sandbox-controls');
  const delNodeBtn = document.getElementById('btn-delete-selected');
  const delLinkBtn = document.getElementById('btn-delete-link');
  if (sbControls) sbControls.style.display = 'none';
  if (delNodeBtn) delNodeBtn.style.display = 'none';
  if (delLinkBtn) delLinkBtn.style.display = 'none';
}

function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const addNodeParam = params.get('add_node');
  if (addNodeParam) {
    switchToSandboxStateUI();

    const text = addNodeParam;
    const id = `sandbox-notes-${Date.now()}`;
    const x = width / 2;
    const y = height / 2;

    nodes.push({
      id,
      title: text,
      group: 'notes',
      x,
      y,
      vx: 0,
      vy: 0,
    });

    window.history.replaceState({}, document.title, window.location.pathname);

    setTimeout(() => {
      const match = nodes.find((n) => n.id === id);
      if (match) focusOnNode(match);
    }, 150);
  }
}

// 初始化获取数据并启动仿真
d3.json('/graph-data.json').then((raw: unknown) => {
  const data = parseGardenData(raw);
  originalGardenData = JSON.parse(JSON.stringify(data));
  nodes = JSON.parse(JSON.stringify(data.nodes));
  links = JSON.parse(JSON.stringify(data.links));

  simulation = d3
    .forceSimulation(nodes)
    .force(
      'link',
      d3
        .forceLink(links)
        .id((d: any) => d.id)
        .distance(120),
    )
    .force('charge', d3.forceManyBody().strength(-240))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force(
      'collision',
      d3.forceCollide().radius((d: any) => (nodeRadii[d.group] || 10) + 25),
    );

  populateNodeList();
  checkUrlParams();
  updateGraph();
  setupInteractionListeners();
});
