// Timeline renderer — horizontal chronological event display

import { radialGradient } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import { icon } from '../shared/icons.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';
import type { SvgBuilder } from '../shared/svg.js';

interface TimelineEvent {
  time: string;
  event: string;
  details?: string;
}

interface TimelineData {
  events: TimelineEvent[];
}

export function renderTimeline(data: TimelineData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'vertical': return renderVertical(data, title, d);
    case 'serpentine': return renderSerpentine(data, title, d);
    case 'alternating': return renderAlternating(data, title, d);
    case 'grouped': return renderGrouped(data, title, d);
    case 'nested': return renderNested(data, title, d);
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

function eventColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function computeLayout(eventCount: number, stepW: number, hasTitle: boolean) {
  const pad = 48;
  const titleH = hasTitle ? 44 : 0;
  const lineY = 100;
  const cardH = 120;
  const width = pad * 2 + eventCount * stepW;
  const height = pad * 2 + titleH + lineY + cardH + 40;
  const contentTop = pad + titleH;

  return {
    pad, titleH, lineY, cardH, stepW, width, height, contentTop,
    cx: (i: number) => pad + i * stepW + stepW / 2,
    axisY: contentTop + lineY,
  };
}

// ========== CLEAN ==========

function renderClean(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 200, !!title);
  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Horizontal axis line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    svg.beginItem(`events[${i}]`);
    drawCleanDot(svg, d, cx, lay.axisY, color, i);
    drawCleanTime(svg, d, cx, lay.axisY - 28, ev.time, `events[${i}]`);
    drawCleanCard(svg, d, cx, lay.axisY + 20, lay.stepW - 32, lay.cardH, color, ev, i);
    svg.endItem();
  }

  return svg.build();
}

function drawCleanDot(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, color: string, i: number): void {
  svg.circle(cx, cy, 14, { fill: color, opacity: 0.12 });
  svg.circle(cx, cy, 8, { fill: `url(#tg${i})`, stroke: 'white', 'stroke-width': 2 });
  // Vertical connector line
  svg.line(cx, cy + 8, cx, cy + 20, {
    stroke: color, 'stroke-width': 1.5, opacity: 0.4,
  });
}

function drawCleanTime(svg: SvgBuilder, d: DesignPreset, cx: number, y: number, time: string, dataPath?: string): void {
  const fit = fitText(time, 140, 1, d.captionSize);
  for (const line of fit.lines) {
    svg.text(cx, y, line, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
      ...(dataPath ? { 'data-field': `${dataPath}.time` } : {}),
    });
  }
}

function drawCleanCard(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, color: string, ev: TimelineEvent, i: number): void {
  const x = cx - w / 2;
  drawPresetCard(svg, d, x, top, w, h, color);
  drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 24, w - 24, 'middle', `events[${i}]`);
}

// ========== SKETCH ==========

function renderSketch(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 190, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Hand-drawn axis
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.path(jitterLine(lineX1, lay.axisY, lineX2, lay.axisY, 42), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);

    drawSketchMarker(svg, d, cx, lay.axisY, i);
    drawSketchTime(svg, d, cx, lay.axisY - 20, ev.time);
    drawSketchEvent(svg, d, cx, lay.axisY + 24, lay.stepW - 40, lay.cardH, ev, i);
  }

  return svg.build();
}

function drawSketchMarker(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, i: number): void {
  svg.circle(cx, cy, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
  // Vertical tick
  svg.path(jitterLine(cx, cy + 6, cx, cy + 22, i * 19), {
    fill: 'none', stroke: d.border, 'stroke-width': 1,
  });
}

function drawSketchTime(svg: SvgBuilder, d: DesignPreset, cx: number, y: number, time: string): void {
  svg.text(cx, y, time, {
    'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
  });
}

function drawSketchEvent(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, ev: TimelineEvent, i: number): void {
  const x = cx - w / 2;
  svg.path(jitterRect(x, top, w, h, i * 11), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });
  drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 20, w - 20);
}

// ========== PIXEL ==========

function renderPixel(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const n = data.events.length;
  const lay = computeLayout(n, 180, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Pixel axis line
  const lineX1 = lay.pad + 12;
  const lineX2 = lay.width - lay.pad - 12;
  for (let x = lineX1; x < lineX2; x += px) {
    svg.rect(x, lay.axisY - Math.floor(px / 2), px, px, {
      fill: d.border, 'shape-rendering': 'crispEdges',
    });
  }

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    drawPixelMarker(svg, cx, lay.axisY, color, px);
    drawPixelTime(svg, d, cx, lay.axisY - 18, ev.time);
    drawPixelCard(svg, d, cx, lay.axisY + 16, lay.stepW - 28, lay.cardH, color, ev, px, i);
  }

  return svg.build();
}

function drawPixelMarker(svg: SvgBuilder, cx: number, cy: number, color: string, px: number): void {
  // Square marker centered on axis
  const size = px * 4;
  svg.rect(cx - size / 2, cy - size / 2, size, size, {
    fill: color, 'shape-rendering': 'crispEdges',
  });
  // Vertical connector
  for (let y = cy + size / 2; y < cy + 16; y += px) {
    svg.rect(cx - Math.floor(px / 2), y, px, px, {
      fill: color, opacity: 0.6, 'shape-rendering': 'crispEdges',
    });
  }
}

function drawPixelTime(svg: SvgBuilder, d: DesignPreset, cx: number, y: number, time: string): void {
  svg.text(cx, y, time, {
    'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
  });
}

function drawPixelCard(svg: SvgBuilder, d: DesignPreset, cx: number, top: number, w: number, h: number, color: string, ev: TimelineEvent, px: number, i: number): void {
  const x = cx - w / 2;
  svg.raw(pixelBorder(x, top, w, h, color, px));
  svg.rect(x + px, top + px, w - px * 2, h - px * 2, {
    fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
  });
  // Number badge
  svg.rect(x + px, top + px, px * 6, px * 5, { fill: color, 'shape-rendering': 'crispEdges' });
  svg.text(x + px * 3 + 1, top + px * 4, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: d.bg,
  });
  drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 24, w - 24);
}

// ========== BOLD ==========
// Pop style: thick axis, colored cards, offset shadow

function renderBold(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 210, !!title);
  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (bold)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Thick axis line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.border, 'stroke-width': 4, 'stroke-linecap': 'round',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    // Bold dot with thick border
    svg.circle(cx, lay.axisY, 10, { fill: color, stroke: '#111', 'stroke-width': 3 });
    // Vertical connector
    svg.line(cx, lay.axisY + 10, cx, lay.axisY + 20, {
      stroke: d.border, 'stroke-width': 3,
    });
    // Time label
    svg.text(cx, lay.axisY - 20, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': 900, fill: d.text,
    });
    // Card with offset shadow
    const w = lay.stepW - 32;
    const x = cx - w / 2;
    const top = lay.axisY + 22;
    svg.rect(x, top, w, lay.cardH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner
    svg.rect(x + 4, top + 6, w - 8, lay.cardH - 12, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });
    drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 28, w - 28);
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: thin axis, flat cards, left color strip

function renderFlat(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 200, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (flat)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Thin axis line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.border, 'stroke-width': 1, 'stroke-linecap': 'round',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    // Flat dot
    svg.circle(cx, lay.axisY, 6, { fill: color });
    // Vertical connector
    svg.line(cx, lay.axisY + 6, cx, lay.axisY + 18, {
      stroke: d.border, 'stroke-width': 1,
    });
    // Time label
    svg.text(cx, lay.axisY - 16, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });
    // Flat card with left color strip
    const w = lay.stepW - 32;
    const x = cx - w / 2;
    const top = lay.axisY + 20;
    svg.rect(x, top, w, lay.cardH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(x, top + 4, 4, lay.cardH - 8, { fill: color, rx: 2 });
    drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 24, w - 24);
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark background, glow axis, frosted glass cards

function renderGlass(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 210, !!title);
  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (glass)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Glow axis line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.primary, 'stroke-width': 2, opacity: 0.4, 'stroke-linecap': 'round',
  });
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.primary, 'stroke-width': 1, opacity: 0.15, filter: 'url(#shadow)', 'stroke-linecap': 'round',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    // Glow dot
    svg.circle(cx, lay.axisY, 12, { fill: color, opacity: 0.1 });
    svg.circle(cx, lay.axisY, 7, { fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1 });
    // Vertical connector
    svg.line(cx, lay.axisY + 7, cx, lay.axisY + 20, {
      stroke: color, 'stroke-width': 1, opacity: 0.4,
    });
    // Time label
    svg.text(cx, lay.axisY - 22, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight,
      fill: d.textSecondary, 'letter-spacing': '0.3',
    });
    // Frosted glass card
    const w = lay.stepW - 32;
    const x = cx - w / 2;
    const top = lay.axisY + 22;
    // Glow behind
    svg.rect(x + 4, top + 4, w - 8, lay.cardH - 8, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Glass card
    svg.rect(x, top, w, lay.cardH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 16, top + 1, w - 32, 1, { fill: color, opacity: 0.4, rx: 0.5 });
    drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 24, w - 28);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon axis, neon border cards

function renderNeon(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 200, !!title);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Neon axis line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.primary, 'stroke-width': 2, 'stroke-linecap': 'round', filter: 'url(#neon-glow)',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    // Neon dot with glow
    svg.circle(cx, lay.axisY, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.circle(cx, lay.axisY, 3, { fill: color });
    // Vertical connector
    svg.line(cx, lay.axisY + 8, cx, lay.axisY + 20, {
      stroke: color, 'stroke-width': 1, opacity: 0.6,
    });
    // Time label
    svg.text(cx, lay.axisY - 20, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary, 'letter-spacing': '1',
    });
    // Neon border card
    const w = lay.stepW - 32;
    const x = cx - w / 2;
    const top = lay.axisY + 22;
    svg.rect(x, top, w, lay.cardH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(x, top, w, lay.cardH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Index label
    svg.text(x + w - 14, top + 14, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 28, w - 24);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic: watercolor axis + soft cards + bleed

function renderWatercolor(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const lay = computeLayout(n, 210, !!title);
  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Timeline diagram (watercolor)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Watercolor axis — soft painted line
  const lineX1 = lay.pad + 20;
  const lineX2 = lay.width - lay.pad - 20;
  svg.line(lineX1, lay.axisY, lineX2, lay.axisY, {
    stroke: d.border, 'stroke-width': 3, opacity: 0.5, 'stroke-linecap': 'round', filter: 'url(#watercolor)',
  });

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const cx = lay.cx(i);
    const color = eventColor(d, i);

    // Watercolor bleed dot
    svg.circle(cx, lay.axisY, 14, { fill: color, opacity: 0.15, filter: 'url(#watercolor)' });
    svg.circle(cx, lay.axisY, 7, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    // Vertical connector
    svg.line(cx, lay.axisY + 7, cx, lay.axisY + 20, {
      stroke: color, 'stroke-width': 1, opacity: 0.4,
    });
    // Time label
    svg.text(cx, lay.axisY - 22, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });
    // Watercolor wash behind card
    const w = lay.stepW - 32;
    const x = cx - w / 2;
    const top = lay.axisY + 22;
    svg.ellipse(cx, top + lay.cardH / 2, w / 2 + 8, lay.cardH / 2 + 6, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });
    // Soft card
    svg.rect(x, top, w, lay.cardH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });
    drawLabelBlock(svg, d, ev.event, ev.details, cx, top + 24, w - 24);
  }

  return svg.build();
}

// ========== VERTICAL ==========
// Vertical timeline: line on the left, cards to the right

function renderVertical(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const pad = 48;
  const titleH = title ? 44 : 0;
  const cardW = 280;
  const cardH = 90;
  const stepH = cardH + 30;
  // Compute left space for time labels (auto-widen for long labels)
  const maxTimeLen = Math.max(...data.events.map(e => estimateWidth(e.time, d.captionSize)));
  const timeColW = Math.max(60, Math.min(160, maxTimeLen + 24));
  const lineX = pad + timeColW;
  const cardLeft = lineX + 40;
  const width = pad * 2 + timeColW + 40 + cardW;
  const height = pad * 2 + titleH + n * stepH + 20;

  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Timeline diagram (vertical)', gradientDefs);
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

  // Vertical axis line
  const lineTop = contentTop + 10;
  const lineBottom = contentTop + n * stepH - 10;
  if (d.lineJitter) {
    svg.path(jitterLine(lineX, lineTop, lineX, lineBottom, 42), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else if (d.id === 'neon') {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.primary, 'stroke-width': 2, 'stroke-linecap': 'round', filter: 'url(#neon-glow)',
    });
  } else {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.5,
    });
  }

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const color = eventColor(d, i);
    const cy = contentTop + i * stepH + stepH / 2;

    // Dot marker on the line
    if (d.lineJitter) {
      svg.circle(lineX, cy, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    } else if (d.id === 'neon') {
      svg.circle(lineX, cy, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.circle(lineX, cy, 3, { fill: color });
    } else {
      svg.circle(lineX, cy, 12, { fill: color, opacity: 0.15 });
      svg.circle(lineX, cy, 6, { fill: color, stroke: d.surface, 'stroke-width': 2 });
    }

    // Time label to the left of the line
    const fit = fitText(ev.time, timeColW - 24, 1, d.captionSize);
    svg.text(lineX - 18, cy + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });

    // Horizontal connector
    if (d.lineJitter) {
      svg.path(jitterLine(lineX + 6, cy, cardLeft - 4, cy, i * 19), {
        fill: 'none', stroke: d.border, 'stroke-width': 1,
      });
    } else if (d.id === 'neon') {
      svg.line(lineX + 8, cy, cardLeft - 4, cy, {
        stroke: color, 'stroke-width': 1, opacity: 0.6,
      });
    } else {
      svg.line(lineX + 6, cy, cardLeft - 4, cy, {
        stroke: color, 'stroke-width': 1.5, opacity: 0.4,
      });
    }

    // Card
    if (d.lineJitter) {
      const x = cardLeft;
      svg.path(jitterRect(x, cy - cardH / 2, cardW, cardH, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      drawLabelBlock(svg, d, ev.event, ev.details, cardLeft + cardW / 2, cy - 10, cardW - 28);
    } else if (d.id === 'neon') {
      const x = cardLeft;
      const top = cy - cardH / 2;
      svg.rect(x, top, cardW, cardH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(x, top, cardW, cardH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
      drawLabelBlock(svg, d, ev.event, ev.details, cardLeft + cardW / 2, cy - 10, cardW - 28);
    } else {
      drawPresetCard(svg, d, cardLeft, cy - cardH / 2, cardW, cardH, color);
      drawLabelBlock(svg, d, ev.event, ev.details, cardLeft + cardW / 2, cy - 10, cardW - 28);
    }
  }

  return svg.build();
}

// ========== SERPENTINE ==========
// Zigzag timeline: events snake left-right across rows

function renderSerpentine(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const pad = 48;
  const titleH = title ? 44 : 0;
  const perRow = 3;
  const rows = Math.ceil(n / perRow);
  const cardW = 180;
  const cardH = 100;
  const stepW = cardW + 40;
  const rowH = cardH + 80;
  const width = pad * 2 + perRow * stepW;
  const height = pad * 2 + titleH + rows * rowH + 20;

  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Timeline diagram (serpentine)', gradientDefs);
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 20;

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const color = eventColor(d, i);
    const row = Math.floor(i / perRow);
    const colInRow = i % perRow;
    const reversed = row % 2 === 1;
    const col = reversed ? (perRow - 1 - colInRow) : colInRow;

    const cx = pad + col * stepW + stepW / 2;
    const cy = contentTop + row * rowH + 30;

    // Dot on connector path
    if (d.lineJitter) {
      svg.circle(cx, cy, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    } else if (d.id === 'neon') {
      svg.circle(cx, cy, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.circle(cx, cy, 3, { fill: color });
    } else {
      svg.circle(cx, cy, 10, { fill: color, opacity: 0.15 });
      svg.circle(cx, cy, 5, { fill: color, stroke: d.surface, 'stroke-width': 2 });
    }

    // Time label above dot
    svg.text(cx, cy - 18, ev.time, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });

    // Card below dot
    const cardTop = cy + 16;
    if (d.lineJitter) {
      svg.path(jitterRect(cx - cardW / 2, cardTop, cardW, cardH, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.rect(cx - cardW / 2, cardTop, cardW, cardH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(cx - cardW / 2, cardTop, cardW, cardH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      drawPresetCard(svg, d, cx - cardW / 2, cardTop, cardW, cardH, color);
    }
    drawLabelBlock(svg, d, ev.event, ev.details, cx, cardTop + 20, cardW - 24);

    // Connector to next event
    if (i < n - 1) {
      const nextRow = Math.floor((i + 1) / perRow);
      const nextColInRow = (i + 1) % perRow;
      const nextReversed = nextRow % 2 === 1;
      const nextCol = nextReversed ? (perRow - 1 - nextColInRow) : nextColInRow;
      const nextCx = pad + nextCol * stepW + stepW / 2;
      const nextCy = contentTop + nextRow * rowH + 30;

      if (nextRow === row) {
        if (d.lineJitter) {
          svg.path(jitterLine(cx + 6, cy, nextCx - 6, cy, i * 19), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
        } else if (d.id === 'neon') {
          svg.line(cx + 6, cy, nextCx - 6, cy, {
            stroke: color, 'stroke-width': 1.5, filter: 'url(#neon-glow)',
          });
        } else {
          svg.line(cx + 6, cy, nextCx - 6, cy, {
            stroke: d.border, 'stroke-width': 1.5, opacity: 0.3, 'stroke-linecap': 'round',
          });
        }
      } else {
        const turnY = cy + cardH + 30;
        if (d.lineJitter) {
          svg.path(jitterLine(cx, cy + 5, cx, turnY, i * 23), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
          svg.path(jitterLine(cx, turnY, nextCx, turnY, i * 29), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
          svg.path(jitterLine(nextCx, turnY, nextCx, nextCy - 5, i * 37), {
            fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
          });
        } else if (d.id === 'neon') {
          svg.path(`M ${cx} ${cy + 5} L ${cx} ${turnY} L ${nextCx} ${turnY} L ${nextCx} ${nextCy - 5}`, {
            fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
          });
        } else {
          svg.path(`M ${cx} ${cy + 5} L ${cx} ${turnY} L ${nextCx} ${turnY} L ${nextCx} ${nextCy - 5}`, {
            fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.3, 'stroke-linecap': 'round',
          });
        }
      }
    }
  }

  return svg.build();
}

// ========== ALTERNATING (style variant) ==========
// Vertical center line, events alternate left/right with card + dot marker

function renderAlternating(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const pad = 48;
  const titleH = title ? 44 : 0;
  const cardW = 200;
  const cardH = 80;
  const stepH = cardH + 32;
  const lineX = pad + cardW + 40;
  const width = pad * 2 + cardW * 2 + 80;
  const height = pad * 2 + titleH + n * stepH + 20;

  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Timeline (alternating)', gradientDefs);
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

  // Vertical center line
  if (d.lineJitter) {
    svg.path(jitterLine(lineX, contentTop + 10, lineX, contentTop + n * stepH - 10, 42), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else if (d.id === 'neon') {
    svg.line(lineX, contentTop + 10, lineX, contentTop + n * stepH - 10, {
      stroke: d.primary, 'stroke-width': 2, 'stroke-linecap': 'round', filter: 'url(#neon-glow)',
    });
  } else {
    svg.line(lineX, contentTop + 10, lineX, contentTop + n * stepH - 10, {
      stroke: d.border, 'stroke-width': 2, opacity: 0.4, 'stroke-linecap': 'round',
    });
  }

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const color = eventColor(d, i);
    const cy = contentTop + i * stepH + stepH / 2;
    const isLeft = i % 2 === 0;

    // Dot marker on line
    if (d.lineJitter) {
      svg.circle(lineX, cy, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    } else if (d.id === 'neon') {
      svg.circle(lineX, cy, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.circle(lineX, cy, 3, { fill: color });
    } else {
      svg.circle(lineX, cy, 10, { fill: color, opacity: 0.15 });
      svg.circle(lineX, cy, 5, { fill: color, stroke: d.surface, 'stroke-width': 2 });
    }

    // Time label next to marker
    const timeX = isLeft ? lineX + 16 : lineX - 16;
    const timeAnchor = isLeft ? 'start' : 'end';
    svg.text(timeX, cy - 10, ev.time, {
      'text-anchor': timeAnchor, 'font-size': d.captionSize, fill: d.textSecondary,
    });

    // Card on opposite side
    const cardLeftX = isLeft ? lineX - 36 - cardW : lineX + 36;

    // Horizontal connector from line to card
    const connFrom = isLeft ? lineX - 10 : lineX + 10;
    const connTo = isLeft ? cardLeftX + cardW + 4 : cardLeftX - 4;
    if (d.lineJitter) {
      svg.path(jitterLine(connFrom, cy, connTo, cy, i * 19), {
        fill: 'none', stroke: d.border, 'stroke-width': 1,
      });
    } else if (d.id === 'neon') {
      svg.line(connFrom, cy, connTo, cy, {
        stroke: color, 'stroke-width': 1, opacity: 0.6,
      });
    } else {
      svg.line(connFrom, cy, connTo, cy, {
        stroke: color, 'stroke-width': 1.5, opacity: 0.3,
      });
    }

    if (d.lineJitter) {
      svg.path(jitterRect(cardLeftX, cy - cardH / 2, cardW, cardH, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.rect(cardLeftX, cy - cardH / 2, cardW, cardH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(cardLeftX, cy - cardH / 2, cardW, cardH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      drawPresetCard(svg, d, cardLeftX, cy - cardH / 2, cardW, cardH, color);
    }
    drawLabelBlock(svg, d, ev.event, ev.details, cardLeftX + cardW / 2, cy - 10, cardW - 28);
  }

  return svg.build();
}

// ========== GROUPED (style variant) ==========
// Events grouped by period (year / quarter / phase), with section headers

interface GroupedPeriod {
  period: string;
  events: TimelineEvent[];
}

function extractPeriod(ev: TimelineEvent): string {
  const anyEv = ev as unknown as Record<string, unknown>;
  if (typeof anyEv['period'] === 'string') return anyEv['period'];
  if (typeof anyEv['year'] === 'string') return anyEv['year'];
  if (typeof anyEv['year'] === 'number') return String(anyEv['year']);
  const yearMatch = ev.time.match(/\b((?:19|20)\d{2})\b/);
  if (yearMatch) return yearMatch[1]!;
  return ev.time;
}

function groupEvents(events: TimelineEvent[]): GroupedPeriod[] {
  const map = new Map<string, TimelineEvent[]>();
  const order: string[] = [];
  for (const ev of events) {
    const p = extractPeriod(ev);
    if (!map.has(p)) {
      map.set(p, []);
      order.push(p);
    }
    map.get(p)!.push(ev);
  }
  return order.map(p => ({ period: p, events: map.get(p)! }));
}

function renderGrouped(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const groups = groupEvents(data.events);
  const pad = 48;
  const titleH = title ? 44 : 0;
  const headerH = 40;
  const cardH = 70;
  const cardGap = 12;
  const cardW = 300;
  const lineX = pad + 24;
  const cardLeft = lineX + 36;

  let totalContentH = 0;
  for (const g of groups) {
    totalContentH += headerH + g.events.length * (cardH + cardGap) + 16;
  }

  const width = pad * 2 + 60 + cardW;
  const height = pad * 2 + titleH + totalContentH;

  const gradientDefs = buildColorGradients(d, data.events.length, 'tg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Timeline (grouped)', gradientDefs);
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
  let y = contentTop;
  let globalIdx = 0;

  const lineTop = contentTop + 8;
  const lineBottom = contentTop + totalContentH - 8;
  if (d.lineJitter) {
    svg.path(jitterLine(lineX, lineTop, lineX, lineBottom, 42), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else if (d.id === 'neon') {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.primary, 'stroke-width': 2, 'stroke-linecap': 'round', filter: 'url(#neon-glow)',
    });
  } else {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.4,
    });
  }

  for (const g of groups) {
    const periodColor = eventColor(d, globalIdx);
    const headerY = y + headerH / 2 + 4;

    if (d.lineJitter) {
      svg.circle(lineX, headerY, 10, { fill: 'none', stroke: d.border, 'stroke-width': 2 });
    } else if (d.id === 'neon') {
      svg.circle(lineX, headerY, 12, { fill: 'none', stroke: periodColor, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.circle(lineX, headerY, 5, { fill: periodColor });
    } else {
      svg.circle(lineX, headerY, 14, { fill: periodColor, opacity: 0.15 });
      svg.circle(lineX, headerY, 8, { fill: periodColor, stroke: d.surface, 'stroke-width': 2 });
    }

    const periodFit = fitText(g.period, cardW - 20, 1, d.labelSize + 2);
    svg.text(cardLeft + 4, headerY + 2, periodFit.lines[0]!, {
      'text-anchor': 'start', 'font-size': periodFit.fontSize, 'font-weight': 700,
      fill: d.id === 'neon' ? periodColor : d.text,
      ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
    });

    if (d.id === 'neon') {
      svg.line(cardLeft, headerY + 12, cardLeft + cardW - 8, headerY + 12, {
        stroke: periodColor, 'stroke-width': 1, opacity: 0.5, filter: 'url(#neon-glow)',
      });
    } else if (!d.lineJitter) {
      svg.line(cardLeft, headerY + 12, cardLeft + cardW - 8, headerY + 12, {
        stroke: periodColor, 'stroke-width': 2, opacity: 0.3,
      });
    }

    y += headerH;

    for (const ev of g.events) {
      const color = eventColor(d, globalIdx);
      const cardTop = y + 4;
      const dotY = cardTop + cardH / 2;

      if (d.lineJitter) {
        svg.circle(lineX, dotY, 4, { fill: d.border });
      } else if (d.id === 'neon') {
        svg.circle(lineX, dotY, 5, { fill: 'none', stroke: color, 'stroke-width': 1.5 });
      } else {
        svg.circle(lineX, dotY, 5, { fill: color, opacity: 0.4 });
      }

      if (d.lineJitter) {
        svg.path(jitterLine(lineX + 4, dotY, cardLeft - 4, dotY, globalIdx * 19), {
          fill: 'none', stroke: d.border, 'stroke-width': 1, opacity: 0.5,
        });
      } else if (d.id === 'neon') {
        svg.line(lineX + 5, dotY, cardLeft - 4, dotY, {
          stroke: color, 'stroke-width': 1, opacity: 0.4,
        });
      } else {
        svg.line(lineX + 5, dotY, cardLeft - 4, dotY, {
          stroke: color, 'stroke-width': 1, opacity: 0.3,
        });
      }

      if (d.lineJitter) {
        svg.path(jitterRect(cardLeft, cardTop, cardW, cardH, globalIdx * 11), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
        });
      } else if (d.id === 'neon') {
        svg.rect(cardLeft, cardTop, cardW, cardH, {
          fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
        });
        svg.rect(cardLeft, cardTop, cardW, cardH, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
          opacity: 0.3, filter: 'url(#neon-glow)',
        });
      } else {
        drawPresetCard(svg, d, cardLeft, cardTop, cardW, cardH, color);
      }

      const timeFit = fitText(ev.time, 100, 1, d.captionSize - 1);
      svg.text(cardLeft + cardW - 12, cardTop + 16, timeFit.lines[0]!, {
        'text-anchor': 'end', 'font-size': timeFit.fontSize, fill: d.textSecondary,
      });

      drawLabelBlock(svg, d, ev.event, ev.details, cardLeft + cardW / 2, cardTop + 24, cardW - 32);

      y += cardH + cardGap;
      globalIdx++;
    }
    y += 16;
  }

  return svg.build();
}

// ========== NESTED (style variant) ==========
// Each timeline event can have sub-items rendered as indented bullets

function getSubItems(ev: TimelineEvent): string[] {
  const anyEv = ev as unknown as Record<string, unknown>;
  for (const key of ['items', 'children', 'details_list', 'subitems']) {
    const val = anyEv[key];
    if (Array.isArray(val)) {
      return val.filter((v): v is string => typeof v === 'string');
    }
  }
  return [];
}

function renderNested(data: TimelineData, title: string | undefined, d: DesignPreset): string {
  const n = data.events.length;
  const pad = 48;
  const titleH = title ? 44 : 0;
  const lineX = pad + 24;
  const cardLeft = lineX + 36;
  const cardW = 320;
  const baseCardH = 60;
  const subItemH = 22;
  const cardGap = 20;

  const eventHeights: number[] = [];
  for (const ev of data.events) {
    const subs = getSubItems(ev);
    const h = baseCardH + subs.length * subItemH + (subs.length > 0 ? 12 : 0);
    eventHeights.push(h);
  }

  const totalContentH = eventHeights.reduce((sum, h) => sum + h + cardGap, 0);
  const width = pad * 2 + 60 + cardW;
  const height = pad * 2 + titleH + totalContentH;

  const gradientDefs = buildColorGradients(d, n, 'tg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Timeline (nested)', gradientDefs);
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

  const lineTop = contentTop + 8;
  const lineBottom = contentTop + totalContentH - 8;
  if (d.lineJitter) {
    svg.path(jitterLine(lineX, lineTop, lineX, lineBottom, 42), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else if (d.id === 'neon') {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.primary, 'stroke-width': 2, 'stroke-linecap': 'round', filter: 'url(#neon-glow)',
    });
  } else {
    svg.line(lineX, lineTop, lineX, lineBottom, {
      stroke: d.border, 'stroke-width': 2, 'stroke-linecap': 'round', opacity: 0.4,
    });
  }

  let y = contentTop;

  for (let i = 0; i < n; i++) {
    const ev = data.events[i]!;
    const subs = getSubItems(ev);
    const color = eventColor(d, i);
    const cardH = eventHeights[i]!;
    const cardTop = y + 4;
    const dotY = cardTop + 24;

    if (d.lineJitter) {
      svg.circle(lineX, dotY, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    } else if (d.id === 'neon') {
      svg.circle(lineX, dotY, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
      svg.circle(lineX, dotY, 3, { fill: color });
    } else {
      svg.circle(lineX, dotY, 10, { fill: color, opacity: 0.15 });
      svg.circle(lineX, dotY, 6, { fill: color, stroke: d.surface, 'stroke-width': 2 });
    }

    if (d.lineJitter) {
      svg.path(jitterLine(lineX + 6, dotY, cardLeft - 4, dotY, i * 19), {
        fill: 'none', stroke: d.border, 'stroke-width': 1,
      });
    } else if (d.id === 'neon') {
      svg.line(lineX + 8, dotY, cardLeft - 4, dotY, {
        stroke: color, 'stroke-width': 1, opacity: 0.6,
      });
    } else {
      svg.line(lineX + 6, dotY, cardLeft - 4, dotY, {
        stroke: color, 'stroke-width': 1.5, opacity: 0.3,
      });
    }

    if (d.lineJitter) {
      svg.path(jitterRect(cardLeft, cardTop, cardW, cardH, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.rect(cardLeft, cardTop, cardW, cardH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(cardLeft, cardTop, cardW, cardH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      drawPresetCard(svg, d, cardLeft, cardTop, cardW, cardH, color);
    }

    const timeFit = fitText(ev.time, 120, 1, d.captionSize);
    svg.text(cardLeft + cardW - 12, cardTop + 18, timeFit.lines[0]!, {
      'text-anchor': 'end', 'font-size': timeFit.fontSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });

    const labelFit = fitText(ev.event, cardW - 48, 1, d.labelSize);
    svg.text(cardLeft + 16, cardTop + 20, labelFit.lines[0]!, {
      'text-anchor': 'start', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    let subStartY = cardTop + 38;
    if (ev.details) {
      const detFit = fitText(ev.details, cardW - 48, 1, d.captionSize);
      svg.text(cardLeft + 16, subStartY, detFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': detFit.fontSize, fill: d.textSecondary,
      });
      subStartY += 16;
    }

    if (subs.length > 0) {
      subStartY += 4;
      for (let j = 0; j < subs.length; j++) {
        const subY = subStartY + j * subItemH;
        const bulletColor = d.id === 'neon' ? color : (d.lineJitter ? d.border : color);
        svg.circle(cardLeft + 28, subY - 3, 3, { fill: bulletColor, opacity: 0.6 });
        const subFit = fitText(subs[j]!, cardW - 80, 1, d.captionSize);
        svg.text(cardLeft + 40, subY, subFit.lines[0]!, {
          'text-anchor': 'start', 'font-size': subFit.fontSize, fill: d.textSecondary,
        });
      }
    }

    y += cardH + cardGap;
  }

  return svg.build();
}
