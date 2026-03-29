// Business Framework renderer — auto-layout by block count + BMC/Lean Canvas grids

import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface CanvasBlock {
  key: string;
  label: string;
  items: string[];
}

interface BusinessFrameworkData {
  framework?: string;
  blocks: CanvasBlock[];
}

function blockColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// ========== Framework Registry ==========

interface FrameworkDef {
  id: string;
  name: string;
  layout: 'grid_9' | '2x2' | '3col' | 'center_4' | 'split_6' | 'vpc' | 'auto';
  blocks: string[];
  lite?: string[];
}

const FRAMEWORK_REGISTRY: FrameworkDef[] = [
  { id: 'bmc', name: 'Business Model Canvas', layout: 'grid_9', blocks: ['key_partners', 'key_activities', 'key_resources', 'value_proposition', 'customer_relationships', 'channels', 'customer_segments', 'cost_structure', 'revenue_streams'] },
  { id: 'lean', name: 'Lean Canvas', layout: 'grid_9', blocks: ['problem', 'solution', 'key_metrics', 'unique_value_proposition', 'unfair_advantage', 'channels', 'customer_segments', 'cost_structure', 'revenue_streams'] },
  { id: 'vpc', name: 'Value Proposition Canvas', layout: 'vpc', blocks: ['customer_jobs', 'pains', 'gains', 'products', 'pain_relievers', 'gain_creators'] },
  { id: 'swot', name: 'SWOT Analysis', layout: '2x2', blocks: ['strengths', 'weaknesses', 'opportunities', 'threats'] },
  { id: '3c', name: '3C Analysis', layout: '3col', blocks: ['customer', 'company', 'competitor'] },
  { id: '4p', name: 'Marketing Mix (4P)', layout: '2x2', blocks: ['product', 'price', 'place', 'promotion'] },
  { id: '4c', name: '4C Analysis', layout: '2x2', blocks: ['customer_value', 'cost', 'convenience', 'communication'] },
  { id: '5forces', name: "Porter's Five Forces", layout: 'center_4', blocks: ['rivalry', 'new_entrants', 'substitutes', 'buyer_power', 'supplier_power'] },
  { id: 'pest', name: 'PEST Analysis', layout: '2x2', blocks: ['political', 'economic', 'social', 'technological'] },
  { id: 'pestel', name: 'PESTEL Analysis', layout: 'split_6', blocks: ['political', 'economic', 'social', 'technological', 'environmental', 'legal'] },
  { id: 'bsc', name: 'Balanced Scorecard', layout: '2x2', blocks: ['financial', 'customer', 'internal_process', 'learning_growth'] },
];

function findFramework(id: string | undefined): FrameworkDef | undefined {
  if (!id) return undefined;
  return FRAMEWORK_REGISTRY.find(f => f.id === id);
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

  // Style override takes priority
  if (style) {
    switch (style) {
      case 'grid_9': return renderGrid9(data, title, d);
      case 'vpc': return renderVpc(data, title, d);
      case 'split_6': return renderSplit6(data, title, d);
      case '2x2': return render2x2(data, title, d);
      case '3col': return render3Col(data, title, d);
      case 'center_4': return render5Center(data, title, d);
      case 'vpc-lite': return renderVpcLite(data, title, d);
    }
    // Style might be a framework ID (e.g., 'bmc', 'swot')
    const fwByStyle = findFramework(style);
    if (fwByStyle) return renderByLayout(fwByStyle.layout, data, title, d);
  }

  // Auto-detect from data.framework field
  const fw = findFramework(data.framework);
  if (fw) return renderByLayout(fw.layout, data, title, d);

  // Fallback: auto by block count
  return renderAuto(data, title, d);
}

function renderByLayout(layout: string, data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  switch (layout) {
    case 'grid_9': return renderGrid9(data, title, d);
    case '2x2': return render2x2(data, title, d);
    case '3col': return render3Col(data, title, d);
    case 'center_4': return render5Center(data, title, d);
    case 'split_6': return renderSplit6(data, title, d);
    case 'vpc': return renderVpc(data, title, d);
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
  if (n <= 9) return renderGrid9(data, title, d);
  return renderGrid(data, title, d, 3);
}

// ========== Preset-aware background ==========

function drawPresetBackground(svg: any, d: DesignPreset, width: number, height: number): void {
  switch (d.id) {
    case 'sketch': drawSketchBackground(svg, width, height, d.bg); break;
    case 'pixel': drawPixelBackground(svg, width, height, d.bg); break;
    default: drawBackground(svg, d, width, height); break;
  }
}

// ========== Shared cell drawing helper ==========

function drawCell(
  svg: any, d: DesignPreset, x: number, y: number, w: number, h: number,
  block: CanvasBlock, colorIdx: number,
) {
  const color = blockColor(d, colorIdx);
  const rx = Math.min(d.borderRadius, 8);

  switch (d.id) {
    case 'sketch': {
      svg.path(jitterRect(x, y, w, h, colorIdx * 13), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      // Top color accent (hand-drawn feel)
      svg.path(jitterRect(x + 4, y + 2, w - 8, 3, colorIdx * 7 + 5), {
        fill: color, stroke: 'none',
      });
      break;
    }
    case 'pixel': {
      const px = 3;
      svg.rect(Math.round(x), Math.round(y), Math.round(w), Math.round(h), {
        fill: d.surface, 'shape-rendering': 'crispEdges',
      });
      svg.raw(pixelBorder(Math.round(x), Math.round(y), Math.round(w), Math.round(h), d.border, px));
      svg.rect(Math.round(x + 4), Math.round(y), Math.round(w - 8), 4, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
      break;
    }
    case 'bold': {
      svg.rect(x, y, w, h, {
        fill: d.surface, stroke: d.text, 'stroke-width': 3,
        rx, filter: 'url(#bold-offset)',
      });
      svg.rect(x + 4, y, w - 8, 5, { fill: color, rx: 2 });
      break;
    }
    case 'neon': {
      svg.rect(x, y, w, h, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx,
      });
      svg.rect(x, y, w, h, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
      svg.rect(x + 4, y, w - 8, 3, { fill: color, opacity: 0.8, rx: 1 });
      break;
    }
    case 'glass': {
      svg.rect(x + 2, y + 2, w - 4, h - 4, {
        fill: color, opacity: 0.06, rx, filter: 'url(#shadow)',
      });
      svg.rect(x, y, w, h, {
        fill: d.surface, stroke: d.border, 'stroke-width': 1, rx,
        ...d.cardAttrs(),
      });
      if (w > 30) {
        svg.rect(x + 8, y + 1, Math.max(w - 16, 2), 1, { fill: color, opacity: 0.4, rx: 0.5 });
      }
      svg.rect(x + 2, y + 2, w - 4, h - 4, {
        fill: color, opacity: 0.06, rx: rx - 1,
      });
      svg.rect(x + 4, y, w - 8, 4, { fill: color, rx: 2 });
      break;
    }
    case 'watercolor': {
      svg.ellipse(x + w / 2, y + h / 2, w / 2 + 4, h / 2 + 3, {
        fill: color, opacity: 0.08, filter: 'url(#watercolor)',
      });
      svg.rect(x, y, w, h, {
        fill: d.surface, opacity: 0.85, rx, filter: 'url(#watercolor)',
        stroke: color, 'stroke-width': 0.5,
      });
      svg.rect(x + 4, y, w - 8, 4, { fill: color, opacity: 0.7, rx: 2 });
      break;
    }
    default: {
      // clean / minimal
      svg.rect(x, y, w, h, {
        fill: d.surface,
        stroke: d.borderWidth > 0 ? d.border : 'none',
        'stroke-width': d.borderWidth,
        rx,
        ...d.cardAttrs(),
      });
      svg.rect(x + 4, y, w - 8, 4, { fill: color, rx: 2 });
      break;
    }
  }

  // Label
  const labelFill = d.id === 'neon' ? d.text : color;
  const labelFit = fitText(block.label, w - 16, 1, d.captionSize);
  svg.text(x + w / 2, y + 18, labelFit.lines[0] ?? block.label, {
    'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: labelFill,
  });

  // Items
  let iy = y + 34;
  const maxItems = Math.floor((h - 38) / 16);
  for (let j = 0; j < Math.min(block.items.length, maxItems); j++) {
    const itemFontSize = Math.max(d.captionSize - 1, 11);
    const itemFit = fitText(block.items[j]!, w - 20, 1, itemFontSize);
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
  drawPresetBackground(svg, d, width, height);
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
  drawPresetBackground(svg, d, width, height);
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
  drawPresetBackground(svg, d, width, height);
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
  drawPresetBackground(svg, d, width, height);
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
  drawPresetBackground(svg, d, width, height);
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
  if (!block) return;
  const label = block.label ?? defaults[key] ?? key;
  const items = block?.items ?? [];
  drawCell(svg, d, x, y, w, h, { key, label, items }, colorIdx);
}

// ========== Grid 9 — generic 5-col top + 2-col bottom (BMC / Lean Canvas / any 7-9 block framework) ==========

function renderGrid9(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const colW = 180;
  const halfRowH = 80;
  const bottomRowH = 80;
  const gap = 4;
  const blocks = data.blocks;
  const n = blocks.length;

  // Layout: up to 5 columns in top section, 2 wide columns at bottom
  const topCols = Math.min(5, n <= 2 ? n : Math.ceil((n - 2) / 2) + 1);
  const totalW = topCols * colW + (topCols - 1) * gap;

  // Assign blocks to slots: columns 0,2,4 get full height; 1,3 split into halves
  // Remaining go to bottom row
  const topSlots = Math.min(n, 7); // max 7 in top section
  const bottomSlots = Math.max(0, Math.min(n - topSlots, 2));
  const fullH = 2 * halfRowH + gap;
  const totalH = fullH + (bottomSlots > 0 ? gap + bottomRowH : 0);
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Framework');
  svg.defs(defs);
  drawPresetBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;
  let bi = 0;

  // Top section: 5 columns, odd columns split into 2 halves
  for (let col = 0; col < topCols && bi < topSlots; col++) {
    const x = pad + col * (colW + gap);
    if (col % 2 === 0 || bi >= topSlots - 1) {
      // Full-height column
      if (bi < n) drawCell(svg, d, x, top, colW, fullH, blocks[bi]!, bi);
      bi++;
    } else {
      // Split column: top half + bottom half
      if (bi < n) drawCell(svg, d, x, top, colW, halfRowH, blocks[bi]!, bi);
      bi++;
      if (bi < n) drawCell(svg, d, x, top + halfRowH + gap, colW, halfRowH, blocks[bi]!, bi);
      bi++;
    }
  }

  // Bottom row: 1-2 wide blocks
  if (bottomSlots > 0) {
    const bottomY = top + fullH + gap;
    if (bottomSlots === 1 && bi < n) {
      drawCell(svg, d, pad, bottomY, totalW, bottomRowH, blocks[bi]!, bi);
    } else if (bottomSlots >= 2) {
      const halfW = (totalW - gap) / 2;
      if (bi < n) drawCell(svg, d, pad, bottomY, halfW, bottomRowH, blocks[bi]!, bi);
      bi++;
      if (bi < n) drawCell(svg, d, pad + halfW + gap, bottomY, halfW, bottomRowH, blocks[bi]!, bi);
    }
  }

  return svg.build();
}

// ========== Split 6 — two 3-row panels side by side (VPC / any 6-block framework) ==========

function renderSplit6(data: BusinessFrameworkData, title: string | undefined, d: DesignPreset): string {
  const pad = 28;
  const titleH = title ? 50 : 0;
  const gap = 8;
  const panelGap = 16;
  const blocks = data.blocks;
  const n = Math.min(blocks.length, 6);
  const leftN = Math.ceil(n / 2);
  const rightN = n - leftN;
  const colW = 200;
  const cellH = 80;
  const panelW = colW;
  const totalW = panelW * 2 + panelGap;
  const maxRows = Math.max(leftN, rightN);
  const totalH = maxRows * cellH + (maxRows - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Framework (split)');
  svg.defs(defs);
  drawPresetBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const top = pad + titleH;

  // Left panel
  for (let i = 0; i < leftN; i++) {
    const y = top + i * (cellH + gap);
    drawCell(svg, d, pad, y, panelW, cellH, blocks[i]!, i);
  }
  // Right panel
  for (let i = 0; i < rightN; i++) {
    const y = top + i * (cellH + gap);
    drawCell(svg, d, pad + panelW + panelGap, y, panelW, cellH, blocks[leftN + i]!, leftN + i);
  }

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
  drawPresetBackground(svg, d, width, height);
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
  drawPresetBackground(svg, d, width, height);
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
