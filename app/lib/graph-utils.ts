import { NetworkEdge, NetworkNode } from './types';

/** Get all adjacency edges incident to a given node ID */
export function getEgoEdges(edges: NetworkEdge[], nodeId: string): NetworkEdge[] {
  return edges.filter((e) => e.source === nodeId || e.target === nodeId);
}

/** Get all backbone edges incident to a node's community */
export function getCommunityBackboneEdges(
  backboneEdges: NetworkEdge[],
  nodes: NetworkNode[],
  nodeId: string
): NetworkEdge[] {
  const node = nodes.find((n) => n.id === nodeId);
  if (!node) return [];
  const commNodes = new Set(
    nodes.filter((n) => n.community === node.community).map((n) => n.id)
  );
  return backboneEdges.filter(
    (e) => commNodes.has(e.source) && commNodes.has(e.target)
  );
}

/** Compute bounding box of node coordinates */
export function getBounds(nodes: NetworkNode[]) {
  const xs = nodes.map((n) => n.x);
  const ys = nodes.map((n) => n.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Map raw R coordinates into SVG space.
 *
 * nodeRadius uses the igraph-accurate formula:
 *   igraph draws vertex with radius = vertex.size / 200  (in layout coordinate units)
 *   We convert that to SVG pixels using the same scale factor as the positions.
 */
export function makeScales(
  nodes: NetworkNode[],
  svgWidth: number,
  svgHeight: number,
  padding = 80
) {
  const bounds = getBounds(nodes);
  const rangeX = bounds.maxX - bounds.minX || 1;
  const rangeY = bounds.maxY - bounds.minY || 1;
  const scale = Math.min(
    (svgWidth - padding * 2) / rangeX,
    (svgHeight - padding * 2) / rangeY
  );
  const offsetX = (svgWidth - rangeX * scale) / 2 - bounds.minX * scale;
  const offsetY = (svgHeight - rangeY * scale) / 2 - bounds.minY * scale;

  return {
    // R uses y-up; SVG uses y-down — flip y to match PDF orientation
    x: (raw: number) => raw * scale + offsetX,
    y: (raw: number) => svgHeight - (raw * scale + offsetY),
    // igraph: radius_in_coords = vertex.size / 200 → radius_in_px = (vertex.size/200) * scale
    nodeRadius: (size: number) => Math.max((size / 200) * scale, 2),
  };
}
