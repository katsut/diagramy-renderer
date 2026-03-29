// Stacked bar chart renderer — horizontal stacked bars with legend

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface StackedBarItem {
  label: string;
  values: number[];
}

interface StackedBarData {
  categories: string[];
  items: StackedBarItem[];
}

export function renderStackedBar(data: StackedBarData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'horizontal') return renderHorizontalStyle(data, title, d);
  if (style === 'percentage') return renderPercentage(data, title, d);
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

function catColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// --- Layout ---

interface StackLayout {
  width: number;
  height: number;
  contentTop: number;
  pad: number;
  barH: number;
  barGap: number;
  labelW: number;
  chartX: number;
  chartW: number;
  maxTotal: number;
  legendY: number;
}

function computeLayout(data: StackedBarData, hasTitle: boolean, labelW: number, barH: number, barGap: number, pad: number): StackLayout {
  const titleH = hasTitle ? 44 : 0;
  const legendH = 30;
  const contentTop = pad + titleH;
  const chartW = 360;
  const chartX = pad + labelW + 12;
  const totalBarsH = data.items.length * (barH + barGap) - barGap;
  const legendY = contentTop + totalBarsH + 16;
  const width = pad * 2 + labelW + 12 + chartW;
  const height = legendY + legendH + pad;
  const maxTotal = Math.max(...data.items.map(it => it.values.reduce((s, v) => s + v, 0)), 1);
  return { width, height, contentTop, pad, barH, barGap, labelW, chartX, chartW, maxTotal, legendY };
}

// ========== CLEAN ==========

function renderClean(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 32, 14, 40);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    // Row label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Stacked segments
    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        const isFirst = c === 0;
        const isLast = c === item.values.length - 1;
        const rx = d.borderRadius > 4 ? 4 : d.borderRadius;
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: `url(#sc${c})`,
          rx: (isFirst || isLast) ? rx : 0,
        });
      }
      xOff += segW;
    }
  }

  // Legend
  drawLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick segments, offset shadow, large text

function renderBold(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 110, 40, 16, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (bold)',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    const fit = fitText(item.label, lay.labelW, 1, d.labelSize + 1);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': 900, fill: d.text,
    });

    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        const color = catColor(d, c);
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: color, rx: 4, stroke: '#111', 'stroke-width': 2, filter: 'url(#bold-offset)',
        });
        if (segW > 30) {
          svg.text(lay.chartX + xOff + segW / 2, y + lay.barH / 2 + 5, `${item.values[c]!}`, {
            'text-anchor': 'middle', 'font-size': 12, 'font-weight': 900, fill: '#FFFFFF',
          });
        }
      }
      xOff += segW;
    }
  }

  drawLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);
  return svg.build();
}

// ========== FLAT ==========
// Material: no shadows, thin bars, left-aligned labels

function renderFlat(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 28, 10, 36);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (flat)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Background track
    svg.rect(lay.chartX, y + 2, lay.chartW, lay.barH - 4, {
      fill: d.surface, rx: d.borderRadius > 4 ? 4 : d.borderRadius,
    });

    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: catColor(d, c), rx: 0,
        });
      }
      xOff += segW;
    }
  }

  drawLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);
  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass segments, glow

function renderGlass(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 36, 16, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (glass)',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight,
      fill: d.text, 'letter-spacing': '0.3',
    });

    // Glass track
    svg.rect(lay.chartX, y + 2, lay.chartW, lay.barH - 4, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1,
      rx: d.borderRadius > 4 ? 4 : d.borderRadius, ...d.cardAttrs(),
    });

    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: catColor(d, c), opacity: 0.7,
          rx: 0,
        });
        // Top highlight
        svg.rect(lay.chartX + xOff, y + 2, segW, 1, { fill: 'rgba(255,255,255,0.2)' });
      }
      xOff += segW;
    }
  }

  drawLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);
  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon-outlined segments

function renderNeon(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 32, 14, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        const color = catColor(d, c);
        // Dark filled segment
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: 0,
        });
        // Glow overlay
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 0,
          opacity: 0.3, filter: 'url(#neon-glow)',
        });
      }
      xOff += segW;
    }
  }

  drawNeonLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);
  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft segments, muted colors

function renderWatercolor(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 34, 16, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (watercolor)',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, (item.values[c]! / lay.maxTotal) * lay.chartW);
      if (segW > 0) {
        svg.rect(lay.chartX + xOff, y + 2, segW, lay.barH - 4, {
          fill: catColor(d, c), rx: 0, opacity: 0.7, filter: 'url(#watercolor)',
        });
      }
      xOff += segW;
    }
  }

  drawLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);
  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 28, 14, 40);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    // Row label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Outer hand-drawn rect for whole bar
    const totalW = (item.values.reduce((s, v) => s + v, 0) / lay.maxTotal) * lay.chartW;
    svg.path(jitterRect(lay.chartX, y + 3, totalW, lay.barH - 6, i * 5), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    // Segment dividers
    let xOff = 0;
    for (let c = 0; c < item.values.length - 1; c++) {
      const segW = (item.values[c]! / lay.maxTotal) * lay.chartW;
      xOff += segW;
      if (segW > 0) {
        svg.path(jitterLine(lay.chartX + xOff, y + 4, lay.chartX + xOff, y + lay.barH - 4, i * 7 + c), {
          fill: 'none', stroke: d.border, 'stroke-width': 1,
        });
      }
    }

    // Category numbers inside segments
    xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = (item.values[c]! / lay.maxTotal) * lay.chartW;
      if (segW > 16) {
        svg.text(lay.chartX + xOff + segW / 2, y + lay.barH / 2 + 4, `${c + 1}`, {
          'text-anchor': 'middle', 'font-size': 9, fill: d.textSecondary,
        });
      }
      xOff += segW;
    }
  }

  // Legend
  drawSketchLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW);

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const lay = computeLayout(data, !!title, 90, 24, 10, 36);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Stacked bar chart (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);

    // Row label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Stacked pixel segments
    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const segW = Math.max(0, Math.floor((item.values[c]! / lay.maxTotal) * lay.chartW / px) * px);
      if (segW > 0) {
        const color = catColor(d, c);
        svg.raw(pixelBorder(lay.chartX + xOff, y + 2, segW, lay.barH - 4, color, px));
        svg.rect(lay.chartX + xOff + px, y + 2 + px, segW - px * 2, lay.barH - 4 - px * 2, {
          fill: color, opacity: 0.3, 'shape-rendering': 'crispEdges',
        });
      }
      xOff += segW;
    }
  }

  // Legend
  drawPixelLegend(svg, d, data.categories, lay.chartX, lay.legendY, lay.chartW, px);

  return svg.build();
}

// --- Legend helpers ---

function drawLegend(svg: SvgBuilder, d: DesignPreset, categories: string[], startX: number, y: number, maxW: number): void {
  let x = startX;
  for (let i = 0; i < categories.length; i++) {
    svg.rect(x, y, 12, 12, { fill: catColor(d, i), rx: 2 });
    const fit = fitText(categories[i]!, 80, 1, d.captionSize);
    svg.text(x + 16, y + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.textSecondary,
    });
    x += 16 + 60 + 12;
    if (x > startX + maxW - 40) { x = startX; y += 18; }
  }
}

function drawSketchLegend(svg: SvgBuilder, d: DesignPreset, categories: string[], startX: number, y: number, maxW: number): void {
  let x = startX;
  for (let i = 0; i < categories.length; i++) {
    svg.circle(x + 5, y + 6, 4, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(x + 5, y + 6, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 7, fill: d.text });
    const fit = fitText(categories[i]!, 80, 1, d.captionSize);
    svg.text(x + 14, y + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.textSecondary,
    });
    x += 14 + 60 + 12;
    if (x > startX + maxW - 40) { x = startX; y += 18; }
  }
}

function drawNeonLegend(svg: SvgBuilder, d: DesignPreset, categories: string[], startX: number, y: number, maxW: number): void {
  let x = startX;
  for (let i = 0; i < categories.length; i++) {
    const color = catColor(d, i);
    svg.rect(x, y, 12, 12, { fill: 'none', stroke: color, 'stroke-width': 1, rx: 1 });
    const fit = fitText(categories[i]!, 80, 1, d.captionSize);
    svg.text(x + 16, y + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: color,
    });
    x += 16 + 60 + 12;
    if (x > startX + maxW - 40) { x = startX; y += 18; }
  }
}

function drawPixelLegend(svg: SvgBuilder, d: DesignPreset, categories: string[], startX: number, y: number, maxW: number, px: number): void {
  let x = startX;
  for (let i = 0; i < categories.length; i++) {
    svg.rect(x, y, px * 4, px * 4, { fill: catColor(d, i), 'shape-rendering': 'crispEdges' });
    const fit = fitText(categories[i]!, 80, 1, d.captionSize);
    svg.text(x + px * 5 + 2, y + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
    x += px * 5 + 60 + 12;
    if (x > startX + maxW - 40) { x = startX; y += 18; }
  }
}

// ========== HORIZONTAL (style variant) ==========
// Vertical stacked bars — categories along horizontal axis, segments stacked upward

function renderHorizontalStyle(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const barW = Math.min(60, Math.floor(360 / count) - 8);
  const gap = 8;
  const chartH = 220;
  const labelH = 40;
  const legendH = 30;
  const chartAreaW = count * (barW + gap) - gap;
  const width = pad * 2 + chartAreaW + 40;
  const height = pad * 2 + titleH + chartH + labelH + legendH;
  const maxTotal = Math.max(...data.items.map(it => it.values.reduce((s, v) => s + v, 0)), 1);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Stacked bar chart (horizontal)',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const baseY = pad + titleH + chartH;
  const chartLeft = pad + 20;

  // Baseline
  svg.line(chartLeft - 4, baseY, chartLeft + chartAreaW + 4, baseY, {
    stroke: d.border, 'stroke-width': 1,
  });

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const x = chartLeft + i * (barW + gap);
    let yOff = 0;

    // Stack segments upward from baseline
    for (let c = 0; c < item.values.length; c++) {
      const segH = Math.max(0, (item.values[c]! / maxTotal) * chartH);
      if (segH > 0) {
        const color = catColor(d, c);
        if (d.id === 'neon') {
          svg.rect(x, baseY - yOff - segH, barW, segH, {
            fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: 0,
          });
          svg.rect(x, baseY - yOff - segH, barW, segH, {
            fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 0,
            opacity: 0.3, filter: 'url(#neon-glow)',
          });
        } else {
          svg.rect(x, baseY - yOff - segH, barW, segH, {
            fill: color, rx: 0, ...d.cardAttrs(),
          });
        }
      }
      yOff += segH;
    }

    // Label below baseline
    const fit = fitText(item.label, barW + gap, 1, d.captionSize);
    svg.text(x + barW / 2, baseY + 18, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  // Legend
  drawLegend(svg, d, data.categories, chartLeft, baseY + labelH, chartAreaW);

  return svg.build();
}

// ========== PERCENTAGE ==========
// 100% stacked bar: single horizontal bar per item, segments normalized to full width

function renderPercentage(data: StackedBarData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const labelW = 100;
  const barH = 36;
  const barGap = 14;
  const chartW = 400;
  const legendH = 36;
  const contentTop = pad + (titleH);
  const width = pad * 2 + labelW + 12 + chartW;
  const barsH = count * (barH + barGap) - barGap;
  const legendY = contentTop + barsH + 20;
  const height = legendY + legendH + pad;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Stacked bar (100%)',
    buildColorGradients(d, data.categories.length, 'sc'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const chartX = pad + labelW + 12;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const y = contentTop + i * (barH + barGap);
    const total = item.values.reduce((s, v) => s + v, 0) || 1;

    // Row label
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(chartX - 8, y + barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Full-width background bar
    svg.rect(chartX, y, chartW, barH, {
      fill: d.surface, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      stroke: d.border, 'stroke-width': 1, opacity: 0.3,
    });

    // Segments normalized to 100%
    let xOff = 0;
    for (let c = 0; c < item.values.length; c++) {
      const pct = item.values[c]! / total;
      const segW = Math.max(0, pct * chartW);
      if (segW > 0) {
        const isFirst = c === 0;
        const isLast = c === item.values.length - 1;
        const rx = d.borderRadius > 8 ? 6 : d.borderRadius;
        const color = catColor(d, c);
        if (d.id === 'neon') {
          svg.rect(chartX + xOff, y, segW, barH, {
            fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1,
            rx: (isFirst || isLast) ? rx : 0,
          });
          svg.rect(chartX + xOff, y, segW, barH, {
            fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3,
            rx: (isFirst || isLast) ? rx : 0, filter: 'url(#neon-glow)',
          });
        } else {
          svg.rect(chartX + xOff, y, segW, barH, {
            fill: color, opacity: 0.85,
            rx: (isFirst || isLast) ? rx : 0,
          });
        }
        // Percentage label inside segment
        const pctText = `${Math.round(pct * 100)}%`;
        if (segW > 36) {
          svg.text(chartX + xOff + segW / 2, y + barH / 2 + 4, pctText, {
            'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: d.id === 'neon' ? color : '#FFFFFF',
          });
        }
      }
      xOff += segW;
    }
  }

  // Legend
  if (d.id === 'neon') {
    drawNeonLegend(svg, d, data.categories, chartX, legendY, chartW);
  } else {
    drawLegend(svg, d, data.categories, chartX, legendY, chartW);
  }

  return svg.build();
}
