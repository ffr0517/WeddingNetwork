'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkData, NetworkNode } from '../lib/types';
import { makeScales, getEgoEdges, getCommunityBackboneEdges } from '../lib/graph-utils';
import { ZOOM_DURATION_MS, FOCUSED_SCALE, COMMUNITY_GLOW } from '../lib/constants';

interface Props {
  data: NetworkData;
  selectedId: string | null;
  darkMode: boolean;
  onNodeClick?: (id: string) => void;
}

const SVG_W = 1200;
const SVG_H = 680;

export default function NetworkGraph({ data, selectedId, darkMode, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);

  const scales = makeScales(data.nodes, SVG_W, SVG_H, 80);

  // Memoised pixel coords per node ID
  const nodeCoords = useRef<Map<string, { cx: number; cy: number }>>(new Map());
  data.nodes.forEach((n) => {
    nodeCoords.current.set(n.id, { cx: scales.x(n.x), cy: scales.y(n.y) });
  });

  // ── Initial render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');

    // Glow filter for dark mode nodes
    data.nodes.forEach((node) => {
      const glowColor = COMMUNITY_GLOW[node.community] ?? node.communityHex;
      const filter = defs.append('filter').attr('id', `glow-${node.id}`);
      filter.append('feGaussianBlur').attr('stdDeviation', '3').attr('result', 'coloredBlur');
      const merge = filter.append('feMerge');
      merge.append('feMergeNode').attr('in', 'coloredBlur');
      merge.append('feMergeNode').attr('in', 'SourceGraphic');
      // Tint
      defs.append('radialGradient')
        .attr('id', `radial-${node.id}`)
        .selectAll('stop')
        .data([
          { offset: '0%', color: glowColor, opacity: 1 },
          { offset: '100%', color: node.communityHex, opacity: 0.7 },
        ])
        .enter()
        .append('stop')
        .attr('offset', (d) => d.offset)
        .attr('stop-color', (d) => d.color)
        .attr('stop-opacity', (d) => d.opacity);
    });

    const g = svg.append('g').attr('class', 'graph-root');
    gRef.current = g.node();

    // ── Edge layers ──
    const edgeLayer = g.append('g').attr('class', 'edges-adjacency');
    const backboneLayer = g.append('g').attr('class', 'edges-backbone');
    const nodeLayer = g.append('g').attr('class', 'nodes');

    // Adjacency edges (invisible by default)
    edgeLayer
      .selectAll<SVGLineElement, (typeof data.edges)[0]>('line.adj')
      .data(data.edges, (d) => `${d.source}-${d.target}`)
      .enter()
      .append('line')
      .attr('class', 'adj')
      .attr('x1', (d) => nodeCoords.current.get(d.source)?.cx ?? 0)
      .attr('y1', (d) => nodeCoords.current.get(d.source)?.cy ?? 0)
      .attr('x2', (d) => nodeCoords.current.get(d.target)?.cx ?? 0)
      .attr('y2', (d) => nodeCoords.current.get(d.target)?.cy ?? 0)
      .attr('stroke', darkMode ? '#ffffff' : '#000000')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 1);

    // Backbone edges (always visible, solid)
    backboneLayer
      .selectAll<SVGLineElement, (typeof data.backboneEdges)[0]>('line.backbone')
      .data(data.backboneEdges, (d) => `${d.source}-${d.target}`)
      .enter()
      .append('line')
      .attr('class', 'backbone')
      .attr('x1', (d) => nodeCoords.current.get(d.source)?.cx ?? 0)
      .attr('y1', (d) => nodeCoords.current.get(d.source)?.cy ?? 0)
      .attr('x2', (d) => nodeCoords.current.get(d.target)?.cx ?? 0)
      .attr('y2', (d) => nodeCoords.current.get(d.target)?.cy ?? 0)
      .attr('stroke', darkMode ? '#e8e0d4' : '#111111')
      .attr('stroke-opacity', darkMode ? 0.5 : 0.6)
      .attr('stroke-width', 2.5);

    // Nodes
    const nodeGroups = nodeLayer
      .selectAll<SVGGElement, NetworkNode>('g.node')
      .data(data.nodes, (d) => d.id)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d) => {
        const c = nodeCoords.current.get(d.id)!;
        return `translate(${c.cx},${c.cy})`;
      })
      .style('cursor', 'pointer')
      .on('click', (_event, d) => onNodeClick?.(d.id));

    // Circle
    nodeGroups
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d) => scales.nodeRadius(d.size))
      .attr('fill', (d) =>
        darkMode ? `url(#radial-${d.id})` : d.communityHex
      )
      .attr('stroke', 'none')
      .attr('stroke-width', 0)
      .attr('filter', darkMode ? (d) => `url(#glow-${d.id})` : null);

    // Hover ring (invisible by default)
    nodeGroups
      .append('circle')
      .attr('class', 'node-ring')
      .attr('r', (d) => scales.nodeRadius(d.size) + 4)
      .attr('fill', 'none')
      .attr('stroke', darkMode ? '#e8e0d4' : '#111111')
      .attr('stroke-width', 0)
      .attr('opacity', 0);

    // Hover events
    nodeGroups
      .on('mouseenter', function (_, d) {
        if (d.id === selectedId) return;
        d3.select(this).select('.node-ring')
          .attr('stroke-width', 2)
          .attr('opacity', 0.5);
      })
      .on('mouseleave', function (_, d) {
        if (d.id === selectedId) return;
        d3.select(this).select('.node-ring')
          .attr('stroke-width', 0)
          .attr('opacity', 0);
      });

    // ── Zoom setup ──
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 12])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom).on('dblclick.zoom', null);
    zoomRef.current = zoom;

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, darkMode]);

  // ── Handle selection / zoom ─────────────────────────────────────────────────
  const zoomToNode = useCallback(
    (nodeId: string | null) => {
      const svg = d3.select(svgRef.current!);
      const zoom = zoomRef.current;
      if (!zoom) return;

      if (!nodeId) {
        // Reset
        svg.transition().duration(ZOOM_DURATION_MS).call(
          zoom.transform,
          d3.zoomIdentity
        );
        // Hide ego edges
        svg.selectAll<SVGLineElement, unknown>('line.adj')
          .transition().duration(400)
          .attr('stroke-opacity', 0);
        // Remove node highlights
        svg.selectAll<SVGCircleElement, unknown>('.node-ring')
          .attr('stroke-width', 0).attr('opacity', 0);
        svg.selectAll<SVGCircleElement, unknown>('.node-circle')
          .attr('stroke', 'none').attr('stroke-width', 0);
        return;
      }

      const coords = nodeCoords.current.get(nodeId);
      if (!coords) return;

      const tx = SVG_W / 2 - coords.cx * FOCUSED_SCALE;
      const ty = SVG_H / 2 - coords.cy * FOCUSED_SCALE;

      svg.transition().duration(ZOOM_DURATION_MS).ease(d3.easeCubicInOut).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(FOCUSED_SCALE)
      );

      // Ego edges: fade in after zoom starts
      const egoSet = new Set(
        getEgoEdges(data.edges, nodeId).flatMap((e) => [
          `${e.source}-${e.target}`,
          `${e.target}-${e.source}`,
        ])
      );

      svg.selectAll<SVGLineElement, { source: string; target: string }>('line.adj')
        .transition()
        .delay(600)
        .duration(500)
        .attr('stroke-opacity', (d) =>
          egoSet.has(`${d.source}-${d.target}`) ? 0.15 : 0
        );

      // Selected node ring
      svg.selectAll<SVGGElement, NetworkNode>('g.node')
        .each(function (d) {
          const isSelected = d.id === nodeId;
          d3.select(this).select('.node-ring')
            .attr('stroke-width', isSelected ? 3 : 0)
            .attr('opacity', isSelected ? 1 : 0);
          d3.select(this).select('.node-circle')
            .attr('stroke', isSelected ? (darkMode ? '#f0ece4' : '#111111') : 'none')
            .attr('stroke-width', isSelected ? 2.5 : 0);
        });
    },
    [data, darkMode]
  );

  useEffect(() => {
    zoomToNode(selectedId);
  }, [selectedId, zoomToNode]);

  // ── Update colors when darkMode changes ─────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll<SVGLineElement, unknown>('line.adj')
      .attr('stroke', darkMode ? '#ffffff' : '#000000');
    svg.selectAll<SVGLineElement, unknown>('line.backbone')
      .attr('stroke', darkMode ? '#e8e0d4' : '#111111')
      .attr('stroke-opacity', darkMode ? 0.5 : 0.6);
    svg.selectAll<SVGCircleElement, NetworkNode>('.node-circle')
      .attr('fill', (d) => darkMode ? `url(#radial-${d.id})` : d.communityHex)
      .attr('filter', darkMode ? (d: NetworkNode) => `url(#glow-${d.id})` : null);
  }, [darkMode]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    />
  );
}
