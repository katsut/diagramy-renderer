// Network graph renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawIconNode,
} from '../shared/render-utils.js';

interface NetworkNode {
  id: string;
  label: string;
  group?: string;
}

interface NetworkEdge {
  from: string;
  to: string;
  label?: string;
}

interface NetworkGraphData {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
}

function nodeColor(d: DesignPreset, groupOrIndex: number | string): string {
  const i = typeof groupOrIndex === 'string' ? 0 : groupOrIndex;
  return d.colors[i % d.colors.length]!;
}

export function renderNetworkGraph(data: NetworkGraphData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'card_flow') return renderCardFlow(data, title, d);
  if (style === 'arc') return renderArc(data, title, d);
  switch (d.id) {
    case 'sketch': return renderSketch(data, title, d);
    case 'pixel': return renderPixel(data, title, d);
    case 'bold': return renderBold(data, title, d);
    case 'flat': return renderFlat(data, title, d);
    case 'glass': return renderGlass(data, title, d);
    case 'neon': return renderNeon(data, title, d);
    case 'watercolor': return renderWatercolor(data, title, d);
    default: return renderClean(data, title, d);
  }
}

// --- Layout: nodes on a circle ---

interface NodePos { id: string; label: string; x: number; y: number; group: number; }

function layoutNodes(data: NetworkGraphData, cx: number, cy: number, radius: number): NodePos[] {
  const groups = [...new Set(data.nodes.map(n => n.group ?? ''))];
  return data.nodes.map((n, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / data.nodes.length;
    return {
      id: n.id, label: n.label,
      x: cx + radius * Math.cos(angle),
      y: cy + radius * Math.sin(angle),
      group: groups.indexOf(n.group ?? ''),
    };
  });
}

function findNode(positions: NodePos[], id: string): NodePos | undefined {
  return positions.find(p => p.id === id);
}

// ========== CLEAN ==========

function renderClean(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const nodeR = 28;
  const ringR = Math.max(100, data.nodes.length * 22);
  const size = (ringR + nodeR + 70) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph',
    buildColorGradients(d, data.nodes.length, 'ng'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  // Edges
  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: d.border, 'stroke-width': 1.5, opacity: 0.3,
    });
    if (edge.label) {
      svg.text(mx, my - 4, edge.label, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
    }
  }

  // Nodes
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    drawIconNode(svg, d, p.x, p.y, nodeR, color, `ng${i}`, '', 0);
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: 'white',
    });
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick borders, offset shadow, large numbered nodes

function renderBold(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const nodeR = 32;
  const ringR = Math.max(110, data.nodes.length * 24);
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (bold)',
    buildColorGradients(d, data.nodes.length, 'ng'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: d.border, 'stroke-width': 3, opacity: 0.4,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    svg.circle(p.x, p.y, nodeR, {
      fill: color, stroke: '#111', 'stroke-width': 3, filter: 'url(#bold-offset)',
    });
    svg.text(p.x, p.y - 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: '#FFFFFF',
    });
    const fit = fitText(p.label, nodeR * 2 + 10, 1, 11);
    svg.text(p.x, p.y + 14, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: minimal, no shadows, clean lines, label below node

function renderFlat(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const nodeR = 24;
  const ringR = Math.max(100, data.nodes.length * 22);
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: d.border, 'stroke-width': 1.5, opacity: 0.25,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    svg.circle(p.x, p.y, nodeR, { fill: color });
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: '#FFFFFF',
    });
    // Label below
    svg.text(p.x, p.y + nodeR + 14, p.label, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass nodes, glow effects

function renderGlass(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const nodeR = 30;
  const ringR = Math.max(110, data.nodes.length * 24);
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (glass)',
    buildColorGradients(d, data.nodes.length, 'ng'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: d.border, 'stroke-width': 1, opacity: 0.2,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    // Outer glow
    svg.circle(p.x, p.y, nodeR + 6, { fill: color, opacity: 0.08, filter: 'url(#shadow)' });
    // Frosted glass node
    svg.circle(p.x, p.y, nodeR, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, ...d.cardAttrs(),
    });
    // Top highlight
    svg.circle(p.x, p.y - nodeR / 3, nodeR * 0.6, { fill: color, opacity: 0.08 });
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600,
      fill: d.text, 'letter-spacing': '0.3',
    });
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outlines, glow effects

function renderNeon(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const nodeR = 28;
  const ringR = Math.max(100, data.nodes.length * 22);
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    const color = nodeColor(d, from.group);
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: color, 'stroke-width': 1, opacity: 0.3, filter: 'url(#neon-glow)',
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, i);  // index-based for multi-color neon
    // Dark filled circle with faint neon fill
    svg.circle(p.x, p.y, nodeR, { fill: color, opacity: 0.1 });
    // Neon outline
    svg.circle(p.x, p.y, nodeR, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, filter: 'url(#neon-glow)',
    });
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: color,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const nodeR = 28;
  const ringR = Math.max(100, data.nodes.length * 22);
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (watercolor)',
    buildColorGradients(d, data.nodes.length, 'ng'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.line(from.x, from.y, to.x, to.y, {
      stroke: d.border, 'stroke-width': 1.5, opacity: 0.25,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    // Watercolor wash blob
    svg.circle(p.x, p.y, nodeR + 8, { fill: color, opacity: 0.12, filter: 'url(#watercolor)' });
    // Soft node
    svg.circle(p.x, p.y, nodeR, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: d.text,
    });
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const nodeR = 24;
  const ringR = Math.max(90, data.nodes.length * 20);
  const size = (ringR + nodeR + 60) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.path(jitterLine(from.x, from.y, to.x, to.y, from.x + to.y), {
      fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.4,
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    svg.circle(p.x, p.y, nodeR, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    const fit = fitText(p.label, nodeR * 2 - 8, 1, 11);
    svg.text(p.x, p.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const nodeR = 20;
  const px = 3;
  const ringR = Math.max(80, data.nodes.length * 18);
  const size = (ringR + nodeR + 50) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    svg.line(Math.round(from.x), Math.round(from.y), Math.round(to.x), Math.round(to.y), {
      stroke: d.border, 'stroke-width': 2, opacity: 0.4, 'shape-rendering': 'crispEdges',
    });
  }

  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    const bx = Math.round(p.x - nodeR);
    const by = Math.round(p.y - nodeR);
    const bw = nodeR * 2;
    svg.raw(pixelBorder(bx, by, bw, bw, color, px));
    svg.rect(bx + px, by + px, bw - px * 2, bw - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    const fit = fitText(p.label, bw - 10, 1, 10);
    svg.text(Math.round(p.x), Math.round(p.y) + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });
  }

  return svg.build();
}

// ========== CARD_FLOW (style variant) ==========
// Nodes as rounded rectangle cards, edges as cubic bezier curves

function renderCardFlow(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const cardW = 120;
  const cardH = 60;
  const ringR = Math.max(120, data.nodes.length * 28);
  const size = (ringR + cardW / 2 + 60) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (card flow)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = layoutNodes(data, cx, cy, ringR);

  // Edges as cubic bezier curves
  for (const edge of data.edges) {
    const from = findNode(positions, edge.from);
    const to = findNode(positions, edge.to);
    if (!from || !to) continue;
    const mx = (from.x + to.x) / 2;
    const my = (from.y + to.y) / 2;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const ox = -dy * 0.2;
    const oy = dx * 0.2;
    svg.path(`M ${from.x} ${from.y} C ${from.x + ox} ${from.y + oy}, ${to.x + ox} ${to.y + oy}, ${to.x} ${to.y}`, {
      fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.35,
    });
    if (edge.label) {
      svg.text(mx + ox * 0.5, my + oy * 0.5 - 4, edge.label, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
    }
  }

  // Nodes as cards
  for (let i = 0; i < positions.length; i++) {
    const p = positions[i]!;
    const color = nodeColor(d, p.group);
    const rx = p.x - cardW / 2;
    const ry = p.y - cardH / 2;

    svg.rect(rx, ry, cardW, cardH, {
      fill: d.surface, stroke: color, 'stroke-width': 2, rx: d.borderRadius,
      ...d.cardAttrs(),
    });

    const fit = fitText(p.label, cardW - 16, 2, d.labelSize);
    const lh = Math.round(fit.fontSize * 1.4);
    const startY = p.y - ((fit.lines.length - 1) * lh) / 2;
    for (let li = 0; li < fit.lines.length; li++) {
      svg.text(p.x, startY + li * lh, fit.lines[li]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== ARC (style variant) ==========
// Nodes in a horizontal row, edges as upward semicircular arcs

function renderArc(data: NetworkGraphData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const nodeSpacing = 100;
  const n = data.nodes.length;
  const rowW = (n - 1) * nodeSpacing;
  const maxArcH = rowW / 2 + 40;
  const nodeY = pad + titleH + maxArcH + 20;
  const width = pad * 2 + rowW + 60;
  const height = nodeY + 50 + pad;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Network graph (arc)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const groups = [...new Set(data.nodes.map(nn => nn.group ?? ''))];
  const nodePositions: Array<{ id: string; x: number; group: number }> = data.nodes.map((nn, i) => ({
    id: nn.id,
    x: pad + 30 + i * nodeSpacing,
    group: groups.indexOf(nn.group ?? ''),
  }));

  const findNodeX = (id: string) => nodePositions.find(p => p.id === id);

  // Arcs
  for (const edge of data.edges) {
    const from = findNodeX(edge.from);
    const to = findNodeX(edge.to);
    if (!from || !to) continue;
    const x1 = from.x;
    const x2 = to.x;
    const dist = Math.abs(x2 - x1);
    const arcR = dist / 2;
    const mx = (x1 + x2) / 2;
    const color = nodeColor(d, from.group);
    svg.path(`M ${x1} ${nodeY} A ${arcR} ${arcR} 0 0 ${x1 < x2 ? 1 : 0} ${x2} ${nodeY}`, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.4,
    });
    if (edge.label) {
      svg.text(mx, nodeY - arcR - 4, edge.label, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
    }
  }

  // Nodes
  for (let i = 0; i < data.nodes.length; i++) {
    const nn = data.nodes[i]!;
    const pos = nodePositions[i]!;
    const color = nodeColor(d, pos.group);

    svg.circle(pos.x, nodeY, 8, { fill: color });

    const fit = fitText(nn.label, nodeSpacing - 10, 1, d.labelSize);
    svg.text(pos.x, nodeY + 24, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}
