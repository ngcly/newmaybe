export type GraphGroup = 'posts' | 'notes' | 'memories' | 'excerpts' | 'fragments' | string;

export interface GraphNode {
  id: string;
  title: string;
  group: GraphGroup;
  url?: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
}

export interface GardenData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export type GraphMode = 'view' | 'sandbox';
