// Composite flow renderer — design-system aware
// Process with feedback edges (loops, retries)

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard, ensureTitleFits,
} from '../shared/render-utils.js';

interface CompositeFlowNode {
  id: string;
  label: string;
  description?: string;
  node_type?: string;
}

interface CompositeFlowEdge {
  from: string;
  to: string;
  label?: string;
  edge_type?: string;
}

interface CompositeFlowData {
  nodes: CompositeFlowNode[];
  edges?: CompositeFlowEdge[];
}

function nodeColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderCompositeFlow(data: CompositeFlowData, title?: string, design?: DesignPreset): string {
  const d = design ?? getDesign();
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

function effectiveEdges(data: CompositeFlowData): CompositeFlowEdge[] {
  if (data.edges && data.edges.length > 0) return data.edges;
  return data.nodes.slice(0, -1).map((n, i) => ({
    from: n.id,
    to: data.nodes[i + 1]!.id,
    edge_type: 'forward',
  }));
}

function nodeIndex(nodes: CompositeFlowNode[], id: string): number {
  return nodes.findIndex(n => n.id === id);
}

// --- node_type ごとの形状描画 ---

function drawFlowNode(
  svg: SvgBuilder, d: DesignPreset,
  x: number, y: number, w: number, h: number,
  color: string, gradientId: string, nodeType: string | undefined,
  extraAttrs: Record<string, string | number> = {},
): void {
  const type = nodeType || 'action';
  const cx = x + w / 2;
  const cy = y + h / 2;

  if (type === 'start' || type === 'end') {
    // Pill / capsule shape
    svg.rect(x, y, w, h, {
      fill: `url(#${gradientId})`, rx: h / 2,
      stroke: d.id === 'bold' ? '#111' : 'white', 'stroke-width': d.borderWidth,
      ...d.cardAttrs(), ...extraAttrs,
    });
  } else if (type === 'decision') {
    // Diamond shape
    const mx = cx, my = cy;
    const dw = w / 2 + 10, dh = h / 2 + 6;
    svg.path(
      `M ${mx} ${my - dh} L ${mx + dw} ${my} L ${mx} ${my + dh} L ${mx - dw} ${my} Z`,
      {
        fill: d.surface, stroke: color, 'stroke-width': d.borderWidth + 0.5,
        ...d.cardAttrs(), ...extraAttrs,
      },
    );
    // Inner diamond accent
    svg.path(
      `M ${mx} ${my - dh + 6} L ${mx + dw - 6} ${my} L ${mx} ${my + dh - 6} L ${mx - dw + 6} ${my} Z`,
      { fill: 'none', stroke: color, 'stroke-width': 0.5, opacity: 0.2 },
    );
  } else {
    // Action: standard rectangle card
    drawPresetCard(svg, d, x, y, w, h, color);
  }
}

// Icon for node type
function nodeTypeIcon(nodeType: string | undefined): string {
  switch (nodeType) {
    case 'start': return '▶';
    case 'end': return '■';
    case 'decision': return '?';
    default: return '';
  }
}

// ========== CLEAN ==========

function renderClean(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.nodes.length;
  const nodeW = 220;
  const nodeH = 56;
  const vGap = 44;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const feedbackMargin = hasFeedback ? 80 : 0;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + feedbackMargin;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH + 16;
  const nodeLeft = (width - nodeW - feedbackMargin) / 2;
  const cx = nodeLeft + nodeW / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Composite flow diagram',
    buildColorGradients(d, count, 'cf'));
  const markers = `<marker id="fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>` +
    `<marker id="fb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.primary}" opacity="0.5"/></marker>`;
  svg.defs(baseDefs + markers);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = data.nodes.map((_, i) => contentTop + i * (nodeH + vGap) + nodeH / 2);

  // Forward edges
  for (const edge of edges) {
    if (edge.edge_type === 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      svg.line(cx, positions[fi]! + nodeH / 2, cx, positions[ti]! - nodeH / 2 - 6, {
        stroke: d.border, 'stroke-width': 2, 'marker-end': 'url(#fwd)',
      });
    }
  }

  // Feedback edges
  for (const edge of edges) {
    if (edge.edge_type !== 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      const fy = positions[fi]!;
      const ty = positions[ti]!;
      const arcX = nodeLeft + nodeW + 20;
      const color = nodeColor(d, fi);
      svg.path(`M ${nodeLeft + nodeW} ${fy} C ${arcX + 30} ${fy}, ${arcX + 30} ${ty}, ${pad + nodeW} ${ty}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '6,4',
        opacity: 0.5, 'marker-end': 'url(#fb)',
      });
      if (edge.label) {
        svg.text(arcX + 36, (fy + ty) / 2 + 4, edge.label, {
          'font-size': d.captionSize, fill: color, opacity: 0.7,
        });
      }
    }
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);
    const isTerminal = node.node_type === 'start' || node.node_type === 'end';

    if (isTerminal) {
      svg.rect(nodeLeft, ny, nodeW, nodeH, {
        fill: `url(#cf${i})`, stroke: 'white', 'stroke-width': d.borderWidth,
        rx: nodeH / 2, ...d.cardAttrs(),
      });
      // White text on gradient pill
      const fit = fitText(node.label, nodeW - 24, 1, d.labelSize);
      svg.text(cx, ny + nodeH / 2 + 5, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: '#FFFFFF',
      });
    } else {
      drawPresetCard(svg, d, nodeLeft, ny, nodeW, nodeH, color);
      drawLabelBlock(svg, d, node.label, node.description, cx,
        ny + (node.description ? nodeH / 2 - 6 : nodeH / 2 + 2), nodeW - 24);
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: colored nodes, thick borders, offset shadow, numbered steps

function renderBold(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = data.nodes.length;
  const nodeW = 240;
  const nodeH = 64;
  const vGap = 48;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const feedbackMargin = hasFeedback ? 80 : 0;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + feedbackMargin;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH + 16;
  const nodeLeft = (width - nodeW - feedbackMargin) / 2;
  const cx = nodeLeft + nodeW / 2;
  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Composite flow (bold)',
    buildColorGradients(d, count, 'cf'));
  const markers = `<marker id="fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>` +
    `<marker id="fb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.primary}" opacity="0.5"/></marker>`;
  svg.defs(baseDefs + markers);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = data.nodes.map((_, i) => contentTop + i * (nodeH + vGap) + nodeH / 2);

  // Forward edges
  for (const edge of edges) {
    if (edge.edge_type === 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      svg.line(cx, positions[fi]! + nodeH / 2, cx, positions[ti]! - nodeH / 2 - 6, {
        stroke: d.border, 'stroke-width': 3, 'marker-end': 'url(#fwd)',
      });
    }
  }

  // Feedback edges
  for (const edge of edges) {
    if (edge.edge_type !== 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      const fy = positions[fi]!;
      const ty = positions[ti]!;
      const arcX = nodeLeft + nodeW + 20;
      const color = nodeColor(d, fi);
      svg.path(`M ${nodeLeft + nodeW} ${fy} C ${arcX + 30} ${fy}, ${arcX + 30} ${ty}, ${pad + nodeW} ${ty}`, {
        fill: 'none', stroke: color, 'stroke-width': 3, 'stroke-dasharray': '8,5',
        opacity: 0.6, 'marker-end': 'url(#fb)',
      });
    }
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    svg.rect(nodeLeft, ny, nodeW, nodeH, {
      fill: color, rx: 8, stroke: '#111', 'stroke-width': 3, filter: 'url(#bold-offset)',
    });
    // Step number
    svg.text(nodeLeft + 24, ny + nodeH / 2 + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#FFFFFF',
    });
    // White text on colored background
    const fit = fitText(node.label, nodeW - 56, 1, d.labelSize);
    svg.text(cx + 12, ny + nodeH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: horizontal cards with left color strip, no shadows

function renderFlat(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.nodes.length;
  const nodeW = 360;
  const nodeH = 52;
  const vGap = 12;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH;
  const nodeLeft = (width - nodeW) / 2;
  const cx = nodeLeft + nodeW / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Composite flow (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    // Flat card
    svg.rect(nodeLeft, ny, nodeW, nodeH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(nodeLeft, ny + 4, 4, nodeH - 8, { fill: color, rx: 2 });
    // Step number
    svg.circle(nodeLeft + 28, ny + nodeH / 2, 14, { fill: color });
    svg.text(nodeLeft + 28, ny + nodeH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#FFFFFF',
    });
    drawLabelBlock(svg, d, node.label, node.description, nodeLeft + 56,
      ny + (node.description ? nodeH / 2 - 4 : nodeH / 2 + 5), nodeW - 80, 'start');

    // Connector
    if (i < count - 1) {
      svg.line(nodeLeft + 28, ny + nodeH, nodeLeft + 28, ny + nodeH + vGap, {
        stroke: d.border, 'stroke-width': 1.5,
      });
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass nodes, glow effects

function renderGlass(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.nodes.length;
  const nodeW = 240;
  const nodeH = 60;
  const vGap = 48;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const feedbackMargin = hasFeedback ? 80 : 0;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + feedbackMargin;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH + 16;
  const nodeLeft = (width - nodeW - feedbackMargin) / 2;
  const cx = nodeLeft + nodeW / 2;
  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Composite flow (glass)',
    buildColorGradients(d, count, 'cf'));
  const markers = `<marker id="fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>` +
    `<marker id="fb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.primary}" opacity="0.5"/></marker>`;
  svg.defs(baseDefs + markers);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = data.nodes.map((_, i) => contentTop + i * (nodeH + vGap) + nodeH / 2);

  // Forward edges
  for (const edge of edges) {
    if (edge.edge_type === 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      svg.line(cx, positions[fi]! + nodeH / 2, cx, positions[ti]! - nodeH / 2 - 6, {
        stroke: d.border, 'stroke-width': 1.5, opacity: 0.3, 'marker-end': 'url(#fwd)',
      });
    }
  }

  // Feedback edges
  for (const edge of edges) {
    if (edge.edge_type !== 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      const fy = positions[fi]!;
      const ty = positions[ti]!;
      const arcX = nodeLeft + nodeW + 20;
      const color = nodeColor(d, fi);
      svg.path(`M ${nodeLeft + nodeW} ${fy} C ${arcX + 30} ${fy}, ${arcX + 30} ${ty}, ${pad + nodeW} ${ty}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '6,4',
        opacity: 0.4, 'marker-end': 'url(#fb)',
      });
    }
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    // Glow behind
    svg.rect(nodeLeft + 4, ny + 4, nodeW - 8, nodeH - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass card
    svg.rect(nodeLeft, ny, nodeW, nodeH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius, ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(nodeLeft + 20, ny + 1, nodeW - 40, 1, { fill: color, opacity: 0.4, rx: 0.5 });

    drawLabelBlock(svg, d, node.label, node.description, cx,
      ny + (node.description ? nodeH / 2 - 6 : nodeH / 2 + 2), nodeW - 24);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon-outlined nodes, glow connections

function renderNeon(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.nodes.length;
  const nodeW = 220;
  const nodeH = 56;
  const vGap = 44;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const feedbackMargin = hasFeedback ? 80 : 0;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + feedbackMargin;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH + 16;
  const nodeLeft = (width - nodeW - feedbackMargin) / 2;
  const cx = nodeLeft + nodeW / 2;
  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Composite flow (neon)');
  const markers = `<marker id="fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.primary}"/></marker>` +
    `<marker id="fb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="#FF00FF" opacity="0.5"/></marker>`;
  svg.defs(baseDefs + markers);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = data.nodes.map((_, i) => contentTop + i * (nodeH + vGap) + nodeH / 2);

  // Forward edges
  for (const edge of edges) {
    if (edge.edge_type === 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      svg.line(cx, positions[fi]! + nodeH / 2, cx, positions[ti]! - nodeH / 2 - 6, {
        stroke: d.primary, 'stroke-width': 1.5, opacity: 0.5, 'marker-end': 'url(#fwd)',
        filter: 'url(#neon-glow)',
      });
    }
  }

  // Feedback edges
  for (const edge of edges) {
    if (edge.edge_type !== 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      const fy = positions[fi]!;
      const ty = positions[ti]!;
      const arcX = nodeLeft + nodeW + 20;
      svg.path(`M ${nodeLeft + nodeW} ${fy} C ${arcX + 30} ${fy}, ${arcX + 30} ${ty}, ${pad + nodeW} ${ty}`, {
        fill: 'none', stroke: '#FF00FF', 'stroke-width': 1.5, 'stroke-dasharray': '6,4',
        opacity: 0.5, 'marker-end': 'url(#fb)', filter: 'url(#neon-glow)',
      });
    }
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    // Dark card with neon border
    svg.rect(nodeLeft, ny, nodeW, nodeH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow
    svg.rect(nodeLeft, ny, nodeW, nodeH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Step number
    svg.text(nodeLeft + nodeW - 16, ny + 16, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });

    drawLabelBlock(svg, d, node.label, node.description, cx,
      ny + (node.description ? nodeH / 2 - 6 : nodeH / 2 + 2), nodeW - 28);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.nodes.length;
  const nodeW = 240;
  const nodeH = 60;
  const vGap = 48;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const feedbackMargin = hasFeedback ? 80 : 0;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + feedbackMargin;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH + 16;
  const nodeLeft = (width - nodeW - feedbackMargin) / 2;
  const cx = nodeLeft + nodeW / 2;
  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Composite flow (watercolor)',
    buildColorGradients(d, count, 'cf'));
  const markers = `<marker id="fwd" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>` +
    `<marker id="fb" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">` +
    `<polygon points="0,0 8,3 0,6" fill="${d.primary}" opacity="0.5"/></marker>`;
  svg.defs(baseDefs + markers);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = data.nodes.map((_, i) => contentTop + i * (nodeH + vGap) + nodeH / 2);

  // Forward edges
  for (const edge of edges) {
    if (edge.edge_type === 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      svg.line(cx, positions[fi]! + nodeH / 2, cx, positions[ti]! - nodeH / 2 - 6, {
        stroke: d.border, 'stroke-width': 2, opacity: 0.3, 'marker-end': 'url(#fwd)',
      });
    }
  }

  // Feedback edges
  for (const edge of edges) {
    if (edge.edge_type !== 'feedback') continue;
    const fi = nodeIndex(data.nodes, edge.from);
    const ti = nodeIndex(data.nodes, edge.to);
    if (fi >= 0 && ti >= 0) {
      const fy = positions[fi]!;
      const ty = positions[ti]!;
      const arcX = nodeLeft + nodeW + 20;
      const color = nodeColor(d, fi);
      svg.path(`M ${nodeLeft + nodeW} ${fy} C ${arcX + 30} ${fy}, ${arcX + 30} ${ty}, ${pad + nodeW} ${ty}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-dasharray': '6,4',
        opacity: 0.4, 'marker-end': 'url(#fb)',
      });
    }
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    const isTerminal = node.node_type === 'start' || node.node_type === 'end';
    // Watercolor wash blob
    svg.ellipse(cx, ny + nodeH / 2, nodeW / 2 + 10, nodeH / 2 + 8, {
      fill: color, opacity: 0.15, filter: 'url(#watercolor)',
    });
    // Soft painted card
    svg.rect(nodeLeft, ny, nodeW, nodeH, {
      fill: color, rx: isTerminal ? nodeH / 2 : d.borderRadius,
      opacity: 0.55, filter: 'url(#watercolor)',
    });
    // Inner light card for readability
    if (!isTerminal) {
      svg.rect(nodeLeft + 3, ny + 3, nodeW - 6, nodeH - 6, {
        fill: d.surface, rx: d.borderRadius, opacity: 0.7, filter: 'url(#wc-blur)',
      });
    }

    if (isTerminal) {
      const fit = fitText(node.label, nodeW - 28, 1, d.labelSize);
      svg.text(cx, ny + nodeH / 2 + 5, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: '#FFFFFF',
      });
    } else {
      drawLabelBlock(svg, d, node.label, node.description, cx,
        ny + (node.description ? nodeH / 2 - 6 : nodeH / 2 + 2), nodeW - 28);
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.nodes.length;
  const nodeW = 200;
  const nodeH = 50;
  const vGap = 40;
  const edges = effectiveEdges(data);
  const hasFeedback = edges.some(e => e.edge_type === 'feedback');
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW + (hasFeedback ? 60 : 0);
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH;
  const nodeLeft = (width - nodeW) / 2;
  const cx = nodeLeft + nodeW / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Composite flow (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const ny = contentTop + i * (nodeH + vGap);
    svg.path(jitterRect(nodeLeft, ny, nodeW, nodeH, i * 7), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
    const fit = fitText(node.label, nodeW - 16, 1, d.labelSize);
    svg.text(cx, ny + nodeH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    if (i < count - 1) {
      const ay1 = ny + nodeH + 4;
      const ay2 = ny + nodeH + vGap - 4;
      svg.path(jitterLine(cx, ay1, cx, ay2, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5,
      });
      svg.path(`M ${cx - 5} ${ay2 - 6} L ${cx} ${ay2} L ${cx + 5} ${ay2 - 6}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5,
      });
    }
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: CompositeFlowData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.nodes.length;
  const px = 3;
  const nodeW = 180;
  const nodeH = 44;
  const vGap = 30;
  const totalH = count * nodeH + (count - 1) * vGap;
  const contentW = pad * 2 + nodeW;
  const width = ensureTitleFits(contentW, title, d, pad);
  const height = pad * 2 + titleH + totalH;
  const nodeLeft = (width - nodeW) / 2;
  const cx = nodeLeft + nodeW / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Composite flow (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = nodeColor(d, i);
    const ny = contentTop + i * (nodeH + vGap);

    svg.raw(pixelBorder(nodeLeft, ny, nodeW, nodeH, color, px));
    svg.rect(nodeLeft + px, ny + px, nodeW - px * 2, nodeH - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    const fit = fitText(node.label, nodeW - 16, 1, d.labelSize);
    svg.text(cx, ny + nodeH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    if (i < count - 1) {
      const ay = ny + nodeH + vGap / 2;
      for (let a = 0; a < Math.floor(vGap / px) - 4; a++) {
        svg.rect(cx - px / 2, ny + nodeH + 2 + a * px, px, px, {
          fill: color, 'shape-rendering': 'crispEdges',
        });
      }
    }
  }

  return svg.build();
}
