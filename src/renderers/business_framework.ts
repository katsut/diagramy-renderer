// Business Framework renderer — auto-layout by block count + BMC/Lean Canvas grids

import { getDesign, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
} from '../shared/render-utils.js';

interface CanvasBlock {
  key: string;
  label: string;
  items: string[];
}

interface BusinessFrameworkData {
  blocks: CanvasBlock[];
}

function blockColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderBusinessFramework(data: BusinessFrameworkData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'bmc': return renderBmc(data, title, d);
    case 'lean': return renderLean(data, title, d);
    default: return renderAuto(data, title, d);
  }
}

// ========== Auto layout — picks layout by block count ==========

function renderAuto(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const n = data.blocks.length;
  if (n <= 1) return renderGrid(data, title, d, 1);
  if (n === 2) return render2Col(data, title, d);
  if (n === 3) return render3Col(data, title, d);
  if (n === 4) return render2x2(data, title, d);
  if (n === 5) return render5Center(data, title, d);
  if (n <= 9) return renderBmc(data, title, d);
  return renderGrid(data, title, d, 3);
}

// ========== Shared cell drawing helper ==========

function drawCell(
  svg: any, d: DesignPreset, x: number, y: number, w: number, h: number,
  block: CanvasBlock, colorIdx: number,
) {
  const color = blockColor(d, colorIdx);

  svg.rect(x, y, w, h, {
    fill: d.surface,
    stroke: d.borderWidth > 0 ? d.border : 'none',
    'stroke-width': d.borderWidth,
    rx: Math.min(d.borderRadius, 8),
    ...d.cardAttrs(),
  });

  // Top color accent
  svg.rect(x + 4, y, w - 8, 4, { fill: color, rx: 2 });

  // Label
  const labelFit = fitText(block.label, w - 16, 1, d.captionSize);
  svg.text(x + w / 2, y + 18, labelFit.lines[0] ?? block.label, {
    'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
  });

  // Items
  let iy = y + 34;
  const maxItems = Math.floor((h - 38) / 16);
  for (let j = 0; j < Math.min(block.items.length, maxItems); j++) {
    const itemFit = fitText(block.items[j]!, w - 20, 1, d.captionSize - 1);
    svg.text(x + 10, iy, `\u2022 ${itemFit.lines[0] ?? block.items[j]}`, {
      'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
    });
    iy += 16;
  }
}

// ========== 2-column layout (Before/After, As-Is/To-Be) ==========

function render2Col(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 12;
  const colW = 352;
  const cellH = 200;
  const width = pad * 2 + colW * 2 + gap;
  const height = pad * 2 + titleH + cellH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < 2; i++) {
    const block = data.blocks[i]!;
    drawCell(svg, d, pad + i * (colW + gap), top, colW, cellH, block, i);
  }

  return svg.build();
}

// ========== 3-column layout (3C, Why/What/How) ==========

function render3Col(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 12;
  const colW = 260;
  const cellH = 200;
  const width = pad * 2 + colW * 3 + gap * 2;
  const height = pad * 2 + titleH + cellH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < 3; i++) {
    const block = data.blocks[i]!;
    drawCell(svg, d, pad + i * (colW + gap), top, colW, cellH, block, i);
  }

  return svg.build();
}

// ========== 2x2 grid (SWOT, 4P, BSC) ==========

function render2x2(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 12;
  const colW = 352;
  const cellH = 160;
  const width = pad * 2 + colW * 2 + gap;
  const height = pad * 2 + titleH + cellH * 2 + gap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const block = data.blocks[i]!;
    drawCell(svg, d, pad + col * (colW + gap), top + row * (cellH + gap), colW, cellH, block, i);
  }

  return svg.build();
}

// ========== 5-block center layout (Five Forces) ==========
// Center block large, 4 surrounding blocks at top/right/bottom/left

function render5Center(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 12;
  const sideW = 200;
  const sideH = 140;
  const centerW = 240;
  const centerH = 180;
  const totalW = sideW + gap + centerW + gap + sideW;
  const totalH = sideH + gap + centerH + gap + sideH;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  const cx = pad + sideW + gap;
  const cy = top + sideH + gap;

  // Center block (blocks[0])
  drawCell(svg, d, cx, cy, centerW, centerH, data.blocks[0]!, 0);

  // Top (blocks[1])
  drawCell(svg, d, cx, top, centerW, sideH, data.blocks[1]!, 1);

  // Right (blocks[2])
  drawCell(svg, d, cx + centerW + gap, cy, sideW, centerH, data.blocks[2]!, 2);

  // Bottom (blocks[3])
  drawCell(svg, d, cx, cy + centerH + gap, centerW, sideH, data.blocks[3]!, 3);

  // Left (blocks[4])
  drawCell(svg, d, pad, cy, sideW, centerH, data.blocks[4]!, 4);

  return svg.build();
}

// ========== Generic grid (fallback for 10+ blocks) ==========

function renderGrid(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset, cols: number): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 12;
  const n = data.blocks.length;
  const actualCols = Math.min(cols, n) || 1;
  const rows = Math.ceil(n / actualCols);
  const colW = Math.floor((740 - pad * 2 - gap * (actualCols - 1)) / actualCols);
  const cellH = 160;
  const width = pad * 2 + actualCols * colW + (actualCols - 1) * gap;
  const height = pad * 2 + titleH + rows * cellH + (rows - 1) * gap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < n; i++) {
    const col = i % actualCols;
    const row = Math.floor(i / actualCols);
    drawCell(svg, d, pad + col * (colW + gap), top + row * (cellH + gap), colW, cellH, data.blocks[i]!, i);
  }

  return svg.build();
}

// Build a lookup from key to block
function blockMap(data: BusinessFrameworkData): Map<string, CanvasBlock> {
  const map = new Map<string, CanvasBlock>();
  for (const b of data.blocks) {
    map.set(b.key, b);
  }
  return map;
}

// ========== BMC drawCell (uses key-based lookup) ==========

function drawBmcCell(
  svg: any, d: DesignPreset, bm: Map<string, CanvasBlock>,
  defaults: Record<string, string>,
  x: number, y: number, w: number, h: number, key: string, colorIdx: number,
) {
  const block = bm.get(key);
  const label = block?.label ?? defaults[key] ?? key;
  const items = block?.items ?? [];
  const color = blockColor(d, colorIdx);

  svg.rect(x, y, w, h, {
    fill: d.surface,
    stroke: d.borderWidth > 0 ? d.border : 'none',
    'stroke-width': d.borderWidth,
    rx: Math.min(d.borderRadius, 8),
    ...d.cardAttrs(),
  });

  svg.rect(x + 4, y, w - 8, 4, { fill: color, rx: 2 });

  const labelFit = fitText(label, w - 16, 1, d.captionSize);
  svg.text(x + w / 2, y + 18, labelFit.lines[0] ?? label, {
    'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
  });

  let iy = y + 34;
  const maxItems = Math.floor((h - 38) / 16);
  for (let j = 0; j < Math.min(items.length, maxItems); j++) {
    const itemFit = fitText(items[j]!, w - 20, 1, d.captionSize - 1);
    svg.text(x + 10, iy, `\u2022 ${itemFit.lines[0] ?? items[j]}`, {
      'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
    });
    iy += 16;
  }
}

// ========== BMC (standard 9-block Business Model Canvas) ==========

const BMC_DEFAULTS: Record<string, string> = {
  key_partners: 'Key Partners',
  key_activities: 'Key Activities',
  key_resources: 'Key Resources',
  value_proposition: 'Value Proposition',
  customer_relationships: 'Customer Relationships',
  channels: 'Channels',
  customer_segments: 'Customer Segments',
  cost_structure: 'Cost Structure',
  revenue_streams: 'Revenue Streams',
};

function renderBmc(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const colW = 160;
  const rowH = 120;
  const halfRowH = 60;
  const gap = 4;
  const totalW = 5 * colW + 4 * gap;
  const totalH = 2 * halfRowH + gap + rowH + gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Model Canvas');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const bm = blockMap(data);
  const top = pad + titleH;
  const dc = (x: number, y: number, w: number, h: number, key: string, ci: number) =>
    drawBmcCell(svg, d, bm, BMC_DEFAULTS, x, y, w, h, key, ci);

  const fullH = 2 * halfRowH + gap;

  dc(pad, top, colW, fullH, 'key_partners', 0);
  dc(pad + (colW + gap), top, colW, halfRowH, 'key_activities', 1);
  dc(pad + (colW + gap), top + halfRowH + gap, colW, halfRowH, 'key_resources', 2);
  dc(pad + 2 * (colW + gap), top, colW, fullH, 'value_proposition', 3);
  dc(pad + 3 * (colW + gap), top, colW, halfRowH, 'customer_relationships', 4);
  dc(pad + 3 * (colW + gap), top + halfRowH + gap, colW, halfRowH, 'channels', 5);
  dc(pad + 4 * (colW + gap), top, colW, fullH, 'customer_segments', 6);

  const bottomY = top + fullH + gap;
  const halfW = (totalW - gap) / 2;
  dc(pad, bottomY, halfW, rowH, 'cost_structure', 7);
  dc(pad + halfW + gap, bottomY, halfW, rowH, 'revenue_streams', 8);

  return svg.build();
}

// ========== LEAN Canvas ==========

const LEAN_DEFAULTS: Record<string, string> = {
  problem: 'Problem',
  solution: 'Solution',
  key_metrics: 'Key Metrics',
  unique_value_proposition: 'Unique Value Proposition',
  unfair_advantage: 'Unfair Advantage',
  channels: 'Channels',
  customer_segments: 'Customer Segments',
  cost_structure: 'Cost Structure',
  revenue_streams: 'Revenue Streams',
};

function renderLean(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const colW = 160;
  const rowH = 120;
  const halfRowH = 60;
  const gap = 4;
  const totalW = 5 * colW + 4 * gap;
  const totalH = 2 * halfRowH + gap + rowH + gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Lean Canvas');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const bm = blockMap(data);
  const top = pad + titleH;
  const dc = (x: number, y: number, w: number, h: number, key: string, ci: number) =>
    drawBmcCell(svg, d, bm, LEAN_DEFAULTS, x, y, w, h, key, ci);

  const fullH = 2 * halfRowH + gap;

  dc(pad, top, colW, fullH, 'problem', 0);
  dc(pad + (colW + gap), top, colW, halfRowH, 'solution', 1);
  dc(pad + (colW + gap), top + halfRowH + gap, colW, halfRowH, 'key_metrics', 2);
  dc(pad + 2 * (colW + gap), top, colW, fullH, 'unique_value_proposition', 3);
  dc(pad + 3 * (colW + gap), top, colW, halfRowH, 'unfair_advantage', 4);
  dc(pad + 3 * (colW + gap), top + halfRowH + gap, colW, halfRowH, 'channels', 5);
  dc(pad + 4 * (colW + gap), top, colW, fullH, 'customer_segments', 6);

  const bottomY = top + fullH + gap;
  const halfW = (totalW - gap) / 2;
  dc(pad, bottomY, halfW, rowH, 'cost_structure', 7);
  dc(pad + halfW + gap, bottomY, halfW, rowH, 'revenue_streams', 8);

  return svg.build();
}
