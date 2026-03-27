export interface NetworkNode {
  id: string;
  x: number;
  y: number;
  community: string;
  communityHex: string;
  size: number;
  description: string;
  matchId: string | null;
  degree: number;
  isSpecial: boolean;
}

export interface NetworkEdge {
  source: string;
  target: string;
}

export interface Community {
  name: string;
  hex: string;
}

export interface NetworkMeta {
  nodeCount: number;
  edgeCount: number;
  communityCount: number;
  seed: number;
  rotation: number;
  stretchX: number;
  stretchY: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  backboneEdges: NetworkEdge[];
  communities: Community[];
  meta: NetworkMeta;
}
