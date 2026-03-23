// Business Framework renderer — auto-layout by block count + BMC/Lean Canvas grids

import { getDesign, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
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

// Measure natural size needed for a block based on its text content
function measureBlock(block: CanvasBlock, d: DesignPreset): { w: number; h: number } {
  const fontSize = d.captionSize;
  const labelW = estimateWidth(block.label, fontSize + 2) + 24;
  let maxItemW = 0;
  for (const item of block.items) {
    maxItemW = Math.max(maxItemW, estimateWidth(`\u2022 ${item}`, fontSize - 1) + 24);
  }
  const w = Math.max(labelW, maxItemW, 100);
  const h = 38 + block.items.length * 16 + 12;
  return { w, h };
}

export function renderBusinessFramework(data: BusinessFrameworkData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'bmc': return renderBmc(data, title, d);
    case 'lean': return renderLean(data, title, d);
    case 'vpc': return renderVpc(data, title, d);
    case 'vpc-lite': return renderVpcLite(data, title, d);
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
  const pad = 24;
  const titleH = title ? 44 : 0;
  const gap = 10;
  const blocks = data.blocks.slice(0, 2);
  const sizes = blocks.map(b => measureBlock(b, d));
  const colW = Math.max(...sizes.map(s => s.w), 140);
  const cellH = Math.max(...sizes.map(s => s.h), 60);
  const width = pad * 2 + colW * 2 + gap;
  const height = pad * 2 + titleH + cellH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < blocks.length; i++) {
    drawCell(svg, d, pad + i * (colW + gap), top, colW, cellH, blocks[i]!, i);
  }

  return svg.build();
}

// ========== 3-column layout (3C, Why/What/How) ==========

function render3Col(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 24;
  const titleH = title ? 44 : 0;
  const gap = 10;
  const blocks = data.blocks.slice(0, 3);
  const sizes = blocks.map(b => measureBlock(b, d));
  const colW = Math.max(...sizes.map(s => s.w), 120);
  const cellH = Math.max(...sizes.map(s => s.h), 60);
  const width = pad * 2 + colW * 3 + gap * 2;
  const height = pad * 2 + titleH + cellH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Business Framework');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  for (let i = 0; i < blocks.length; i++) {
    drawCell(svg, d, pad + i * (colW + gap), top, colW, cellH, blocks[i]!, i);
  }

  return svg.build();
}

// ========== 2x2 grid (SWOT, 4P, BSC) ==========

function render2x2(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 24;
  const titleH = title ? 44 : 0;
  const gap = 10;
  const blocks = data.blocks.slice(0, 4);
  const sizes = blocks.map(b => measureBlock(b, d));
  const colW = Math.max(...sizes.map(s => s.w), 120);
  const cellH = Math.max(...sizes.map(s => s.h), 60);
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

// ========== VPC (Value Proposition Canvas) ==========

const VPC_DEFAULTS: Record<string, string> = {
  customer_jobs: 'Customer Jobs',
  pains: 'Pains',
  gains: 'Gains',
  products: 'Products & Services',
  pain_relievers: 'Pain Relievers',
  gain_creators: 'Gain Creators',
};

// Draw items inside a VPC sector (clipped region within circle or rect)
function drawVpcSector(
  svg: any, d: DesignPreset, bm: Map<string, CanvasBlock>,
  cx: number, cy: number, key: string, colorIdx: number,
  maxW: number,
) {
  const block = bm.get(key);
  const label = block?.label ?? VPC_DEFAULTS[key] ?? key;
  const items = block?.items ?? [];
  const color = blockColor(d, colorIdx);

  const labelFit = fitText(label, maxW - 12, 1, d.captionSize);
  svg.text(cx, cy, labelFit.lines[0] ?? label, {
    'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
  });

  let iy = cy + 16;
  const maxItems = 4;
  for (let j = 0; j < Math.min(items.length, maxItems); j++) {
    const itemFit = fitText(items[j]!, maxW - 20, 1, d.captionSize - 2);
    svg.text(cx, iy, `\u2022 ${itemFit.lines[0] ?? items[j]}`, {
      'text-anchor': 'middle', 'font-size': itemFit.fontSize, fill: d.text,
    });
    iy += 14;
  }
}

function renderVpc(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const circleR = 140;
  const rectW = 280;
  const rectH = circleR * 2;
  const arrowGap = 48;
  const totalW = rectW + arrowGap + circleR * 2;
  const totalH = rectH;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const bm = blockMap(data);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Value Proposition Canvas',
    `<clipPath id="vpc-circle"><circle cx="${pad + rectW + arrowGap + circleR}" cy="${pad + titleH + circleR}" r="${circleR - 2}"/></clipPath>` +
    `<clipPath id="vpc-rect"><rect x="${pad}" y="${pad + titleH}" width="${rectW}" height="${rectH}" rx="${Math.min(d.borderRadius, 12)}"/></clipPath>`
  );
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;

  // --- Left: Value Proposition (rounded rectangle, 3 horizontal sections) ---
  const rx = pad;
  const ry = top;
  svg.rect(rx, ry, rectW, rectH, {
    fill: d.surface,
    stroke: d.borderWidth > 0 ? d.border : 'none',
    'stroke-width': d.borderWidth,
    rx: Math.min(d.borderRadius, 12),
    ...d.cardAttrs(),
  });

  // Horizontal dividers for 3 sections
  const sectionH = rectH / 3;
  svg.line(rx, ry + sectionH, rx + rectW, ry + sectionH, {
    stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,3',
  });
  svg.line(rx, ry + sectionH * 2, rx + rectW, ry + sectionH * 2, {
    stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,3',
  });

  // Section labels: Gain Creators (top), Products/Services (mid), Pain Relievers (bottom)
  const rectCx = rx + rectW / 2;
  drawVpcSector(svg, d, bm, rectCx, ry + sectionH * 0.35, 'gain_creators', 3, rectW);
  drawVpcSector(svg, d, bm, rectCx, ry + sectionH * 1.35, 'products', 4, rectW);
  drawVpcSector(svg, d, bm, rectCx, ry + sectionH * 2.35, 'pain_relievers', 5, rectW);

  // --- Right: Customer Segment (circle with Y-shaped dividers) ---
  const ccx = pad + rectW + arrowGap + circleR;
  const ccy = top + circleR;

  svg.circle(ccx, ccy, circleR, {
    fill: d.surface,
    stroke: d.borderWidth > 0 ? d.border : 'none',
    'stroke-width': d.borderWidth,
    ...d.cardAttrs(),
  });

  // Y-shaped dividers: center → top, center → bottom-left, center → bottom-right
  // The Y junction is slightly above center to give more room to top section
  const jy = ccy - 10;
  // Line to top
  svg.line(ccx, jy, ccx, ccy - circleR, {
    stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,3',
  });
  // Line to bottom-left (210 degrees)
  const blx = ccx + circleR * Math.cos(210 * Math.PI / 180);
  const bly = ccy + circleR * Math.sin(210 * Math.PI / 180);
  svg.line(ccx, jy, blx, bly, {
    stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,3',
  });
  // Line to bottom-right (330 degrees)
  const brx = ccx + circleR * Math.cos(330 * Math.PI / 180);
  const bry = ccy + circleR * Math.sin(330 * Math.PI / 180);
  svg.line(ccx, jy, brx, bry, {
    stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,3',
  });

  // Gains (top sector)
  drawVpcSector(svg, d, bm, ccx, ccy - circleR * 0.55, 'gains', 0, circleR * 1.2);
  // Customer Jobs (bottom-right sector)
  drawVpcSector(svg, d, bm, ccx + circleR * 0.35, ccy + circleR * 0.35, 'customer_jobs', 1, circleR * 0.9);
  // Pains (bottom-left sector)
  drawVpcSector(svg, d, bm, ccx - circleR * 0.35, ccy + circleR * 0.35, 'pains', 2, circleR * 0.9);

  // --- Center arrow (Fit) ---
  const arrowX1 = pad + rectW + 8;
  const arrowX2 = pad + rectW + arrowGap - 8;
  const arrowY = top + circleR;
  svg.line(arrowX2, arrowY, arrowX1, arrowY, {
    stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round',
  });
  // Arrowhead pointing left (value side receives from customer side)
  svg.path(`M${arrowX1},${arrowY} L${arrowX1 + 8},${arrowY - 5} L${arrowX1 + 8},${arrowY + 5} Z`, {
    fill: d.border,
  });
  // "Fit" label
  svg.text((arrowX1 + arrowX2) / 2, arrowY - 8, 'Fit', {
    'text-anchor': 'middle', 'font-size': d.captionSize - 2, fill: d.text, 'font-style': 'italic',
  });

  return svg.build();
}

// ========== VPC-lite (lightweight Value Proposition Canvas) ==========

function renderVpcLite(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const n = data.blocks.length;
  if (n <= 3) {
    // Simple horizontal card layout
    if (n <= 2) return render2Col(data, title, d);
    return render3Col(data, title, d);
  }

  // 4-6 blocks: 2-column grouped layout (value side left, customer side right)
  const pad = 32;
  const titleH = title ? 50 : 0;
  const gap = 10;
  const groupGap = 24;

  // Split blocks into value side (first half) and customer side (second half)
  const mid = Math.ceil(n / 2);
  const leftBlocks = data.blocks.slice(0, mid);
  const rightBlocks = data.blocks.slice(mid);

  // Measure all blocks
  const leftSizes = leftBlocks.map(b => measureBlock(b, d));
  const rightSizes = rightBlocks.map(b => measureBlock(b, d));

  const colW = Math.max(
    ...leftSizes.map(s => s.w),
    ...rightSizes.map(s => s.w),
    160,
  );
  const cellH = Math.max(
    ...leftSizes.map(s => s.h),
    ...rightSizes.map(s => s.h),
    80,
  );

  const leftH = leftBlocks.length * cellH + (leftBlocks.length - 1) * gap;
  const rightH = rightBlocks.length * cellH + (rightBlocks.length - 1) * gap;
  const contentH = Math.max(leftH, rightH);

  const labelH = 24;
  const width = pad * 2 + colW * 2 + groupGap;
  const height = pad * 2 + titleH + labelH + contentH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Value Proposition Canvas');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;

  // Group labels
  svg.text(pad + colW / 2, top + 16, 'Value Proposition', {
    'text-anchor': 'middle', 'font-size': d.captionSize - 1, fill: d.text, 'font-weight': d.fontWeight, opacity: 0.6,
  });
  svg.text(pad + colW + groupGap + colW / 2, top + 16, 'Customer Segment', {
    'text-anchor': 'middle', 'font-size': d.captionSize - 1, fill: d.text, 'font-weight': d.fontWeight, opacity: 0.6,
  });

  const cardsTop = top + labelH;

  // Left column (value side)
  for (let i = 0; i < leftBlocks.length; i++) {
    drawCell(svg, d, pad, cardsTop + i * (cellH + gap), colW, cellH, leftBlocks[i]!, i + 3);
  }

  // Right column (customer side)
  for (let i = 0; i < rightBlocks.length; i++) {
    drawCell(svg, d, pad + colW + groupGap, cardsTop + i * (cellH + gap), colW, cellH, rightBlocks[i]!, i);
  }

  return svg.build();
}
