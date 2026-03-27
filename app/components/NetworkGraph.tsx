'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as d3 from 'd3';
import { NetworkData, NetworkNode } from '../lib/types';
import { makeScales, getEgoEdges } from '../lib/graph-utils';
import { ZOOM_DURATION_MS, FOCUSED_SCALE } from '../lib/constants';

interface Props {
  data: NetworkData;
  selectedId: string | null;
  onNodeClick?: (id: string) => void;
}

const SVG_W = 1200;
const SVG_H = 680;

// Spring easing for the clicked node's bounce-back
const ELASTIC_CLICK = d3.easeElasticOut.amplitude(1.15).period(0.5);

export default function NetworkGraph({ data, selectedId, onNodeClick }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const selectedIdRef = useRef<string | null>(selectedId);
  selectedIdRef.current = selectedId;

  const scales = makeScales(data.nodes, SVG_W, SVG_H, 80);

  // Pre-computed pixel coords per node ID
  const nodeCoords = useRef<Map<string, { cx: number; cy: number }>>(new Map());
  data.nodes.forEach((n) => {
    nodeCoords.current.set(n.id, { cx: scales.x(n.x), cy: scales.y(n.y) });
  });

  // ── Initial render ──────────────────────────────────────────────────────────
  useEffect(() => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'graph-root');
    gRef.current = g.node();

    const edgeLayer = g.append('g').attr('class', 'edges-adjacency');
    const backboneLayer = g.append('g').attr('class', 'edges-backbone');
    const nodeLayer = g.append('g').attr('class', 'nodes');

    // Adjacency edges (invisible until selection)
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
      .attr('stroke', '#111')
      .attr('stroke-opacity', 0)
      .attr('stroke-width', 0.6);

    // Backbone edges (always visible) — dark, thin
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
      .attr('stroke', '#111')
      .attr('stroke-opacity', 0.55)
      .attr('stroke-width', 1.0);

    // Build community membership map for hover
    const communityMap = new Map<string, string>();
    data.nodes.forEach((n) => communityMap.set(n.id, n.community));

    // Nodes — outer group is the fixed anchor (edge endpoints don't move)
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

    // Repel group — receives cursor proximity push via CSS transform
    const repelGroups = nodeGroups
      .append('g')
      .attr('class', 'node-repel');

    // Inner wobble group — only visuals bob, edge anchors stay fixed
    const wobbleGroups = repelGroups
      .append('g')
      .attr('class', 'node-wobble')
      .style('animation-delay', (_, i) => `${-(i * 0.41).toFixed(2)}s`);

    wobbleGroups
      .append('circle')
      .attr('class', 'node-circle')
      .attr('r', (d) => scales.nodeRadius(d.size))
      .attr('fill', (d) => d.communityHex)
      .attr('stroke', 'none')
      .attr('stroke-width', 0);

    wobbleGroups
      .append('circle')
      .attr('class', 'node-ring')
      .attr('r', (d) => scales.nodeRadius(d.size) + 5)
      .attr('fill', 'none')
      .attr('stroke', '#1a1612')
      .attr('stroke-width', 0)
      .attr('opacity', 0);

    wobbleGroups
      .append('circle')
      .attr('class', 'node-hit')
      .attr('r', (d) => scales.nodeRadius(d.size) + 8)
      .attr('fill', 'transparent')
      .attr('stroke', 'none');

    // ── Hover: highlight community constellation ──
    nodeGroups
      .on('mouseenter', function (_, d) {
        if (d.id === selectedIdRef.current) return;
        const hoveredCommunity = d.community;

        d3.select(this).select('.node-wobble').style('transform', 'scale(1.18)');

        svg.selectAll<SVGGElement, NetworkNode>('g.node').each(function (nd) {
          if (nd.community !== hoveredCommunity) {
            d3.select(this).transition('dim').duration(200).style('opacity', '0.12');
          }
        });

        svg.selectAll<SVGLineElement, { source: string; target: string }>('line.backbone')
          .transition('dim').duration(200)
          .attr('stroke-opacity', (ed) => {
            const sc = communityMap.get(ed.source);
            const tc = communityMap.get(ed.target);
            return sc === hoveredCommunity && tc === hoveredCommunity ? 0.7 : 0.05;
          });
      })
      .on('mouseleave', function (_, d) {
        if (d.id === selectedIdRef.current) return;
        d3.select(this).select('.node-wobble').style('transform', '');

        svg.selectAll<SVGGElement, NetworkNode>('g.node')
          .transition('dim').duration(300).style('opacity', '1');

        svg.selectAll<SVGLineElement, unknown>('line.backbone')
          .transition('dim').duration(300)
          .attr('stroke-opacity', 0.55);
      });

    // ── Press + shockwave ──
    nodeGroups
      .on('mousedown touchstart', function (event, d) {
        if (event.type === 'touchstart') event.preventDefault();
        const c = nodeCoords.current.get(d.id)!;
        d3.select(this)
          .interrupt('wave')
          .transition('wave').duration(450).ease(d3.easeCubicOut)
          .attr('transform', `translate(${c.cx},${c.cy}) scale(0.80)`);
      })
      .on('mouseup touchend', function (event, d) {
        const c = nodeCoords.current.get(d.id)!;

        // Bounce clicked node back
        d3.select(this)
          .interrupt('wave')
          .transition('wave').duration(950).ease(ELASTIC_CLICK)
          .attr('transform', `translate(${c.cx},${c.cy})`);

        // Ripple outward to ALL nodes — push magnitude falls off exponentially,
        // delay is proportional to distance so the wave propagates at constant speed.
        // Movement is slow and viscous — like a ball suspended in water.
        const WAVE_SPEED = 0.7;  // px per ms — wave propagation speed
        const PUSH_BASE  = 20;   // max push (px) at the epicentre
        const FALLOFF    = 220;  // exponential decay constant (px)
        const PUSH_MS    = 750;  // how long the outward drift takes
        const RETURN_MS  = 740;  // nearly matches the push so the return feels liquid
        const TOTAL_WAVE_MS = PUSH_MS + RETURN_MS;
        const OUTWARD_SHARE = PUSH_MS / TOTAL_WAVE_MS;

        svg.selectAll<SVGGElement, NetworkNode>('g.node').each(function (nd) {
          if (nd.id === d.id) return;
          const nc = nodeCoords.current.get(nd.id)!;
          const dx = nc.cx - c.cx;
          const dy = nc.cy - c.cy;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const pushMag = PUSH_BASE * Math.exp(-dist / FALLOFF);
          if (pushMag < 0.3) return;

          const px = (dx / dist) * pushMag;
          const py = (dy / dist) * pushMag;
          const delay = dist / WAVE_SPEED;

          d3.select(this)
            .interrupt('wave')
            // Use one continuous tween so the reversal does not inherit a visible handoff pause.
            .transition('wave').delay(delay).duration(TOTAL_WAVE_MS).ease(d3.easeLinear)
            .attrTween('transform', () => (t) => {
              const waveT = t < OUTWARD_SHARE
                ? d3.easeQuadOut(t / OUTWARD_SHARE)
                : 1 - d3.easeSinOut((t - OUTWARD_SHARE) / (1 - OUTWARD_SHARE));

              return `translate(${nc.cx + px * waveT},${nc.cy + py * waveT})`;
            });
        });
      })
      // Restore if pointer leaves or touch is cancelled while held down
      .on('mouseleave.press touchcancel', function (_, d) {
        const c = nodeCoords.current.get(d.id)!;
        d3.select(this)
          .interrupt('wave')
          .transition('wave').duration(500).ease(d3.easeCubicOut)
          .attr('transform', `translate(${c.cx},${c.cy})`);
      });

    // ── Zoom (programmatic only) ──
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 14])
      .on('zoom', (event) => { g.attr('transform', event.transform); });

    svg.call(zoom)
      .on('wheel.zoom', null)
      .on('mousedown.zoom', null)
      .on('touchstart.zoom', null)
      .on('touchmove.zoom', null)
      .on('dblclick.zoom', null);

    zoomRef.current = zoom;

    // ── Cursor repulsion ────────────────────────────────────────────────────
    const REPEL_RADIUS = 100; // SVG user units
    const REPEL_MAX    = 10;  // max push in SVG user units

    svg.on('mousemove.repel', (event) => {
      const svgEl = svgRef.current!;
      const t = d3.zoomTransform(svgEl);
      const [mx, my] = t.invert(d3.pointer(event, svgEl));

      repelGroups.each(function (d) {
        const c = nodeCoords.current.get(d.id)!;
        const dx = c.cx - mx;
        const dy = c.cy - my;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const nodeR = scales.nodeRadius(d.size);
        // Only repel when cursor is outside the node but within the influence radius
        if (dist > nodeR && dist < REPEL_RADIUS) {
          const mag = REPEL_MAX * Math.pow(1 - dist / REPEL_RADIUS, 1.5);
          const rx = (dx / dist) * mag;
          const ry = (dy / dist) * mag;
          d3.select(this).style('transform', `translate(${rx.toFixed(2)}px,${ry.toFixed(2)}px)`);
        } else {
          d3.select(this).style('transform', null);
        }
      });
    }).on('mouseleave.repel', () => {
      repelGroups.style('transform', null);
    });

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data]);

  // ── Programmatic zoom to selected node ──────────────────────────────────────
  const zoomToNode = useCallback(
    (nodeId: string | null) => {
      const svg = d3.select(svgRef.current!);
      const zoom = zoomRef.current;
      if (!zoom) return;

      if (!nodeId) {
        svg.transition().duration(ZOOM_DURATION_MS).ease(d3.easeCubicInOut).call(
          zoom.transform, d3.zoomIdentity
        );
        svg.selectAll<SVGLineElement, unknown>('line.adj')
          .transition().duration(400).attr('stroke-opacity', 0);
        svg.selectAll<SVGGElement, NetworkNode>('g.node').each(function (d) {
          d3.select(this).select('.node-ring').attr('stroke-width', 0).attr('opacity', 0);
          d3.select(this).select('.node-circle').attr('stroke', 'none').attr('stroke-width', 0);
        });
        return;
      }

      const coords = nodeCoords.current.get(nodeId);
      if (!coords) return;

      // On mobile the graph is constrained to 45dvh (a fixed-height container),
      // so SVG_H/2 centres the node correctly within that area.
      // Use a gentler zoom scale so the node doesn't fill the whole small area.
      const containerW = svgRef.current!.getBoundingClientRect().width || SVG_W;
      const isMobile = containerW < 640;
      const focusScale = isMobile ? 2.8 : FOCUSED_SCALE;
      const centerY = SVG_H / 2;

      const tx = SVG_W / 2 - coords.cx * focusScale;
      const ty = centerY - coords.cy * focusScale;

      svg.transition().duration(ZOOM_DURATION_MS).ease(d3.easeCubicInOut).call(
        zoom.transform,
        d3.zoomIdentity.translate(tx, ty).scale(focusScale)
      );

      const egoSet = new Set(
        getEgoEdges(data.edges, nodeId).flatMap((e) => [
          `${e.source}-${e.target}`, `${e.target}-${e.source}`,
        ])
      );
      svg.selectAll<SVGLineElement, { source: string; target: string }>('line.adj')
        .transition().delay(700).duration(600)
        .attr('stroke-opacity', (d) =>
          egoSet.has(`${d.source}-${d.target}`) ? 0.18 : 0
        );

      svg.selectAll<SVGGElement, NetworkNode>('g.node').each(function (d) {
        const isSelected = d.id === nodeId;
        d3.select(this).select('.node-ring')
          .attr('stroke-width', isSelected ? 2 : 0)
          .attr('opacity', isSelected ? 1 : 0);
        d3.select(this).select('.node-circle')
          .attr('stroke', isSelected ? '#1a1612' : 'none')
          .attr('stroke-width', isSelected ? 2 : 0);
      });
    },
    [data]
  );

  useEffect(() => { zoomToNode(selectedId); }, [selectedId, zoomToNode]);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="w-full h-full"
      style={{ overflow: 'visible' }}
    />
  );
}
