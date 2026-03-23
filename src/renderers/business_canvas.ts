// Business Canvas renderer — 9-block grid (BMC / Lean Canvas)

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

interface BusinessCanvasData {
  blocks: CanvasBlock[];
}

function blockColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderBusinessCanvas(data: BusinessCanvasData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'lean': return renderLean(data, title, d);
    default: return renderBmc(data, title, d);
  }
}

// Build a lookup from key to block
function blockMap(data: BusinessCanvasData): Map<string, CanvasBlock> {
  const map = new Map<string, CanvasBlock>();
  for (const b of data.blocks) {
    map.set(b.key, b);
  }
  return map;
}

// ========== BMC (standard 9-block Business Model Canvas) ==========
// Layout:
//   Row 1: Key Partners | Key Activities | Value Proposition | Customer Relationships | Customer Segments
//   Row 1b:             | Key Resources  |                   | Channels              |
//   Row 2: Cost Structure (left half)    | Revenue Streams (right half)

const BMC_KEYS = [
  'key_partners', 'key_activities', 'value_proposition', 'customer_relationships', 'customer_segments',
  'key_resources', 'channels', 'cost_structure', 'revenue_streams',
];

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

function renderBmc(data: BusinessCanvasData, title: string | undefined, d: DesignPreset): string {
  const pad = 32;
  const titleH = title ? 50 : 0;
  const colW = 160;
  const rowH = 120;
  const halfRowH = 60;
  const gap = 4;
  // 5 columns, 2 main rows + 1 bottom row
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

  // Helper to draw a single cell
  const drawCell = (x: number, y: number, w: number, h: number, key: string, colorIdx: number) => {
    const block = bm.get(key);
    const label = block?.label ?? BMC_DEFAULTS[key] ?? key;
    const items = block?.items ?? [];
    const color = blockColor(d, colorIdx);

    // Cell background
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
    const labelFit = fitText(label, w - 16, 1, d.captionSize);
    svg.text(x + w / 2, y + 18, labelFit.lines[0] ?? label, {
      'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    let iy = y + 34;
    const maxItems = Math.floor((h - 38) / 16);
    for (let j = 0; j < Math.min(items.length, maxItems); j++) {
      const itemFit = fitText(items[j]!, w - 20, 1, d.captionSize - 1);
      svg.text(x + 10, iy, `• ${itemFit.lines[0] ?? items[j]}`, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
      });
      iy += 16;
    }
  };

  // Row 1 top half: Key Partners (col0), Key Activities (col1 top), VP (col2), CR (col3 top), CS (col4)
  const fullH = 2 * halfRowH + gap;

  // Column 0: Key Partners (full height)
  drawCell(pad, top, colW, fullH, 'key_partners', 0);

  // Column 1: Key Activities (top half) + Key Resources (bottom half)
  drawCell(pad + (colW + gap), top, colW, halfRowH, 'key_activities', 1);
  drawCell(pad + (colW + gap), top + halfRowH + gap, colW, halfRowH, 'key_resources', 2);

  // Column 2: Value Proposition (full height)
  drawCell(pad + 2 * (colW + gap), top, colW, fullH, 'value_proposition', 3);

  // Column 3: Customer Relationships (top half) + Channels (bottom half)
  drawCell(pad + 3 * (colW + gap), top, colW, halfRowH, 'customer_relationships', 4);
  drawCell(pad + 3 * (colW + gap), top + halfRowH + gap, colW, halfRowH, 'channels', 5);

  // Column 4: Customer Segments (full height)
  drawCell(pad + 4 * (colW + gap), top, colW, fullH, 'customer_segments', 6);

  // Bottom row: Cost Structure (left half), Revenue Streams (right half)
  const bottomY = top + fullH + gap;
  const halfW = (totalW - gap) / 2;
  drawCell(pad, bottomY, halfW, rowH, 'cost_structure', 7);
  drawCell(pad + halfW + gap, bottomY, halfW, rowH, 'revenue_streams', 8);

  return svg.build();
}

// ========== LEAN Canvas ==========
// Similar 9-block but with different labels:
// Problem | Solution | Unique Value Prop | Unfair Advantage | Customer Segments
//         | Key Metrics |                | Channels         |
// Cost Structure | Revenue Streams

const LEAN_KEYS = [
  'problem', 'solution', 'unique_value_proposition', 'unfair_advantage', 'customer_segments',
  'key_metrics', 'channels', 'cost_structure', 'revenue_streams',
];

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

function renderLean(data: BusinessCanvasData, title: string | undefined, d: DesignPreset): string {
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
  const defaults = LEAN_DEFAULTS;

  const drawCell = (x: number, y: number, w: number, h: number, key: string, colorIdx: number) => {
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
      svg.text(x + 10, iy, `• ${itemFit.lines[0] ?? items[j]}`, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
      });
      iy += 16;
    }
  };

  const fullH = 2 * halfRowH + gap;

  // Column 0: Problem (full height)
  drawCell(pad, top, colW, fullH, 'problem', 0);

  // Column 1: Solution (top), Key Metrics (bottom)
  drawCell(pad + (colW + gap), top, colW, halfRowH, 'solution', 1);
  drawCell(pad + (colW + gap), top + halfRowH + gap, colW, halfRowH, 'key_metrics', 2);

  // Column 2: Unique Value Proposition (full height)
  drawCell(pad + 2 * (colW + gap), top, colW, fullH, 'unique_value_proposition', 3);

  // Column 3: Unfair Advantage (top), Channels (bottom)
  drawCell(pad + 3 * (colW + gap), top, colW, halfRowH, 'unfair_advantage', 4);
  drawCell(pad + 3 * (colW + gap), top + halfRowH + gap, colW, halfRowH, 'channels', 5);

  // Column 4: Customer Segments (full height)
  drawCell(pad + 4 * (colW + gap), top, colW, fullH, 'customer_segments', 6);

  // Bottom row
  const bottomY = top + fullH + gap;
  const halfW = (totalW - gap) / 2;
  drawCell(pad, bottomY, halfW, rowH, 'cost_structure', 7);
  drawCell(pad + halfW + gap, bottomY, halfW, rowH, 'revenue_streams', 8);

  return svg.build();
}
