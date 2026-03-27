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
import { computeGridLayout } from '../shared/layout-planner.js';

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
    case 'numbered': return renderNumbered(data, title, d);
    case 'cards': return renderCards(data, title, d);
    case 'icons': return renderIcons(data, title, d);
    case 'stripe': return renderStripe(data, title, d);
    case 'zigzag': return renderZigzag(data, title, d);
    case 'timeline': return renderTimeline(data, title, d);
    default:
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
}

// ========== CLEAN ==========

function renderClean(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const colW = 200;
  const cardH = 180;
  const gap = 20;
  const maxWidth = 960;

  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, rows, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list diagram',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const cy = contentTop + row * (cardH + gap);

    drawCleanCard(svg, d, cx, cy, colW, cardH, color, i);
    drawCleanIcon(svg, d, cx, cy + 48, color, i);
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 88, colW - 24);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (bold)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const x = cx - colW / 2;
    const cy = contentTop + row * (cardH + gap);

    // Colored card with offset shadow
    svg.rect(x, cy, colW, cardH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner area
    svg.rect(x + 4, cy + 40, colW - 8, cardH - 48, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });
    // Large number badge
    svg.text(cx, cy + 28, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#FFFFFF',
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 70, colW - 32);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (glass)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const x = cx - colW / 2;
    const cy = contentTop + row * (cardH + gap);

    // Glow behind card
    svg.rect(x + 4, cy + 4, colW - 8, cardH - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass card
    svg.rect(x, cy, colW, cardH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 20, cy + 1, colW - 40, 1, { fill: color, opacity: 0.4, rx: 0.5 });
    // Icon with glow
    svg.circle(cx, cy + 56, 28, { fill: color, opacity: 0.1 });
    svg.circle(cx, cy + 56, 20, { fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1 });
    svg.raw(icon(itemIcon(i), cx, cy + 56, 18, '#FFFFFF'));
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 100, colW - 32);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const x = cx - colW / 2;
    const cy = contentTop + row * (cardH + gap);

    // Dark card with neon border
    svg.rect(x, cy, colW, cardH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(x, cy, colW, cardH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Neon icon outline
    svg.circle(cx, cy + 52, 22, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.raw(icon(itemIcon(i), cx, cy + 52, 18, color));
    // Number
    svg.text(cx + colW / 2 - 18, cy + 18, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 92, colW - 28);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (watercolor)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const x = cx - colW / 2;
    const cy = contentTop + row * (cardH + gap);

    // Watercolor wash blob behind card
    svg.ellipse(cx, cy + cardH / 2, colW / 2 + 10, cardH / 2 + 8, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft card
    svg.rect(x, cy, colW, cardH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });
    // Watercolor circle
    svg.circle(cx, cy + 50, 22, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(cx, cy + 56, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: d.text,
    });
    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 90, colW - 28);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (colW + gap) + colW / 2;
    const cy = contentTop + row * (cardH + gap);
    const boxX = cx - colW / 2 + 4;
    const boxY = cy + 4;

    svg.path(jitterRect(boxX, boxY, colW - 8, cardH - 8, i * 5), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    svg.circle(cx, cy + 36, 16, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(cx, cy + 40, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': 400, fill: d.text,
    });

    drawLabelBlock(svg, d, item.label, item.description, cx, cy + 64, colW - 24);
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
  const maxWidth = 960;
  const grid = computeGridLayout(count, colW, cardH, gap, pad, titleH, maxWidth);
  const { cols, totalWidth: width, totalHeight: height } = grid;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const bx = pad + col * (colW + gap);
    const cy = contentTop + row * (cardH + gap);

    svg.raw(pixelBorder(bx, cy, colW, cardH, color, px));
    svg.rect(bx + px, cy + px, colW - px * 2, cardH - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });

    // Number
    svg.rect(bx + px, cy + px, px * 8, px * 7, { fill: color, 'shape-rendering': 'crispEdges' });
    svg.text(bx + px * 4 + 1, cy + px * 5 + 1, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: d.bg,
    });

    drawLabelBlock(svg, d, item.label, item.description, bx + colW / 2, cy + 38, colW - 20);
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

// ========== NUMBERED ==========
// Vertical list with connecting line and numbered circle badges

function renderNumbered(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const isPixel = d.id === 'pixel';
  const isSketch = d.id === 'sketch';
  const pad = 44;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const lineX = pad + 24;
  const textLeft = lineX + 40;
  const cardW = 400;
  const itemH = 72;
  const gap = 12;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * (itemH + gap) - gap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (numbered)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  if (isSketch) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (isPixel) {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  // Vertical connecting line
  const lineTop = contentTop + 20;
  const lineBottom = contentTop + (count - 1) * (itemH + gap) + 20;
  svg.rect(lineX - 1.5, lineTop, 3, lineBottom - lineTop, {
    fill: d.border, opacity: 0.3, rx: isPixel ? 0 : 1.5,
    ...(isPixel ? { 'shape-rendering': 'crispEdges' } : {}),
  });

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = contentTop + i * (itemH + gap);

    if (isSketch) {
      // Hand-drawn wobbly circle badge
      const rx = 16 + (i % 3 - 1) * 1.5;
      const ry = 16 + ((i + 1) % 3 - 1) * 1.5;
      svg.raw(`<ellipse cx="${lineX}" cy="${y + 20}" rx="${rx}" ry="${ry}" fill="none" stroke="${d.border}" stroke-width="${d.borderWidth}"/>`);
      svg.text(lineX, y + 25, `${i + 1}`, {
        'text-anchor': 'middle', 'font-size': 13, 'font-weight': 400, fill: d.text,
      });
    } else if (isPixel) {
      // Pixel-style stepped border badge
      const px = 3;
      svg.raw(pixelBorder(lineX - 16, y + 4, 32, 32, color, px));
      svg.rect(lineX - 16 + px, y + 4 + px, 32 - px * 2, 32 - px * 2, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
      svg.text(lineX, y + 25, `${i + 1}`, {
        'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#FFFFFF',
      });
    } else {
      // Numbered circle badge on the line
      svg.circle(lineX, y + 20, 16, { fill: color });
      svg.text(lineX, y + 25, `${i + 1}`, {
        'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#FFFFFF',
      });
    }

    // Label + description to the right
    drawLabelBlock(svg, d, item.label, item.description, textLeft, y + 18, cardW - textLeft + pad - 20, 'start');
  }

  return svg.build();
}

// ========== CARDS ==========
// 2-column layout with large feature cards, icon + bold label + description

function renderCards(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const isPixel = d.id === 'pixel';
  const isSketch = d.id === 'sketch';
  const px = 3;
  const pad = 44;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const cols = 2;
  const rows = Math.ceil(count / cols);
  const cardW = 260;
  const cardH = 140;
  const gapX = 24;
  const gapY = 20;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (cards)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  if (isSketch) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (isPixel) {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cardW + gapX);
    const y = contentTop + row * (cardH + gapY);

    if (isSketch) {
      svg.path(jitterRect(x + 4, y + 4, cardW - 8, cardH - 8, i * 7), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (isPixel) {
      svg.raw(pixelBorder(x, y, cardW, cardH, color, px));
      svg.rect(x + px, y + px, cardW - px * 2, cardH - px * 2, {
        fill: d.surface, 'shape-rendering': 'crispEdges',
      });
    } else {
      drawPresetCard(svg, d, x, y, cardW, cardH, color);
    }

    // Large icon circle
    const iconCx = x + 40;
    const iconCy = y + cardH / 2;
    if (isSketch) {
      const rx = 18 + (i % 3 - 1) * 1.5;
      const ry = 18 + ((i + 1) % 3 - 1) * 1.5;
      svg.raw(`<ellipse cx="${iconCx}" cy="${iconCy}" rx="${rx}" ry="${ry}" fill="none" stroke="${d.border}" stroke-width="1.5"/>`);
    } else if (isPixel) {
      svg.rect(iconCx - 18, iconCy - 18, 36, 36, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
    } else {
      svg.circle(iconCx, iconCy, 24, { fill: color, opacity: 0.15 });
      svg.circle(iconCx, iconCy, 18, { fill: color });
    }
    svg.raw(icon(itemIcon(i), iconCx, iconCy, 16, isSketch ? d.border : '#FFFFFF'));

    // Label + description to the right of icon
    drawLabelBlock(svg, d, item.label, item.description, x + 76, y + cardH / 2 - 6, cardW - 96, 'start');
  }

  return svg.build();
}

// ========== ICONS ==========
// Icon-dominant grid (3-4 columns), large icon circle + short label

function renderIcons(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const isPixel = d.id === 'pixel';
  const isSketch = d.id === 'sketch';
  const pad = 40;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const cols = count <= 3 ? 3 : 4;
  const rows = Math.ceil(count / cols);
  const cellW = 120;
  const cellH = 120;
  const gapX = 16;
  const gapY = 16;
  const totalW = cols * cellW + (cols - 1) * gapX;
  const totalH = rows * cellH + (rows - 1) * gapY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (icons)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  if (isSketch) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (isPixel) {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = pad + col * (cellW + gapX) + cellW / 2;
    const y = contentTop + row * (cellH + gapY);

    // Large icon
    if (isSketch) {
      const rx = 24 + (i % 3 - 1) * 2;
      const ry = 24 + ((i + 1) % 3 - 1) * 2;
      svg.raw(`<ellipse cx="${cx}" cy="${y + 38}" rx="${rx}" ry="${ry}" fill="none" stroke="${d.border}" stroke-width="${d.borderWidth}"/>`);
    } else if (isPixel) {
      svg.rect(cx - 24, y + 14, 48, 48, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
    } else {
      svg.circle(cx, y + 38, 30, { fill: color, opacity: 0.15 });
      svg.circle(cx, y + 38, 24, { fill: color });
    }
    svg.raw(icon(itemIcon(i), cx, y + 38, 20, isSketch ? d.border : '#FFFFFF'));

    // Short label below
    const fit = fitText(item.label, cellW - 12, 2, d.labelSize - 1);
    const lh = Math.round(fit.fontSize * 1.4);
    let textY = y + 78;
    for (const line of fit.lines) {
      svg.text(cx, textY, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      textY += lh;
    }
  }

  return svg.build();
}

// ========== STRIPE ==========
// Full-width horizontal bars with alternating backgrounds

function renderStripe(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const isPixel = d.id === 'pixel';
  const isSketch = d.id === 'sketch';
  const pad = 36;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const barW = 480;
  const barH = 52;
  const gap = 4;
  const width = pad * 2 + barW;
  const height = pad * 2 + titleH + count * (barH + gap) - gap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (stripe)');
  svg.defs(defs);
  if (isSketch) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (isPixel) {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = contentTop + i * (barH + gap);

    if (isSketch) {
      // Hand-drawn bar border
      svg.path(jitterRect(pad + 2, y + 2, barW - 4, barH - 4, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else {
      // Alternating background
      const bgFill = i % 2 === 0 ? d.surface : d.bg;
      svg.rect(pad, y, barW, barH, {
        fill: bgFill, rx: isPixel ? 0 : d.borderRadius,
        ...(isPixel ? { 'shape-rendering': 'crispEdges' } : {}),
      });

      // Left color accent
      svg.rect(pad, y, 5, barH, {
        fill: color, rx: isPixel ? 0 : 2,
        ...(isPixel ? { 'shape-rendering': 'crispEdges' } : {}),
      });
    }

    // Icon
    svg.raw(icon(itemIcon(i), pad + 28, y + barH / 2, 16, isSketch ? d.border : color));

    // Label + description
    drawLabelBlock(svg, d, item.label, item.description, pad + 52, y + (item.description ? barH / 2 - 4 : barH / 2 + 5), barW - 72, 'start');
  }

  return svg.build();
}

// ========== ZIGZAG ==========
// Items alternate left/right with a dashed center line

function renderZigzag(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const isPixel = d.id === 'pixel';
  const isSketch = d.id === 'sketch';
  const pad = 44;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const totalW = 520;
  const centerX = pad + totalW / 2;
  const itemH = 80;
  const gap = 16;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (itemH + gap) - gap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (zigzag)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  if (isSketch) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (isPixel) {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  // Dashed center line
  const lineTop = contentTop;
  const lineBottom = contentTop + count * (itemH + gap) - gap;
  svg.rect(centerX - 0.5, lineTop, 1, lineBottom - lineTop, {
    fill: 'none', stroke: d.border, 'stroke-width': 1,
    'stroke-dasharray': isPixel ? '3,3' : '6,4', opacity: 0.4,
    ...(isPixel ? { 'shape-rendering': 'crispEdges' } : {}),
  });

  const sideW = totalW / 2 - 40;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = contentTop + i * (itemH + gap);
    const isLeft = i % 2 === 0;

    // Icon on the center line
    if (isSketch) {
      const rx = 16 + (i % 3 - 1) * 1.5;
      const ry = 16 + ((i + 1) % 3 - 1) * 1.5;
      svg.raw(`<ellipse cx="${centerX}" cy="${y + 24}" rx="${rx}" ry="${ry}" fill="none" stroke="${d.border}" stroke-width="${d.borderWidth}"/>`);
    } else if (isPixel) {
      svg.rect(centerX - 16, y + 8, 32, 32, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
    } else {
      svg.circle(centerX, y + 24, 16, { fill: color });
    }
    svg.raw(icon(itemIcon(i), centerX, y + 24, 14, isSketch ? d.border : '#FFFFFF'));

    // Label + description on alternating sides
    if (isLeft) {
      drawLabelBlock(svg, d, item.label, item.description, centerX - 36, y + 20, sideW, 'end');
    } else {
      drawLabelBlock(svg, d, item.label, item.description, centerX + 36, y + 20, sideW, 'start');
    }
  }

  return svg.build();
}

// ========== TIMELINE ==========
// Horizontal timeline with items as labeled dots on a line

function renderTimeline(data: BlockListData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const dotR = 8;
  const maxPerRow = 6;
  const rows = Math.ceil(count / maxPerRow);
  const perRow = Math.ceil(count / rows);
  const spacing = 140;
  const rowH = 120;
  const lineW = (perRow - 1) * spacing;
  const width = pad * 2 + lineW + 60;
  const height = pad * 2 + titleH + rows * rowH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Block list (timeline)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let row = 0; row < rows; row++) {
    const startIdx = row * perRow;
    const endIdx = Math.min(startIdx + perRow, count);
    const itemsInRow = endIdx - startIdx;
    const rowLineW = (itemsInRow - 1) * spacing;
    const rowStartX = pad + 30;
    const lineY = contentTop + row * rowH + rowH / 2;

    // Horizontal line
    svg.line(rowStartX, lineY, rowStartX + rowLineW, lineY, {
      stroke: d.border, 'stroke-width': 2, opacity: 0.3,
    });

    // Connect rows with a vertical segment if zigzag
    if (row > 0) {
      const prevLineY = contentTop + (row - 1) * rowH + rowH / 2;
      svg.line(rowStartX, prevLineY, rowStartX, lineY, {
        stroke: d.border, 'stroke-width': 2, opacity: 0.15, 'stroke-dasharray': '4,4',
      });
    }

    for (let j = 0; j < itemsInRow; j++) {
      const i = startIdx + j;
      const item = data.items[i]!;
      const color = itemColor(d, i);
      const cx = rowStartX + j * spacing;

      // Dot
      svg.circle(cx, lineY, dotR, { fill: color, ...d.cardAttrs() });
      svg.circle(cx, lineY, dotR + 4, { fill: color, opacity: 0.15 });

      // Label above
      const fit = fitText(item.label, spacing - 16, 2, d.labelSize);
      const lh = Math.round(fit.fontSize * 1.3);
      let ly = lineY - dotR - 12 - (fit.lines.length - 1) * lh;
      for (const line of fit.lines) {
        svg.text(cx, ly, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
        });
        ly += lh;
      }

      // Description below
      if (item.description) {
        const dfit = fitText(item.description, spacing - 16, 2, d.captionSize);
        const dlh = Math.round(dfit.fontSize * 1.3);
        let dy = lineY + dotR + 16;
        for (const line of dfit.lines) {
          svg.text(cx, dy, line, {
            'text-anchor': 'middle', 'font-size': dfit.fontSize, fill: d.textSecondary,
          });
          dy += dlh;
        }
      }
    }
  }

  return svg.build();
}
