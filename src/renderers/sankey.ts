// Sankey flow diagram renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface SankeyNode {
  id: string;
  label: string;
}

interface SankeyFlow {
  from: string;
  to: string;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  flows: SankeyFlow[];
}

function flowColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderSankey(data: SankeyData, title?: string, design?: DesignPreset): string {
  const d = design ?? getDesign();
  switch (d.id) {
    case 'sketch': return renderSketch(data, title, d);
    case 'pixel': return renderPixel(data, title, d);
    case 'bold': return renderBold(data, title, d);
    case 'minimal': return renderFlat(data, title, d);
    case 'glass': return renderGlass(data, title, d);
    case 'neon': return renderNeon(data, title, d);
    case 'watercolor': return renderWatercolor(data, title, d);
    default: return renderClean(data, title, d);
  }
}

// --- Layout: assign columns ---

interface ColumnNode { id: string; label: string; col: number; y: number; h: number; }

function layoutColumns(data: SankeyData, colW: number, totalH: number, gap: number): ColumnNode[] {
  const fromIds = new Set(data.flows.map(f => f.from));
  const toIds = new Set(data.flows.map(f => f.to));
  const cols: Map<string, number> = new Map();

  // Sources in col 0, sinks in col 2, rest in col 1
  for (const n of data.nodes) {
    if (!toIds.has(n.id)) cols.set(n.id, 0);
    else if (!fromIds.has(n.id)) cols.set(n.id, 2);
    else cols.set(n.id, 1);
  }

  const maxCol = Math.max(...cols.values(), 1);
  const totalValue = data.flows.reduce((s, f) => s + f.value, 0) || 1;
  const nodeValues: Map<string, number> = new Map();
  for (const n of data.nodes) {
    const outVal = data.flows.filter(f => f.from === n.id).reduce((s, f) => s + f.value, 0);
    const inVal = data.flows.filter(f => f.to === n.id).reduce((s, f) => s + f.value, 0);
    nodeValues.set(n.id, Math.max(outVal, inVal, 1));
  }

  // Position nodes per column
  const result: ColumnNode[] = [];
  for (let c = 0; c <= maxCol; c++) {
    const colNodes = data.nodes.filter(n => cols.get(n.id) === c);
    const colTotal = colNodes.reduce((s, n) => s + (nodeValues.get(n.id) ?? 1), 0);
    let y = 0;
    for (const n of colNodes) {
      const h = Math.max(24, ((nodeValues.get(n.id) ?? 1) / colTotal) * (totalH - (colNodes.length - 1) * gap));
      result.push({ id: n.id, label: n.label, col: c, y, h });
      y += h + gap;
    }
  }
  return result;
}

function findCol(nodes: ColumnNode[], id: string): ColumnNode | undefined {
  return nodes.find(n => n.id === id);
}

// ========== CLEAN ==========

function renderClean(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const colW = 120;
  const maxCol = 2;
  const chartH = 260;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram',
    buildColorGradients(d, data.flows.length, 'sf'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  // Flow bands
  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(4, flow.value * 3);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: flowColor(d, fi), opacity: 0.2,
    });
  }

  // Node bars
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    svg.rect(x, y, colW, n.h, {
      fill: color, rx: d.borderRadius > 8 ? 6 : d.borderRadius, opacity: 0.85,
      ...d.cardAttrs(),
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: 'white',
    });
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick colored bars, offset shadow, big text

function renderBold(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const colW = 130;
  const maxCol = 2;
  const chartH = 280;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (bold)',
    buildColorGradients(d, data.flows.length, 'sf'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(6, flow.value * 3.5);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: flowColor(d, fi), opacity: 0.35, filter: 'url(#bold-offset)',
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    svg.rect(x, y, colW, n.h, {
      fill: color, rx: 4, stroke: '#111', 'stroke-width': 3, filter: 'url(#bold-offset)',
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize + 1);
    svg.text(x + colW / 2, y + n.h / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: no shadows, horizontal bars with left strip

function renderFlat(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const colW = 120;
  const maxCol = 2;
  const chartH = 260;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(4, flow.value * 3);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: flowColor(d, fi), opacity: 0.15,
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    svg.rect(x, y, colW, n.h, { fill: d.surface, rx: d.borderRadius > 8 ? 6 : d.borderRadius });
    // Left color strip
    svg.rect(x, y + 4, 4, n.h - 8, { fill: color, rx: 2 });
    const fit = fitText(n.label, colW - 16, 1, d.labelSize);
    svg.text(x + colW / 2 + 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass bars, glow flows

function renderGlass(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const colW = 120;
  const maxCol = 2;
  const chartH = 260;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (glass)',
    buildColorGradients(d, data.flows.length, 'sf'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(4, flow.value * 3);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: flowColor(d, fi), opacity: 0.15, filter: 'url(#shadow)',
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    // Glow behind
    svg.rect(x + 4, y + 4, colW - 8, n.h - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted bar
    svg.rect(x, y, colW, n.h, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1,
      rx: d.borderRadius > 8 ? 6 : d.borderRadius, ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 16, y + 1, colW - 32, 1, { fill: color, opacity: 0.4, rx: 0.5 });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight,
      fill: d.text, 'letter-spacing': '0.3',
    });
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon bars, glowing flows

function renderNeon(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const colW = 120;
  const maxCol = 2;
  const chartH = 260;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const color = flowColor(d, fi);
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(4, flow.value * 3);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3, filter: 'url(#neon-glow)',
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    // Dark bar with neon border
    svg.rect(x, y, colW, n.h, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1,
      rx: d.borderRadius > 8 ? 6 : d.borderRadius,
    });
    // Glow border
    svg.rect(x, y, colW, n.h, {
      fill: 'none', stroke: color, 'stroke-width': 1.5,
      rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const colW = 120;
  const maxCol = 2;
  const chartH = 260;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (watercolor)',
    buildColorGradients(d, data.flows.length, 'sf'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (let fi = 0; fi < data.flows.length; fi++) {
    const flow = data.flows[fi]!;
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(4, flow.value * 3);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: flowColor(d, fi), opacity: 0.2, filter: 'url(#watercolor)',
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    const color = flowColor(d, i);
    // Watercolor wash behind
    svg.ellipse(x + colW / 2, y + n.h / 2, colW / 2 + 8, n.h / 2 + 6, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft bar
    svg.rect(x, y, colW, n.h, {
      fill: color, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      opacity: 0.7, filter: 'url(#watercolor)',
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const colW = 110;
  const maxCol = 2;
  const chartH = 240;
  const chartW = colW * (maxCol + 1) + 80 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (const flow of data.flows) {
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 80) + colW;
    const x2 = pad + to.col * (colW + 80);
    const y1 = baseY + from.y + from.h / 2;
    const y2 = baseY + to.y + to.h / 2;
    const bh = Math.max(3, flow.value * 2.5);
    svg.path(`M ${x1} ${y1 - bh / 2} C ${(x1 + x2) / 2} ${y1 - bh / 2} ${(x1 + x2) / 2} ${y2 - bh / 2} ${x2} ${y2 - bh / 2} L ${x2} ${y2 + bh / 2} C ${(x1 + x2) / 2} ${y2 + bh / 2} ${(x1 + x2) / 2} ${y1 + bh / 2} ${x1} ${y1 + bh / 2} Z`, {
      fill: 'none', stroke: d.border, 'stroke-width': 1, opacity: 0.3,
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 80);
    const y = baseY + n.y;
    svg.path(jitterRect(x, y, colW, n.h, i * 13), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + n.h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: SankeyData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const colW = 100;
  const maxCol = 2;
  const px = 3;
  const chartH = 220;
  const chartW = colW * (maxCol + 1) + 70 * maxCol;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sankey diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const nodes = layoutColumns(data, colW, chartH, 8);
  const baseY = pad + titleH + 20;

  for (const flow of data.flows) {
    const from = findCol(nodes, flow.from);
    const to = findCol(nodes, flow.to);
    if (!from || !to) continue;
    const x1 = pad + from.col * (colW + 70) + colW;
    const x2 = pad + to.col * (colW + 70);
    const y1 = Math.round(baseY + from.y + from.h / 2);
    const y2 = Math.round(baseY + to.y + to.h / 2);
    svg.line(x1, y1, x2, y2, {
      stroke: d.colors[0]!, 'stroke-width': Math.max(2, flow.value), opacity: 0.3, 'shape-rendering': 'crispEdges',
    });
  }

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]!;
    const x = pad + n.col * (colW + 70);
    const y = Math.round(baseY + n.y);
    const h = Math.round(n.h);
    const color = flowColor(d, i);
    svg.raw(pixelBorder(x, y, colW, h, color, px));
    svg.rect(x + px, y + px, colW - px * 2, h - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    const fit = fitText(n.label, colW - 12, 1, d.labelSize);
    svg.text(x + colW / 2, y + h / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });
  }

  return svg.build();
}
