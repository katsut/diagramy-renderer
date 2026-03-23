// Matrix 2x2 scatter renderer — plots items on XY axes, design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface Axes {
  x: string;
  y: string;
}

interface MapItem {
  name: string;
  x: number;  // 0-1
  y: number;  // 0-1
}

interface Matrix2x2Data {
  axes: Axes;
  items: MapItem[];
}

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderMatrix2x2(data: Matrix2x2Data, title?: string, design?: DesignPreset): string {
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

// --- Shared: map item (x,y) to plot coordinates ---

function plotCoords(
  item: MapItem, plotLeft: number, plotTop: number, plotW: number, plotH: number,
): { px: number; py: number } {
  const px = plotLeft + item.x * plotW;
  const py = plotTop + (1 - item.y) * plotH; // y=1 is top
  return { px, py };
}

// ========== CLEAN ==========

function renderClean(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 56;
  const titleH = title ? 48 : 0;
  const axisLabelSpace = 28;
  const plotW = 380;
  const plotH = 320;
  const legendH = data.items.length > 6 ? 52 : 36;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter diagram',
    buildColorGradients(d, data.items.length, 'mc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Outer container
  drawPresetCard(svg, d, plotLeft - 4, plotTop - 4, plotW + 8, plotH + 8);

  // Grid lines at 0.5
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.3, 'stroke-dasharray': '4 4',
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.3, 'stroke-dasharray': '4 4',
  });

  // Axes
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1.5,
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1.5,
  });

  // Axis labels
  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  // Plot items
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    // Glow ring
    svg.circle(px, py, 18, { fill: color, opacity: 0.1 });
    // Gradient circle
    svg.circle(px, py, 12, { fill: `url(#mc${i})`, stroke: 'white', 'stroke-width': 2 });
    // Label
    const fit = fitText(item.name, 80, 1, 10);
    svg.text(px, py + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Legend
  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 12, plotW);

  return svg.build();
}

function drawAxisLabels(
  svg: SvgBuilder, d: DesignPreset, axes: Axes,
  plotLeft: number, plotTop: number, plotW: number, plotH: number, space: number,
): void {
  // X axis label (bottom center)
  const xFit = fitText(axes.x, plotW - 20, 1, 13);
  svg.text(plotLeft + plotW / 2, plotTop + plotH + space - 4, xFit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': xFit.fontSize, 'font-weight': 600, fill: d.textSecondary,
  });

  // Y axis label (left, rotated)
  const yFit = fitText(axes.y, plotH - 20, 1, 13);
  svg.raw(
    `<text x="${plotLeft - space + 6}" y="${plotTop + plotH / 2}" ` +
    `text-anchor="middle" font-size="${yFit.fontSize}" font-weight="600" fill="${d.textSecondary}" ` +
    `transform="rotate(-90 ${plotLeft - space + 6} ${plotTop + plotH / 2})">${yFit.lines[0]!}</text>`,
  );
}

function drawCleanLegend(
  svg: SvgBuilder, d: DesignPreset, items: MapItem[], x: number, y: number, maxW: number,
): void {
  const perItem = 90;
  const cols = Math.min(items.length, Math.floor(maxW / perItem));
  const totalLegendW = cols * perItem;
  const startX = x + (maxW - totalLegendW) / 2;

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const lx = startX + col * perItem;
    const ly = y + row * 18;
    const color = itemColor(d, i);

    svg.circle(lx + 5, ly, 4, { fill: color });
    const fit = fitText(items[i]!.name, perItem - 16, 1, 10);
    svg.text(lx + 14, ly + 3, fit.lines[0]!, {
      'font-size': fit.fontSize, fill: d.textSecondary,
    });
  }
}

// ========== BOLD ==========
// Pop style: colored quadrant bg, offset shadow dots, thick axes

function renderBold(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 60;
  const titleH = title ? 56 : 0;
  const axisLabelSpace = 32;
  const plotW = 400;
  const plotH = 340;
  const legendH = data.items.length > 6 ? 56 : 40;
  const width = pad * 2 + axisLabelSpace + plotW + 24;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (bold)',
    buildColorGradients(d, data.items.length, 'mc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Colored quadrant backgrounds
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  const quadColors = [d.colors[0]!, d.colors[1]!, d.colors[2]!, d.colors[3] ?? d.colors[0]!];
  const quadPositions = [
    { x: plotLeft, y: plotTop, w: plotW / 2, h: plotH / 2 },
    { x: midX, y: plotTop, w: plotW / 2, h: plotH / 2 },
    { x: plotLeft, y: midY, w: plotW / 2, h: plotH / 2 },
    { x: midX, y: midY, w: plotW / 2, h: plotH / 2 },
  ];
  for (let qi = 0; qi < 4; qi++) {
    const q = quadPositions[qi]!;
    svg.rect(q.x, q.y, q.w, q.h, {
      fill: quadColors[qi]!, opacity: 0.06, rx: qi === 0 ? d.borderRadius : 0,
    });
  }

  // Thick axes
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 3,
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 3,
  });
  // Dashed midlines
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.2, 'stroke-dasharray': '6 4',
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.2, 'stroke-dasharray': '6 4',
  });

  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    svg.circle(px, py, 16, { fill: color, filter: 'url(#bold-offset)' });
    svg.text(px, py + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#FFFFFF',
    });
    const fit = fitText(item.name, 85, 1, 11);
    svg.text(px, py + 26, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: d.text,
    });
  }

  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 14, plotW);

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat plot area, flat dots, no shadows

function renderFlat(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 44 : 0;
  const axisLabelSpace = 28;
  const plotW = 380;
  const plotH = 320;
  const legendH = data.items.length > 6 ? 52 : 36;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Flat plot background
  svg.rect(plotLeft, plotTop, plotW, plotH, { fill: d.surface, rx: d.borderRadius });

  // Grid lines at 0.5
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.15,
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.15,
  });

  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    svg.circle(px, py, 12, { fill: color, opacity: 0.85 });
    const fit = fitText(item.name, 80, 1, 10);
    svg.text(px, py + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 12, plotW);

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass plot area, glow dots

function renderGlass(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 60;
  const titleH = title ? 52 : 0;
  const axisLabelSpace = 30;
  const plotW = 390;
  const plotH = 330;
  const legendH = data.items.length > 6 ? 52 : 36;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (glass)',
    buildColorGradients(d, data.items.length, 'mc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Frosted glass plot area
  svg.rect(plotLeft - 4, plotTop - 4, plotW + 8, plotH + 8, {
    fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
    ...d.cardAttrs(),
  });

  // Grid lines with glow
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '4 4',
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '4 4',
  });

  // Axes
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.5,
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.5,
  });

  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    // Glow ring
    svg.circle(px, py, 20, { fill: color, opacity: 0.08, filter: 'url(#shadow)' });
    svg.circle(px, py, 12, {
      fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });
    const fit = fitText(item.name, 80, 1, 10);
    svg.text(px, py + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'letter-spacing': '0.3',
    });
  }

  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 12, plotW);

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon axes, glow dots

function renderNeon(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 56;
  const titleH = title ? 52 : 0;
  const axisLabelSpace = 28;
  const plotW = 380;
  const plotH = 320;
  const legendH = data.items.length > 6 ? 52 : 36;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Neon axes
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.primary, 'stroke-width': 1, opacity: 0.6,
  });
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.primary, 'stroke-width': 2, opacity: 0.2, filter: 'url(#neon-glow)',
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.primary, 'stroke-width': 1, opacity: 0.6,
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.primary, 'stroke-width': 2, opacity: 0.2, filter: 'url(#neon-glow)',
  });

  // Grid lines
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 0.5, opacity: 0.2, 'stroke-dasharray': '4 4',
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 0.5, opacity: 0.2, 'stroke-dasharray': '4 4',
  });

  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    // Neon glow dot
    svg.circle(px, py, 12, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1.5,
    });
    svg.circle(px, py, 12, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.3, filter: 'url(#neon-glow)',
    });
    svg.text(px, py + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: color,
    });
    const fit = fitText(item.name, 80, 1, 10);
    svg.text(px, py + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 12, plotW);

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft plot, watercolor dots, muted palette

function renderWatercolor(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 60;
  const titleH = title ? 52 : 0;
  const axisLabelSpace = 28;
  const plotW = 380;
  const plotH = 320;
  const legendH = data.items.length > 6 ? 52 : 36;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + legendH + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (watercolor)',
    buildColorGradients(d, data.items.length, 'mc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Grid lines at 0.5
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.line(midX, plotTop, midX, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '4 4',
  });
  svg.line(plotLeft, midY, plotLeft + plotW, midY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '4 4',
  });

  // Axes
  svg.line(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1.5, opacity: 0.4, filter: 'url(#watercolor)',
  });
  svg.line(plotLeft, plotTop, plotLeft, plotTop + plotH, {
    stroke: d.border, 'stroke-width': 1.5, opacity: 0.4, filter: 'url(#watercolor)',
  });

  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    // Watercolor blob
    svg.circle(px, py, 20, { fill: color, opacity: 0.1, filter: 'url(#watercolor)' });
    svg.circle(px, py, 12, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    const fit = fitText(item.name, 80, 1, 10);
    svg.text(px, py + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  drawCleanLegend(svg, d, data.items, plotLeft, plotTop + plotH + axisLabelSpace + 12, plotW);

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 56;
  const titleH = title ? 48 : 0;
  const axisLabelSpace = 28;
  const plotW = 360;
  const plotH = 300;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Hand-drawn axes
  svg.path(jitterLine(plotLeft, plotTop + plotH, plotLeft + plotW, plotTop + plotH, 10), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });
  svg.path(jitterLine(plotLeft, plotTop, plotLeft, plotTop + plotH, 11), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });

  // Hand-drawn grid lines at midpoint
  const midX = plotLeft + plotW / 2;
  const midY = plotTop + plotH / 2;
  svg.path(jitterLine(midX, plotTop + 8, midX, plotTop + plotH - 8, 12), {
    fill: 'none', stroke: d.border, 'stroke-width': 0.8, opacity: 0.3,
  });
  svg.path(jitterLine(plotLeft + 8, midY, plotLeft + plotW - 8, midY, 13), {
    fill: 'none', stroke: d.border, 'stroke-width': 0.8, opacity: 0.3,
  });

  // Axis labels
  drawAxisLabels(svg, d, data.axes, plotLeft, plotTop, plotW, plotH, axisLabelSpace);

  // Plot items as hand-drawn circles
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const { px, py } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    svg.circle(px, py, 10, {
      fill: 'none', stroke: d.border, 'stroke-width': 1.5, filter: 'url(#rough)',
    });
    svg.text(px, py + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: d.text,
    });

    // Name label offset to right
    const fit = fitText(item.name, 80, 1, 11);
    svg.text(px + 14, py + 4, fit.lines[0]!, {
      'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: Matrix2x2Data, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const px = 3;
  const axisLabelSpace = 24;
  const plotW = 330;
  const plotH = 270;
  const width = pad * 2 + axisLabelSpace + plotW + 20;
  const height = pad * 2 + titleH + plotH + axisLabelSpace + 8;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Matrix 2x2 scatter (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const plotLeft = pad + axisLabelSpace;
  const plotTop = pad + titleH;

  // Pixel axes
  for (let a = 0; a < Math.floor(plotW / px); a++) {
    svg.rect(plotLeft + a * px, plotTop + plotH, px, px, {
      fill: d.border, 'shape-rendering': 'crispEdges',
    });
  }
  for (let a = 0; a < Math.floor(plotH / px); a++) {
    svg.rect(plotLeft, plotTop + a * px, px, px, {
      fill: d.border, 'shape-rendering': 'crispEdges',
    });
  }

  // Pixel grid lines at midpoint
  const midX = plotLeft + Math.floor(plotW / 2 / px) * px;
  const midY = plotTop + Math.floor(plotH / 2 / px) * px;
  for (let a = 0; a < Math.floor(plotH / (px * 3)); a++) {
    svg.rect(midX, plotTop + a * px * 3, px, px, {
      fill: d.border, opacity: 0.3, 'shape-rendering': 'crispEdges',
    });
  }
  for (let a = 0; a < Math.floor(plotW / (px * 3)); a++) {
    svg.rect(plotLeft + a * px * 3, midY, px, px, {
      fill: d.border, opacity: 0.3, 'shape-rendering': 'crispEdges',
    });
  }

  // Axis labels
  const xFit = fitText(data.axes.x, plotW - 20, 1, d.labelSize);
  svg.text(plotLeft + plotW / 2, plotTop + plotH + axisLabelSpace - 2, xFit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': xFit.fontSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
  });
  const yFit = fitText(data.axes.y, plotH - 20, 1, d.labelSize);
  svg.raw(
    `<text x="${plotLeft - axisLabelSpace + 8}" y="${plotTop + plotH / 2}" ` +
    `text-anchor="middle" font-size="${yFit.fontSize}" font-weight="${d.fontWeight}" fill="${d.textSecondary}" ` +
    `transform="rotate(-90 ${plotLeft - axisLabelSpace + 8} ${plotTop + plotH / 2})">${yFit.lines[0]!}</text>`,
  );

  // Plot items as pixel squares
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const { px: posX, py: posY } = plotCoords(item, plotLeft, plotTop, plotW, plotH);

    // Snap to pixel grid
    const sx = Math.round(posX / px) * px;
    const sy = Math.round(posY / px) * px;
    const size = px * 3;

    // Pixel square with border
    svg.rect(sx - size, sy - size, size * 2, size * 2, {
      fill: color, 'shape-rendering': 'crispEdges',
    });
    svg.rect(sx - size + px, sy - size + px, size * 2 - px * 2, size * 2 - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    svg.rect(sx - px, sy - px, px * 2, px * 2, {
      fill: color, 'shape-rendering': 'crispEdges',
    });

    // Name label
    const fit = fitText(item.name, 70, 1, 10);
    svg.text(sx + size + 4, sy + 4, fit.lines[0]!, {
      'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });
  }

  return svg.build();
}
