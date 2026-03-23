// Block list renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import { icon } from '../shared/icons.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard, drawIconNode,
} from '../shared/render-utils.js';

interface BlockItem {
  label: string;
  description?: string;
}

interface BlockListData {
  items: BlockItem[];
}

const ITEM_ICONS = ['lightbulb', 'target', 'zap', 'users', 'trending-up', 'settings', 'eye', 'link'];

function itemIcon(i: number): string {
  return ITEM_ICONS[i % ITEM_ICONS.length]!;
}

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderBlockList(data: BlockListData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'grid': return renderGrid(data, title, d);
    case 'pillars': return renderPillars(data, title, d);
    default:
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
}

// ========== CLEAN ==========

function renderClean(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const colW = 200;
  const cardH = 180;
  const gap = 20;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list diagram',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;

    drawCleanCard(svg, d, cx, contentTop, colW, cardH, color, i);
    drawCleanIcon(svg, d, cx, contentTop + 48, color, i);
    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 88, colW - 24);
  }

  return svg.build();
}

function drawCleanCard(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, color: string, _i: number): void {
  drawPresetCard(svg, d, cx - w / 2, top, w, h, color);
}

function drawCleanIcon(svg: SvgBuilder, d: DesignPreset, cx: number, iconY: number, color: string, i: number): void {
  drawIconNode(svg, d, cx, iconY, 22, color, `bg${i}`, itemIcon(i), 18);
}

// ========== BOLD ==========
// Pop style: colored card fills, large icons, thick borders, offset shadow

function renderBold(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 56 : 0;
  const count = data.items.length;
  const colW = 210;
  const cardH = 190;
  const gap = 24;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (bold)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;
    const x = cx - colW / 2;

    // Colored card with offset shadow
    svg.rect(x, contentTop, colW, cardH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner area
    svg.rect(x + 4, contentTop + 40, colW - 8, cardH - 48, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });
    // Large number badge
    svg.text(cx, contentTop + 28, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#FFFFFF',
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 70, colW - 32);
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: horizontal cards with left color strip, no shadows

function renderFlat(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const cardW = 400;
  const cardH = 56;
  const gap = 8;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * (cardH + gap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = contentTop + i * (cardH + gap);

    // Flat card — no shadow, no border
    svg.rect(pad, y, cardW, cardH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, cardH - 8, { fill: color, rx: 2 });
    // Number circle
    svg.circle(pad + 32, y + cardH / 2, 14, { fill: color });
    svg.text(pad + 32, y + cardH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#FFFFFF',
    });
    // Text left-aligned
    drawLabelBlock(svg, d, item.label, item.description, pad + 60, y + (item.description ? cardH / 2 - 4 : cardH / 2 + 5), cardW - 80, 'start');
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass cards, glow effects

function renderGlass(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const colW = 220;
  const cardH = 200;
  const gap = 24;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (glass)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;
    const x = cx - colW / 2;

    // Glow behind card
    svg.rect(x + 4, contentTop + 4, colW - 8, cardH - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass card
    svg.rect(x, contentTop, colW, cardH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 20, contentTop + 1, colW - 40, 1, { fill: color, opacity: 0.4, rx: 0.5 });
    // Icon with glow
    svg.circle(cx, contentTop + 56, 28, { fill: color, opacity: 0.1 });
    svg.circle(cx, contentTop + 56, 20, { fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1 });
    svg.raw(icon(itemIcon(i), cx, contentTop + 56, 18, '#FFFFFF'));
    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 100, colW - 32);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outlines, glow effects, grid

function renderNeon(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const colW = 210;
  const cardH = 180;
  const gap = 20;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;
    const x = cx - colW / 2;

    // Dark card with neon border
    svg.rect(x, contentTop, colW, cardH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(x, contentTop, colW, cardH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Neon icon outline
    svg.circle(cx, contentTop + 52, 22, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.raw(icon(itemIcon(i), cx, contentTop + 52, 18, color));
    // Number
    svg.text(cx + colW / 2 - 18, contentTop + 18, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 92, colW - 28);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, serif text, paper feel

function renderWatercolor(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const colW = 200;
  const cardH = 180;
  const gap = 28;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (watercolor)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;
    const x = cx - colW / 2;

    // Watercolor wash blob behind card
    svg.ellipse(cx, contentTop + cardH / 2, colW / 2 + 10, cardH / 2 + 8, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft card
    svg.rect(x, contentTop, colW, cardH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });
    // Watercolor circle
    svg.circle(cx, contentTop + 50, 22, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(cx, contentTop + 56, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: d.text,
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 90, colW - 28);
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const colW = 180;
  const cardH = 130;
  const gap = 20;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const cx = pad + i * (colW + gap) + colW / 2;
    const boxX = cx - colW / 2 + 4;
    const boxY = contentTop + 4;

    svg.path(jitterRect(boxX, boxY, colW - 8, cardH - 8, i * 5), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    svg.circle(cx, contentTop + 36, 16, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(cx, contentTop + 40, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': 400, fill: d.text,
    });

    drawLabelBlock(svg, d, item.label, item.description, cx, contentTop + 64, colW - 24);
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.items.length;
  const px = 3;
  const colW = 170;
  const cardH = 110;
  const gap = 12;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const bx = pad + i * (colW + gap);

    svg.raw(pixelBorder(bx, contentTop, colW, cardH, color, px));
    svg.rect(bx + px, contentTop + px, colW - px * 2, cardH - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });

    // Number
    svg.rect(bx + px, contentTop + px, px * 8, px * 7, { fill: color, 'shape-rendering': 'crispEdges' });
    svg.text(bx + px * 4 + 1, contentTop + px * 5 + 1, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: d.bg,
    });

    drawLabelBlock(svg, d, item.label, item.description, bx + colW / 2, contentTop + 38, colW - 20);
  }

  return svg.build();
}

// ========== GRID ==========
// Grid layout: items arranged in rows and columns

function renderGrid(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const cols = count <= 2 ? 2 : count <= 4 ? 2 : count <= 6 ? 3 : count <= 9 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const cardW = 200;
  const cardH = 160;
  const gapX = 20;
  const gapY = 20;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const gradientDefs = buildColorGradients(d, count, 'bg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list diagram (grid)', gradientDefs);
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (cardW + gapX) + cardW / 2;
    const cy = contentTop + row * (cardH + gapY);

    drawPresetCard(svg, d, cx - cardW / 2, cy, cardW, cardH, color);
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + cardH / 2 - 8, cardW - 28);
  }

  return svg.build();
}

// ========== PILLARS ==========
// Vertical pillar columns on a shared foundation bar

function renderPillars(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const pillarW = 140;
  const pillarH = 220;
  const gap = 20;
  const baseH = 44;
  const iconR = 22;
  const totalPillarsW = count * pillarW + (count - 1) * gap;
  const baseOverhang = 24;
  const baseW = totalPillarsW + baseOverhang * 2;
  const width = pad * 2 + baseW;
  const height = pad * 2 + titleH + pillarH + baseH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (pillars)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const pillarsLeft = pad + baseOverhang;
  const baseTop = contentTop + pillarH + 8;

  // Foundation bar
  svg.rect(pad, baseTop, baseW, baseH, {
    fill: d.primary, rx: d.borderRadius, opacity: 0.9,
  });
  // Foundation label (title or generic)
  const baseLabel = title || 'Foundation';
  const baseFit = fitText(baseLabel, baseW - 32, 1, 14);
  svg.text(pad + baseW / 2, baseTop + baseH / 2 + 5, baseFit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': baseFit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
  });

  // Pillars
  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const px = pillarsLeft + i * (pillarW + gap);
    const py = contentTop;
    const cx = px + pillarW / 2;

    // Pillar rectangle
    svg.rect(px, py, pillarW, pillarH, {
      fill: d.surface, rx: d.borderRadius,
      stroke: d.borderWidth > 0 ? d.border : 'none',
      'stroke-width': d.borderWidth,
      ...d.cardAttrs(),
    });

    // Top accent strip
    svg.rect(px + 1, py + 1, pillarW - 2, 4, { fill: color, rx: 2 });

    // Icon circle at top of pillar
    const iconY = py + 36;
    svg.circle(cx, iconY, iconR, { fill: color, opacity: 0.15 });
    svg.circle(cx, iconY, iconR - 4, { fill: color });
    svg.raw(icon(itemIcon(i), cx, iconY, 16, '#FFFFFF'));

    // Label in middle
    drawLabelBlock(svg, d, item.label, item.description, cx, py + 80, pillarW - 24);
  }

  return svg.build();
}
