import { describe, expect, it } from 'vitest';
import { parseGardenData } from './graph-data';

const node = { id: 'notes/a', title: '想法', group: 'notes' };
describe('graph import boundary', () => {
  it('accepts valid graphs and strips simulation coordinates', () => {
    expect(parseGardenData({ nodes: [{ ...node, x: 123 }], links: [] }).nodes[0]).toEqual({
      ...node,
      url: '',
    });
  });
  it.each([
    { nodes: [node, node], links: [] },
    { nodes: [node], links: [{ source: node.id, target: 'missing' }] },
    { nodes: [{ ...node, url: 'javascript:alert(1)' }], links: [] },
    { nodes: [{ ...node, title: {} }], links: [] },
  ])('rejects invalid or unsafe imports', (data) => expect(() => parseGardenData(data)).toThrow());
});
