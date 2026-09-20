import type { GardenData, GraphNode, GraphLink } from './graph-types';

// Imported files and network data cross a runtime boundary before reaching D3.
export function parseGardenData(value: unknown): GardenData {
  if (!value || typeof value !== 'object') throw new Error('图谱必须为对象');
  const data = value as Record<string, unknown>;
  if (!Array.isArray(data.nodes) || !Array.isArray(data.links))
    throw new Error('图谱必须包含 nodes 和 links');
  if (data.nodes.length > 2000 || data.links.length > 10000) throw new Error('图谱过大');
  const ids = new Set<string>();
  const nodes: GraphNode[] = data.nodes.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('节点格式错误');
    const n = raw as Record<string, unknown>;
    if (
      typeof n.id !== 'string' ||
      !n.id ||
      typeof n.title !== 'string' ||
      !n.title ||
      typeof n.group !== 'string' ||
      !n.group ||
      ids.has(n.id)
    )
      throw new Error('节点字段缺失或 ID 重复');
    ids.add(n.id);
    let url = '';
    if (typeof n.url === 'string' && n.url) {
      const parsed = new URL(n.url, 'https://newmaybe.com');
      if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:')
        throw new Error('节点链接必须为 HTTP(S)');
      url = parsed.href;
    }
    return { id: n.id, title: n.title, group: n.group, url };
  });
  const links: GraphLink[] = data.links.map((raw: unknown) => {
    if (!raw || typeof raw !== 'object') throw new Error('连线格式错误');
    const l = raw as Record<string, unknown>;
    if (
      typeof l.source !== 'string' ||
      typeof l.target !== 'string' ||
      !ids.has(l.source) ||
      !ids.has(l.target)
    )
      throw new Error('连线引用不存在的节点');
    return { source: l.source, target: l.target };
  });
  return { nodes, links };
}
