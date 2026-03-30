// Process renderer — design-system aware, uses shared render utilities

import { radialGradient } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import { icon } from '../shared/icons.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  computeHorizontalStepLayout, buildColorGradients, arrowMarkerDef,
  drawSketchBackground, drawPixelBackground, drawPresetCard, drawIconNode,
  ensureTitleFits, type StepLayout,
} from '../shared/render-utils.js';
import { computeGridLayout } from '../shared/layout-planner.js';
import type { SvgBuilder } from '../shared/svg.js';

interface ProcessNode {
  label: string;
  description?: string;
  node_type?: string;
}

interface ProcessData {
  nodes: ProcessNode[];
}

const STEP_ICONS = ['zap', 'settings', 'eye', 'check', 'target', 'trending-up', 'users', 'lightbulb'];

export function renderProcess(data: ProcessData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'chevron': return renderChevron(data, title, d);
    case 'vertical': return renderVertical(data, title, d);
    case 'serpentine': return renderSerpentine(data, title, d);
    case 'staircase': return renderStaircase(data, title, d);
    case 'numbered': return renderNumbered(data, title, d);
    case 'pipeline': return renderPipeline(data, title, d);
    case 'escalation': return renderEscalation(data, title, d);
    default: {
      // Auto-switch to serpentine when horizontal layout would exceed 960px
      if (!style && data.nodes.length > 4) {
        return renderSerpentine(data, title, d);
      }
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
}

// --- Shared: draw node label + description ---

function drawNodeText(svg: SvgBuilder, d: DesignPreset, node: ProcessNode, cx: number, startY: number, maxW: number, idx?: number): number {
  return drawLabelBlock(svg, d, node.label, node.description, cx, startY, maxW, 'middle', idx != null ? `nodes[${idx}]` : undefined);
}

function stepIcon(i: number): string {
  return STEP_ICONS[i % STEP_ICONS.length]!;
}

function stepColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// ========== CLEAN ==========

function renderClean(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 220, 170, 56, 48, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram',
    buildColorGradients(d, lay.count, 'pg') + arrowMarkerDef(d));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);

    svg.beginItem(`nodes[${i}]`);
    drawCleanCard(svg, d, cx, lay.contentTop, lay.stepW, lay.stepH, color, i);
    drawCleanIcon(svg, d, cx, lay.contentTop + 48, color, i);
    drawNodeText(svg, d, node, cx, lay.contentTop + 86, lay.stepW - 36, i);
    svg.endItem();
    drawCleanArrow(svg, d, cx, lay, i);
  }

  return svg.build();
}

function drawCleanCard(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, color: string, _i: number): void {
  drawPresetCard(svg, d, cx - w / 2 + 6, top + 4, w - 12, h - 8, color);
}

function drawCleanIcon(svg: SvgBuilder, d: DesignPreset, cx: number, iconY: number, color: string, i: number): void {
  drawIconNode(svg, d, cx, iconY, 18, color, `pg${i}`, stepIcon(i), 16);

  // Number badge (top-right area)
  const badgeX = cx + 84;
  const badgeY = iconY - 26;
  svg.circle(badgeX, badgeY, 11, { fill: color });
  svg.text(badgeX, badgeY + 4, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: 'white',
  });
}

function drawCleanArrow(svg: SvgBuilder, d: DesignPreset, cx: number, lay: StepLayout, i: number): void {
  if (i >= lay.count - 1) return;
  const ax1 = cx + lay.stepW / 2;
  const ax2 = ax1 + lay.arrowW - 8;
  const cy = lay.cy();
  svg.path(`M ${ax1} ${cy} C ${ax1 + 14} ${cy}, ${ax2 - 14} ${cy}, ${ax2} ${cy}`, {
    fill: 'none', stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)',
  });
}

// ========== SKETCH ==========

function renderSketch(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 200, 140, 60, 48, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const cx = lay.cx(i);

    svg.beginItem(`nodes[${i}]`);
    drawSketchBox(svg, d, cx, lay.contentTop, lay.stepW, lay.stepH, i);
    drawSketchNumber(svg, d, cx, lay.contentTop + 36, i);
    drawNodeText(svg, d, node, cx, lay.contentTop + 66, lay.stepW - 36, i);
    svg.endItem();
    drawSketchArrow(svg, d, cx, lay, i);
  }

  return svg.build();
}

function drawSketchBox(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, i: number): void {
  const boxX = cx - w / 2 + 8;
  const boxY = top + 8;
  svg.path(jitterRect(boxX, boxY, w - 16, h - 16, i * 7), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });
}

function drawSketchNumber(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, i: number): void {
  svg.circle(cx, cy, 16, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
  svg.text(cx, cy + 4, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 14, 'font-weight': 400, fill: d.text,
  });
}

function drawSketchArrow(svg: SvgBuilder, d: DesignPreset, cx: number, lay: StepLayout, i: number): void {
  if (i >= lay.count - 1) return;
  const ax1 = cx + lay.stepW / 2 - 4;
  const ax2 = ax1 + lay.arrowW;
  const ay = lay.contentTop + lay.stepH / 2;
  svg.path(jitterLine(ax1, ay, ax2, ay, i * 13), {
    fill: 'none', stroke: d.border, 'stroke-width': 1.5,
  });
  svg.path(`M ${ax2 - 8} ${ay - 5} L ${ax2} ${ay} L ${ax2 - 8} ${ay + 5}`, {
    fill: 'none', stroke: d.border, 'stroke-width': 1.5,
  });
}

// ========== PIXEL ==========

function renderPixel(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const lay = computeHorizontalStepLayout(data.nodes.length, 180, 120, 48, 40, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);
    const boxX = cx - lay.stepW / 2;

    svg.beginItem(`nodes[${i}]`);
    drawPixelBox(svg, d, boxX, lay.contentTop, lay.stepW, lay.stepH, color, px, i);
    drawNodeText(svg, d, node, cx, lay.contentTop + 42, lay.stepW - 24, i);
    svg.endItem();
    drawPixelArrow(svg, color, cx, lay, px, i);
  }

  return svg.build();
}

function drawPixelBox(svg: SvgBuilder, d: DesignPreset, x: number, y: number, w: number, h: number, color: string, px: number, i: number): void {
  svg.raw(pixelBorder(x, y, w, h, color, px));
  svg.rect(x + px, y + px, w - px * 2, h - px * 2, {
    fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
  });
  // Number badge
  svg.rect(x + px, y + px, px * 8, px * 7, { fill: color, 'shape-rendering': 'crispEdges' });
  svg.text(x + px * 4 + 1, y + px * 5 + 1, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: d.bg,
  });
}

function drawPixelArrow(svg: SvgBuilder, color: string, cx: number, lay: StepLayout, px: number, i: number): void {
  if (i >= lay.count - 1) return;
  const ax1 = cx + lay.stepW / 2 + 4;
  const ay = lay.contentTop + lay.stepH / 2;

  for (let a = 0; a < Math.floor((lay.arrowW - 12) / px); a++) {
    svg.rect(ax1 + a * px, ay - px / 2, px, px, { fill: color, 'shape-rendering': 'crispEdges' });
  }
  const headX = ax1 + lay.arrowW - 12;
  svg.raw(`<g shape-rendering="crispEdges">` +
    `<rect x="${headX}" y="${ay - px * 2}" width="${px}" height="${px * 4}" fill="${color}"/>` +
    `<rect x="${headX + px}" y="${ay - px}" width="${px}" height="${px * 2}" fill="${color}"/>` +
    `<rect x="${headX + px * 2}" y="${ay - px / 2}" width="${px}" height="${px}" fill="${color}"/>` +
    `</g>`);
}

// ========== BOLD ==========
// Pop style: colored card fills, white inner area, large numbers, offset shadow, thick arrows

function renderBold(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 240, 190, 64, 48, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (bold)',
    buildColorGradients(d, lay.count, 'pg') + arrowMarkerDef(d));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);
    const x = cx - lay.stepW / 2;

    svg.beginItem(`nodes[${i}]`);
    // Colored card with offset shadow
    svg.rect(x, lay.contentTop, lay.stepW, lay.stepH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner area
    svg.rect(x + 5, lay.contentTop + 48, lay.stepW - 10, lay.stepH - 56, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });
    // Large number
    svg.text(cx, lay.contentTop + 34, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 24, 'font-weight': 900, fill: '#FFFFFF',
    });
    drawNodeText(svg, d, node, cx, lay.contentTop + 74, lay.stepW - 36, i);
    svg.endItem();

    // Thick arrow
    if (i < lay.count - 1) {
      const ax1 = cx + lay.stepW / 2 + 4;
      const ax2 = ax1 + lay.arrowW - 12;
      const ay = lay.cy();
      svg.path(`M ${ax1} ${ay} L ${ax2} ${ay}`, {
        fill: 'none', stroke: color, 'stroke-width': 4, 'stroke-linecap': 'round',
      });
      // Arrow head triangle
      svg.path(`M ${ax2 - 2} ${ay - 8} L ${ax2 + 10} ${ay} L ${ax2 - 2} ${ay + 8} Z`, {
        fill: color,
      });
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: horizontal cards in vertical list, left color strip, flat circles, thin connectors

function renderFlat(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const count = data.nodes.length;
  const cardW = 420;
  const cardH = 60;
  const gap = 8;
  const connH = 24;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * cardH + (count - 1) * (gap + connH);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const y = contentTop + i * (cardH + gap + connH);

    svg.beginItem(`nodes[${i}]`);
    // Flat card — no shadow
    svg.rect(pad, y, cardW, cardH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, cardH - 8, { fill: color, rx: 2 });
    // Flat circle with number
    svg.circle(pad + 36, y + cardH / 2, 16, { fill: color });
    svg.text(pad + 36, y + cardH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#FFFFFF',
    });
    // Text left-aligned
    drawLabelBlock(svg, d, node.label, node.description, pad + 68, y + (node.description ? cardH / 2 - 4 : cardH / 2 + 5), cardW - 88, 'start', `nodes[${i}]`);
    svg.endItem();

    // Thin vertical connector
    if (i < count - 1) {
      const lineX = pad + 36;
      const lineY1 = y + cardH;
      const lineY2 = lineY1 + gap + connH;
      svg.path(`M ${lineX} ${lineY1} L ${lineX} ${lineY2}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.4,
      });
      // Small downward chevron
      svg.path(`M ${lineX - 5} ${lineY2 - 6} L ${lineX} ${lineY2} L ${lineX + 5} ${lineY2 - 6}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.4,
      });
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass cards, glow connection lines

function renderGlass(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 230, 200, 60, 48, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (glass)',
    buildColorGradients(d, lay.count, 'pg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);
    const x = cx - lay.stepW / 2;

    svg.beginItem(`nodes[${i}]`);
    // Glow behind card
    svg.rect(x + 4, lay.contentTop + 4, lay.stepW - 8, lay.stepH - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass card
    svg.rect(x, lay.contentTop, lay.stepW, lay.stepH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 20, lay.contentTop + 1, lay.stepW - 40, 1, { fill: color, opacity: 0.4, rx: 0.5 });
    // Icon with glow
    svg.circle(cx, lay.contentTop + 56, 28, { fill: color, opacity: 0.1 });
    svg.circle(cx, lay.contentTop + 56, 20, { fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1 });
    svg.raw(icon(stepIcon(i), cx, lay.contentTop + 56, 18, '#FFFFFF'));
    // Number badge
    svg.text(cx + lay.stepW / 2 - 20, lay.contentTop + 18, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 600, fill: color, opacity: 0.6,
    });
    drawNodeText(svg, d, node, cx, lay.contentTop + 96, lay.stepW - 32, i);
    svg.endItem();

    // Glow connection line
    if (i < lay.count - 1) {
      const ax1 = cx + lay.stepW / 2 + 2;
      const ax2 = ax1 + lay.arrowW - 4;
      const ay = lay.cy();
      svg.path(`M ${ax1} ${ay} L ${ax2} ${ay}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5,
        filter: 'url(#shadow)',
      });
      svg.circle(ax2, ay, 3, { fill: color, opacity: 0.7 });
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon borders, glow arrows, grid background

function renderNeon(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 220, 180, 56, 44, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);
    const x = cx - lay.stepW / 2;

    svg.beginItem(`nodes[${i}]`);
    // Dark card with neon border
    svg.rect(x, lay.contentTop, lay.stepW, lay.stepH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(x, lay.contentTop, lay.stepW, lay.stepH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Neon icon outline
    svg.circle(cx, lay.contentTop + 52, 22, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.raw(icon(stepIcon(i), cx, lay.contentTop + 52, 18, color));
    // Step number
    svg.text(cx + lay.stepW / 2 - 18, lay.contentTop + 18, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    drawNodeText(svg, d, node, cx, lay.contentTop + 92, lay.stepW - 28, i);
    svg.endItem();

    // Neon glow arrow
    if (i < lay.count - 1) {
      const ax1 = cx + lay.stepW / 2 + 4;
      const ax2 = ax1 + lay.arrowW - 8;
      const ay = lay.cy();
      svg.path(`M ${ax1} ${ay} L ${ax2} ${ay}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
      });
      // Arrow head
      svg.path(`M ${ax2 - 6} ${ay - 5} L ${ax2} ${ay} L ${ax2 - 6} ${ay + 5}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
      });
    }
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic: watercolor wash blobs, soft cards, organic connectors

function renderWatercolor(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const lay = computeHorizontalStepLayout(data.nodes.length, 210, 180, 60, 48, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Process diagram (watercolor)',
    buildColorGradients(d, lay.count, 'pg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < lay.count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = lay.cx(i);
    const x = cx - lay.stepW / 2;

    svg.beginItem(`nodes[${i}]`);
    // Watercolor wash blob behind card
    svg.ellipse(cx, lay.contentTop + lay.stepH / 2, lay.stepW / 2 + 12, lay.stepH / 2 + 10, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft card
    svg.rect(x, lay.contentTop, lay.stepW, lay.stepH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });
    // Watercolor circle with number
    svg.circle(cx, lay.contentTop + 48, 22, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(cx, lay.contentTop + 54, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: d.text,
    });
    drawNodeText(svg, d, node, cx, lay.contentTop + 86, lay.stepW - 28, i);
    svg.endItem();

    // Soft organic connector
    if (i < lay.count - 1) {
      const ax1 = cx + lay.stepW / 2 + 4;
      const ax2 = ax1 + lay.arrowW - 8;
      const ay = lay.cy();
      svg.path(`M ${ax1} ${ay} C ${ax1 + 16} ${ay - 8}, ${ax2 - 16} ${ay + 8}, ${ax2} ${ay}`, {
        fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5,
        filter: 'url(#watercolor)',
      });
      svg.circle(ax2, ay, 4, { fill: color, opacity: 0.6, filter: 'url(#watercolor)' });
    }
  }

  return svg.build();
}

// ========== CHEVRON (style) ==========
// PowerPoint SmartArt-like chevron arrows connected horizontally

function renderChevron(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const hasDesc = data.nodes.some(n => n.description);
  const pad = 36;
  const titleH = title ? 44 : 0;
  const chevW = 200;
  const chevH = hasDesc ? 110 : 80;
  const notch = 22; // arrow notch depth
  const overlap = 4; // slight overlap between chevrons
  const totalW = count * chevW - (count - 1) * overlap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + chevH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (chevron)');
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const x = pad + i * (chevW - overlap);
    const y = contentTop;

    // Chevron polygon: all steps have arrow shape (first has rounded left edge via small notch)
    const ln = i === 0 ? 6 : notch; // first step: slight indent instead of flat
    const leftNotch = `${x},${y} ${x + ln},${y + chevH / 2} ${x},${y + chevH} `;
    const points = `${leftNotch}${x + chevW - notch},${y + chevH} ${x + chevW},${y + chevH / 2} ${x + chevW - notch},${y}`;

    svg.beginItem(`nodes[${i}]`);

    if (d.lineJitter) {
      // Sketch: hand-drawn chevron outline, no fill
      svg.polygon(points, { fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth });
    } else if (d.shapeRendering === 'crispEdges') {
      // Pixel: crisp edges
      svg.polygon(points, { fill: color, stroke: d.surface, 'stroke-width': 1, 'shape-rendering': 'crispEdges' });
    } else if (d.id === 'neon') {
      // Neon: dark fill + neon stroke + glow
      svg.polygon(points, { fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1 });
      svg.polygon(points, { fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3, filter: 'url(#neon-glow)' });
    } else {
      svg.polygon(points, { fill: color, stroke: d.surface, 'stroke-width': 1 });
    }

    // Label text — white on colored background for readability
    const textCx = x + chevW / 2 + (ln - overlap) / 2;
    const maxW = chevW - notch * 2 - 12;
    const labelFit = fitText(node.label, maxW, 2, d.labelSize);
    const lh = Math.round(labelFit.fontSize * 1.4);
    const descFit = node.description ? fitText(node.description, maxW, 2, d.captionSize) : null;
    const totalLines = labelFit.lines.length + (descFit ? descFit.lines.length : 0);
    const textFill = d.id === 'neon' ? color : (d.lineJitter ? d.text : '#FFFFFF');
    const descFill = d.id === 'neon' ? color : (d.lineJitter ? d.text : 'rgba(255,255,255,0.8)');
    let ly = y + chevH / 2 - ((totalLines - 1) * lh) / 2 + 4;
    for (const line of labelFit.lines) {
      svg.text(textCx, ly, line, {
        'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: textFill,
        'data-field': `nodes[${i}].label`,
      });
      ly += lh;
    }
    if (descFit) {
      for (const line of descFit.lines) {
        svg.text(textCx, ly, line, {
          'text-anchor': 'middle', 'font-size': descFit.fontSize, fill: descFill, opacity: d.lineJitter ? 0.7 : 1,
          'data-field': `nodes[${i}].description`,
        });
        ly += Math.round(descFit.fontSize * 1.3);
      }
    }

    // Step number badge
    svg.text(x + chevW - notch - 8, y + 14, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, 'font-weight': 600, fill: d.id === 'neon' ? color : (d.lineJitter ? d.text : '#FFFFFF'), opacity: 0.5,
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== VERTICAL (style) ==========
// Top-to-bottom cards with down arrows, left color accent

function renderVertical(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const pad = 36;
  const titleH = title ? 44 : 0;
  const cardW = 400;
  const cardH = 64;
  const arrowH = 28;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * cardH + (count - 1) * arrowH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (vertical)');
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const cx = pad + cardW / 2;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const y = contentTop + i * (cardH + arrowH);

    svg.beginItem(`nodes[${i}]`);

    // Card with preset-aware styling
    if (d.lineJitter) {
      svg.path(jitterRect(pad, y, cardW, cardH, i * 7), {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.shapeRendering === 'crispEdges') {
      svg.raw(pixelBorder(pad, y, cardW, cardH, color, 3));
      svg.rect(pad + 3, y + 3, cardW - 6, cardH - 6, {
        fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
      });
    } else if (d.id === 'neon') {
      svg.rect(pad, y, cardW, cardH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(pad, y, cardW, cardH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      drawPresetCard(svg, d, pad, y, cardW, cardH, color);
    }

    // Left color accent bar
    if (d.lineJitter) {
      svg.path(jitterLine(pad + 4, y + 6, pad + 4, y + cardH - 6, i * 7 + 100), {
        stroke: color, 'stroke-width': 3, opacity: 0.6,
      });
    } else {
      svg.rect(pad + 1, y + 6, 5, cardH - 12, {
        fill: color, rx: 2,
        ...(d.shapeRendering === 'crispEdges' ? { 'shape-rendering': 'crispEdges' as const } : {}),
      });
    }

    // Number circle
    if (d.id === 'neon') {
      svg.circle(pad + 32, y + cardH / 2, 14, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.text(pad + 32, y + cardH / 2 + 4, `${i + 1}`, {
        'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: color,
      });
    } else {
      svg.circle(pad + 32, y + cardH / 2, 14, { fill: color });
      svg.text(pad + 32, y + cardH / 2 + 4, `${i + 1}`, {
        'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: d.lineJitter ? d.text : '#FFFFFF',
      });
    }

    // Label + description
    drawLabelBlock(svg, d, node.label, node.description, pad + 60, y + (node.description ? cardH / 2 - 4 : cardH / 2 + 5), cardW - 80, 'start', `nodes[${i}]`);
    svg.endItem();

    // Down arrow between cards
    if (i < count - 1) {
      const arrowX = cx;
      const ay1 = y + cardH + 4;
      const ay2 = ay1 + arrowH - 8;
      if (d.lineJitter) {
        svg.path(jitterLine(arrowX, ay1, arrowX, ay2, i * 7 + 50), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, opacity: 0.4,
        });
      } else if (d.id === 'neon') {
        svg.path(`M ${arrowX} ${ay1} L ${arrowX} ${ay2}`, {
          fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
        });
      } else {
        svg.path(`M ${arrowX} ${ay1} L ${arrowX} ${ay2}`, {
          fill: 'none', stroke: d.border, 'stroke-width': 2, opacity: 0.4,
        });
      }
      svg.path(`M ${arrowX - 6} ${ay2 - 6} L ${arrowX} ${ay2} L ${arrowX + 6} ${ay2 - 6}`, {
        fill: 'none', stroke: d.id === 'neon' ? color : d.border, 'stroke-width': 2, opacity: d.id === 'neon' ? 1 : 0.4,
        ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
      });
    }
  }

  return svg.build();
}

// ========== SERPENTINE (style) ==========
// Zigzag rows: left→right then right→left, connected with U-turn arrows

function renderSerpentine(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const perRow = Math.min(4, Math.max(3, Math.ceil(Math.sqrt(count + 1))));
  const rows = Math.ceil(count / perRow);
  const pad = 36;
  const titleH = title ? 44 : 0;
  const stepW = 160;
  const stepH = 80;
  const gapX = 40;
  const gapY = 48;
  const width = pad * 2 + perRow * stepW + (perRow - 1) * gapX;
  const height = pad * 2 + titleH + rows * stepH + (rows - 1) * gapY;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (serpentine)',
    buildColorGradients(d, count, 'pg') + arrowMarkerDef(d));
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const row = Math.floor(i / perRow);
    const col = i % perRow;
    const reversed = row % 2 === 1;
    const actualCol = reversed ? perRow - 1 - col : col;

    const x = pad + actualCol * (stepW + gapX);
    const y = contentTop + row * (stepH + gapY);
    const cx = x + stepW / 2;

    svg.beginItem(`nodes[${i}]`);

    // Step card — use jitterRect for sketch preset
    if (d.lineJitter) {
      svg.path(jitterRect(x, y, stepW, stepH, i * 7), {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(x + 4, y + 3, x + stepW - 4, y + 3, i * 7 + 100), {
        stroke: color, 'stroke-width': 2, opacity: 0.6,
      });
    } else {
      drawPresetCard(svg, d, x, y, stepW, stepH, color);
    }

    // Number badge
    svg.circle(x + stepW - 16, y + 14, 10, { fill: color });
    svg.text(x + stepW - 16, y + 18, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: d.lineJitter ? d.text : '#FFFFFF',
    });

    // Label
    drawLabelBlock(svg, d, node.label, node.description, cx, y + (node.description ? stepH / 2 - 2 : stepH / 2 + 5), stepW - 24, 'middle', `nodes[${i}]`);

    svg.endItem();

    // Arrows — use jitterLine for sketch preset
    if (i < count - 1) {
      const nextRow = Math.floor((i + 1) / perRow);
      if (nextRow === row) {
        // Horizontal arrow within same row
        const nextCol = (i + 1) % perRow;
        const nextActualCol = reversed ? perRow - 1 - nextCol : nextCol;
        const dir = nextActualCol > actualCol ? 1 : -1;
        const ax1 = dir > 0 ? x + stepW + 4 : x - 4;
        const ax2 = dir > 0 ? ax1 + gapX - 12 : ax1 - gapX + 12;
        const ay = y + stepH / 2;
        if (d.lineJitter) {
          svg.path(jitterLine(ax1, ay, ax2, ay, i * 7 + 50), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, 'marker-end': 'url(#arr)',
          });
        } else {
          svg.path(`M ${ax1} ${ay} L ${ax2} ${ay}`, {
            fill: 'none', stroke: d.border, 'stroke-width': 2, 'marker-end': 'url(#arr)',
          });
        }
      } else {
        // U-turn: down from current, then across to next row start
        const ay1 = y + stepH + 4;
        const ay2 = ay1 + gapY - 8;
        const nextReversed = nextRow % 2 === 1;
        const nextActualCol = nextReversed ? perRow - 1 : 0;
        const nx = pad + nextActualCol * (stepW + gapX) + stepW / 2;
        if (d.lineJitter) {
          svg.path(jitterLine(cx, ay1, cx, (ay1 + ay2) / 2, i * 7 + 60), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
          svg.path(jitterLine(cx, (ay1 + ay2) / 2, nx, (ay1 + ay2) / 2, i * 7 + 70), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
          svg.path(jitterLine(nx, (ay1 + ay2) / 2, nx, ay2, i * 7 + 80), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, 'marker-end': 'url(#arr)',
          });
        } else {
          svg.path(`M ${cx} ${ay1} L ${cx} ${(ay1 + ay2) / 2} L ${nx} ${(ay1 + ay2) / 2} L ${nx} ${ay2}`, {
            fill: 'none', stroke: d.border, 'stroke-width': 2, 'marker-end': 'url(#arr)',
          });
        }
      }
    }
  }

  return svg.build();
}

// ========== STAIRCASE (style) ==========
// Steps stacking upward from bottom-left to top-right, like stairs

function renderStaircase(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const pad = 36;
  const titleH = title ? 44 : 0;
  const stepW = 160;
  const stepH = 56;
  const offsetX = 48; // horizontal offset per stair
  const offsetY = 48; // vertical offset per stair (going up)
  const totalW = stepW + (count - 1) * offsetX;
  const totalH = stepH + (count - 1) * offsetY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (staircase)',
    buildColorGradients(d, count, 'pg'));
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    // Bottom-left to top-right: step 0 is bottom-left, step N-1 is top-right
    const x = pad + i * offsetX;
    const y = contentTop + totalH - stepH - i * offsetY;

    svg.beginItem(`nodes[${i}]`);

    // Step block — preset-aware
    if (d.lineJitter) {
      svg.path(jitterRect(x, y, stepW, stepH, i * 7), {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
      });
      // Color accent at top
      svg.path(jitterLine(x + 4, y + 3, x + stepW - 4, y + 3, i * 7 + 100), {
        stroke: color, 'stroke-width': 2, opacity: 0.6,
      });
    } else if (d.shapeRendering === 'crispEdges') {
      svg.raw(pixelBorder(x, y, stepW, stepH, color, 3));
      svg.rect(x + 3, y + 3, stepW - 6, stepH - 6, {
        fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
      });
    } else if (d.id === 'neon') {
      svg.rect(x, y, stepW, stepH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(x, y, stepW, stepH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(x, y, stepW, stepH, {
        fill: color, rx: d.borderRadius, opacity: 0.85,
      });
      svg.rect(x + 3, y + 3, stepW - 6, stepH - 6, {
        fill: d.surface, rx: Math.max(0, d.borderRadius - 2), opacity: 0.7,
      });
    }

    // Number
    svg.text(x + 16, y + 20, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700,
      fill: d.id === 'neon' ? color : (d.lineJitter ? d.text : color),
      ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
    });

    // Label
    drawLabelBlock(svg, d, node.label, node.description, x + stepW / 2 + 8, y + (node.description ? stepH / 2 - 2 : stepH / 2 + 5), stepW - 48, 'middle', `nodes[${i}]`);
    svg.endItem();

    // Connector arrow from this step to next (diagonal upward-right)
    if (i < count - 1) {
      const nextX = pad + (i + 1) * offsetX;
      const nextY = contentTop + totalH - stepH - (i + 1) * offsetY;
      const ax1 = x + stepW / 2 + offsetX / 2;
      const ay1 = y - 2;
      const ax2 = nextX + stepW / 2 - offsetX / 2;
      const ay2 = nextY + stepH + 2;
      if (d.lineJitter) {
        svg.path(jitterLine(ax1, ay1, ax2, ay2, i * 7 + 50), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, opacity: 0.5,
        });
      } else if (d.id === 'neon') {
        svg.path(`M ${ax1} ${ay1} C ${ax1} ${ay1 - 12}, ${ax2} ${ay2 + 12}, ${ax2} ${ay2}`, {
          fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
        });
      } else {
        svg.path(`M ${ax1} ${ay1} C ${ax1} ${ay1 - 12}, ${ax2} ${ay2 + 12}, ${ax2} ${ay2}`, {
          fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5,
        });
      }
      // Arrow head
      svg.path(`M ${ax2 - 4} ${ay2 + 6} L ${ax2} ${ay2} L ${ax2 + 4} ${ay2 + 6}`, {
        fill: 'none', stroke: d.id === 'neon' ? color : color, 'stroke-width': 2, opacity: d.id === 'neon' ? 1 : 0.5,
        ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
      });
    }
  }

  return svg.build();
}

// ========== NUMBERED (style) ==========
// Large numbered circles, no arrows, horizontal layout

function renderNumbered(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const pad = 40;
  const titleH = title ? 48 : 0;
  const colW = 180;
  const stepH = 180;
  const gap = 24;
  const totalW = count * colW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + stepH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (numbered)');
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const cx = pad + i * (colW + gap) + colW / 2;

    svg.beginItem(`nodes[${i}]`);

    // Large numbered circle (60px diameter)
    const circleR = 30;
    const circleY = contentTop + circleR + 8;

    if (d.lineJitter) {
      // Sketch: hand-drawn circle outline
      svg.circle(cx, circleY, circleR, { fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth });
      const numStr = String(i + 1).padStart(2, '0');
      svg.text(cx, circleY + 8, numStr, {
        'text-anchor': 'middle', 'font-size': 22, 'font-weight': 800, fill: d.text,
      });
    } else if (d.shapeRendering === 'crispEdges') {
      // Pixel: crisp circle
      svg.circle(cx, circleY, circleR, { fill: color, 'shape-rendering': 'crispEdges' });
      const numStr = String(i + 1).padStart(2, '0');
      svg.text(cx, circleY + 8, numStr, {
        'text-anchor': 'middle', 'font-size': 22, 'font-weight': 800, fill: d.bg,
      });
    } else if (d.id === 'neon') {
      // Neon: dark fill + neon stroke + glow
      svg.circle(cx, circleY, circleR, { fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 2 });
      svg.circle(cx, circleY, circleR, { fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.3, filter: 'url(#neon-glow)' });
      const numStr = String(i + 1).padStart(2, '0');
      svg.text(cx, circleY + 8, numStr, {
        'text-anchor': 'middle', 'font-size': 22, 'font-weight': 800, fill: color,
      });
    } else {
      svg.circle(cx, circleY, circleR, { fill: color });
      const numStr = String(i + 1).padStart(2, '0');
      svg.text(cx, circleY + 8, numStr, {
        'text-anchor': 'middle', 'font-size': 22, 'font-weight': 800, fill: '#FFFFFF',
      });
    }

    // Label + description below the circle
    drawNodeText(svg, d, node, cx, circleY + circleR + 20, colW - 24, i);
    svg.endItem();
  }

  return svg.build();
}

// ========== PIPELINE (style) ==========
// Horizontal pipeline bars with triangular gate dividers

function renderPipeline(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const pad = 40;
  const titleH = title ? 48 : 0;
  const barW = 160;
  const barH = 64;
  const gateW = 16; // triangle separator width
  const totalW = count * barW + (count - 1) * gateW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + barH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (pipeline)');
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    const x = pad + i * (barW + gateW);
    const y = contentTop;

    svg.beginItem(`nodes[${i}]`);

    // Bar rectangle — preset-aware
    if (d.lineJitter) {
      svg.path(jitterRect(x, y, barW, barH, i * 7), {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
      });
      // Color accent at top
      svg.path(jitterLine(x + 4, y + 3, x + barW - 4, y + 3, i * 7 + 100), {
        stroke: color, 'stroke-width': 2, opacity: 0.6,
      });
    } else if (d.shapeRendering === 'crispEdges') {
      svg.raw(pixelBorder(x, y, barW, barH, color, 3));
      svg.rect(x + 3, y + 3, barW - 6, barH - 6, {
        fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
      });
    } else if (d.id === 'neon') {
      svg.rect(x, y, barW, barH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: i === 0 ? d.borderRadius : 0,
      });
      svg.rect(x, y, barW, barH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: i === 0 ? d.borderRadius : 0,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(x, y, barW, barH, {
        fill: color, opacity: 0.85, rx: i === 0 ? d.borderRadius : 0,
      });
      svg.rect(x + 2, y + 2, barW - 4, barH - 4, {
        fill: d.surface, opacity: 0.6, rx: i === 0 ? Math.max(0, d.borderRadius - 2) : 0,
      });
    }

    // Step number (top-left badge)
    svg.text(x + 14, y + 18, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700,
      fill: d.id === 'neon' ? color : (d.lineJitter ? d.text : color),
      opacity: 0.7,
      ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
    });

    // Label + description
    drawLabelBlock(svg, d, node.label, node.description, x + barW / 2, y + (node.description ? barH / 2 + 2 : barH / 2 + 6), barW - 28, 'middle', `nodes[${i}]`);
    svg.endItem();

    // Triangle gate separator between stages
    if (i < count - 1) {
      const gx = x + barW;
      const nextColor = stepColor(d, i + 1);
      if (d.lineJitter) {
        // Sketch: hand-drawn triangle
        svg.path(jitterLine(gx, y, gx + gateW, y + barH / 2, i * 7 + 200), {
          stroke: d.border, 'stroke-width': d.borderWidth, fill: 'none',
        });
        svg.path(jitterLine(gx + gateW, y + barH / 2, gx, y + barH, i * 7 + 210), {
          stroke: d.border, 'stroke-width': d.borderWidth, fill: 'none',
        });
      } else if (d.shapeRendering === 'crispEdges') {
        svg.polygon(`${gx},${y} ${gx + gateW},${y + barH / 2} ${gx},${y + barH}`, {
          fill: color, opacity: 0.6, 'shape-rendering': 'crispEdges',
        });
      } else if (d.id === 'neon') {
        svg.polygon(`${gx},${y} ${gx + gateW},${y + barH / 2} ${gx},${y + barH}`, {
          fill: 'none', stroke: color, 'stroke-width': 1, filter: 'url(#neon-glow)',
        });
      } else {
        // Triangle pointing right
        svg.polygon(`${gx},${y} ${gx + gateW},${y + barH / 2} ${gx},${y + barH}`, {
          fill: color, opacity: 0.6,
        });
        // Small background fill for next bar connection
        svg.rect(gx, y, gateW, barH, {
          fill: nextColor, opacity: 0.15,
        });
      }
    }
  }

  return svg.build();
}

// ========== ESCALATION (style variant) ==========
// Ascending staircase from bottom-left to top-right, emphasizing escalation/progression

function renderEscalation(data: ProcessData, title: string | undefined, d: DesignPreset): string {
  const count = data.nodes.length;
  const pad = 44;
  const titleH = title ? 48 : 0;
  const stepW = 160;
  const stepH = 72;
  const riseY = 60; // vertical rise per step
  const riseX = 20; // horizontal stagger per step
  const totalW = count * stepW + (count - 1) * riseX;
  const totalH = stepH + (count - 1) * riseY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Process diagram (escalation)',
    buildColorGradients(d, count, 'pg'));
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const node = data.nodes[i]!;
    const color = stepColor(d, i);
    // Bottom-left = step 0, top-right = step N-1
    const x = pad + i * (stepW + riseX);
    const y = contentTop + totalH - stepH - i * riseY;

    svg.beginItem(`nodes[${i}]`);

    // Step block
    if (d.lineJitter) {
      svg.path(jitterRect(x, y, stepW, stepH, i * 7), {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(x + 4, y + 3, x + stepW - 4, y + 3, i * 7 + 100), {
        stroke: color, 'stroke-width': 2, opacity: 0.6,
      });
    } else if (d.shapeRendering === 'crispEdges') {
      svg.raw(pixelBorder(x, y, stepW, stepH, color, 3));
      svg.rect(x + 3, y + 3, stepW - 6, stepH - 6, {
        fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
      });
    } else if (d.id === 'neon') {
      svg.rect(x, y, stepW, stepH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(x, y, stepW, stepH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else if (d.id === 'bold') {
      svg.rect(x, y, stepW, stepH, {
        fill: color, opacity: 0.85, rx: d.borderRadius, filter: 'url(#bold-offset)',
      });
      svg.rect(x + 3, y + 3, stepW - 6, stepH - 6, {
        fill: d.surface, rx: Math.max(0, d.borderRadius - 2), opacity: 0.7,
      });
    } else if (d.id === 'watercolor') {
      svg.rect(x, y, stepW, stepH, {
        fill: color, opacity: 0.2, rx: d.borderRadius, filter: 'url(#watercolor)',
      });
      svg.rect(x + 2, y + 2, stepW - 4, stepH - 4, {
        fill: d.surface, opacity: 0.5, rx: d.borderRadius,
      });
    } else {
      svg.rect(x, y, stepW, stepH, {
        fill: color, rx: d.borderRadius, opacity: 0.12,
      });
      svg.rect(x, y, stepW, stepH, {
        fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth,
        rx: d.borderRadius, ...d.cardAttrs(),
      });
      // Color accent at top
      svg.rect(x + 12, y + 1, stepW - 24, 3, { fill: color, rx: 1.5 });
    }

    // Level indicator (left side)
    const levelLabel = `Lv.${i + 1}`;
    svg.text(x + 14, y + 18, levelLabel, {
      'text-anchor': 'start', 'font-size': 10, 'font-weight': 700,
      fill: d.id === 'neon' ? color : (d.lineJitter ? d.text : color),
      opacity: 0.7,
      ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
    });

    // Label + description
    drawLabelBlock(svg, d, node.label, node.description,
      x + stepW / 2, y + (node.description ? stepH / 2 + 6 : stepH / 2 + 10), stepW - 36, 'middle', `nodes[${i}]`);
    svg.endItem();

    // Connector arrow from this step to next (upward-right curve)
    if (i < count - 1) {
      const nextX = pad + (i + 1) * (stepW + riseX);
      const nextY = contentTop + totalH - stepH - (i + 1) * riseY;
      const ax1 = x + stepW;
      const ay1 = y + stepH / 2;
      const ax2 = nextX;
      const ay2 = nextY + stepH / 2;

      if (d.lineJitter) {
        svg.path(jitterLine(ax1, ay1, ax2, ay2, i * 7 + 50), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, opacity: 0.5,
        });
      } else if (d.id === 'neon') {
        svg.path(`M ${ax1} ${ay1} C ${ax1 + riseX} ${ay1}, ${ax2 - riseX} ${ay2}, ${ax2} ${ay2}`, {
          fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
        });
      } else {
        svg.path(`M ${ax1} ${ay1} C ${ax1 + riseX} ${ay1}, ${ax2 - riseX} ${ay2}, ${ax2} ${ay2}`, {
          fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5,
        });
      }
      // Arrowhead pointing right-up
      svg.path(`M ${ax2 - 6} ${ay2 - 4} L ${ax2} ${ay2} L ${ax2 - 6} ${ay2 + 4}`, {
        fill: 'none', stroke: d.id === 'neon' ? color : color, 'stroke-width': 2,
        opacity: d.id === 'neon' ? 1 : 0.5,
        ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
      });
    }
  }

  // Upward arrow at the top-right corner indicating escalation direction
  const arrowX = width - pad - 10;
  const arrowTopY = contentTop + 10;
  const arrowBotY = contentTop + totalH + 10;
  if (d.id === 'neon') {
    svg.line(arrowX, arrowBotY, arrowX, arrowTopY, {
      stroke: d.primary, 'stroke-width': 2, opacity: 0.4, filter: 'url(#neon-glow)',
    });
    svg.path(`M ${arrowX - 6} ${arrowTopY + 8} L ${arrowX} ${arrowTopY} L ${arrowX + 6} ${arrowTopY + 8}`, {
      fill: 'none', stroke: d.primary, 'stroke-width': 2, opacity: 0.6, filter: 'url(#neon-glow)',
    });
  } else if (!d.lineJitter && d.shapeRendering !== 'crispEdges') {
    svg.line(arrowX, arrowBotY, arrowX, arrowTopY, {
      stroke: d.border, 'stroke-width': 1.5, opacity: 0.2, 'stroke-dasharray': '6,4',
    });
    svg.path(`M ${arrowX - 5} ${arrowTopY + 7} L ${arrowX} ${arrowTopY} L ${arrowX + 5} ${arrowTopY + 7}`, {
      fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.3,
    });
  }

  return svg.build();
}
