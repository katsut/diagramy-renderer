// Bar chart renderer — horizontal bars with design-system awareness

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';
import { profileItems, adaptiveLabelWidth, adaptiveChartWidth } from '../shared/layout-planner.js';

interface BarChartItem {
  label: string;
  value: number;
}

interface BarChartData {
  items: BarChartItem[];
  unit?: string;
}

export function renderBarChart(data: BarChartData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'horizontal') return renderHorizontalStyle(data, title, d);
  if (style === 'lollipop') return renderLollipop(data, title, d);
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

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// --- Layout ---

interface BarLayout {
  width: number;
  height: number;
  contentTop: number;
  pad: number;
  barH: number;
  barGap: number;
  labelW: number;
  chartX: number;
  chartW: number;
  maxVal: number;
}

function computeLayout(data: BarChartData, hasTitle: boolean, baseLabelW: number, barH: number, barGap: number, pad: number, labelFontSize: number): BarLayout {
  const titleH = hasTitle ? 44 : 0;
  const contentTop = pad + titleH;
  const profile = profileItems(data.items, labelFontSize, 12);
  const labelW = adaptiveLabelWidth(profile.maxLabelWidth, baseLabelW, 240);
  const chartW = Math.max(240, Math.min(420, 560 - labelW));
  const width = pad * 2 + labelW + 12 + chartW + 40;
  const chartX = pad + labelW + 12;
  const totalBarsH = data.items.length * (barH + barGap) - barGap;
  const height = contentTop + totalBarsH + pad;
  const maxVal = Math.max(...data.items.map(it => it.value), 1);
  return { width, height, contentTop, pad, barH, barGap, labelW, chartX, chartW, maxVal };
}

// ========== CLEAN ==========

function renderClean(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 32, 12, 40, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart',
    buildColorGradients(d, data.items.length, 'bg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Axis line
  svg.line(lay.chartX, lay.contentTop - 4, lay.chartX, lay.contentTop + data.items.length * (lay.barH + lay.barGap), {
    stroke: d.border, 'stroke-width': 1,
  });

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Bar with gradient
    svg.rect(lay.chartX, y + 2, barW, lay.barH - 4, {
      fill: `url(#bg${i})`, rx: d.borderRadius > 4 ? 4 : d.borderRadius,
      ...d.cardAttrs(),
    });

    // Value label
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 6, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== BOLD ==========
// Thick bars with offset shadow, large value labels, no grid

function renderBold(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 110, 40, 16, 44, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (bold)',
    buildColorGradients(d, data.items.length, 'bg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(8, (item.value / lay.maxVal) * lay.chartW);

    // Label (bold, large)
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 10, y + lay.barH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': 800, fill: d.text,
    });

    // Bar with offset shadow + thick border
    svg.rect(lay.chartX, y + 2, barW, lay.barH - 4, {
      fill: color, rx: d.borderRadius > 6 ? 6 : d.borderRadius,
      stroke: d.border, 'stroke-width': 3, filter: 'url(#bold-offset)',
    });

    // Value inside bar (white) or outside
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    if (barW > 60) {
      svg.text(lay.chartX + barW - 10, y + lay.barH / 2 + 6, valText, {
        'text-anchor': 'end', 'font-size': d.labelSize, 'font-weight': 900, fill: '#FFFFFF',
      });
    } else {
      svg.text(lay.chartX + barW + 8, y + lay.barH / 2 + 6, valText, {
        'text-anchor': 'start', 'font-size': d.labelSize, 'font-weight': 900, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material-style horizontal bars, no shadows/borders, left color dot

function renderFlat(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 28, 6, 36, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (flat)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Color dot label
    svg.circle(lay.chartX - lay.labelW + 4, y + lay.barH / 2, 5, { fill: color });
    const fit = fitText(item.label, lay.labelW - 18, 1, d.labelSize);
    svg.text(lay.chartX - lay.labelW + 16, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Flat bar — no shadow, no border, no rounding
    svg.rect(lay.chartX, y + 4, barW, lay.barH - 8, { fill: color, rx: 2 });

    // Value right
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 6, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, glowing bars with frosted-glass track behind

function renderGlass(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 34, 14, 48, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (glass)',
    buildColorGradients(d, data.items.length, 'bg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Background track (frosted glass)
    svg.rect(lay.chartX, y + 4, lay.chartW, lay.barH - 8, {
      fill: d.surface, rx: d.borderRadius > 6 ? 6 : d.borderRadius,
      stroke: d.border, 'stroke-width': 1,
    });

    // Glowing bar
    svg.rect(lay.chartX, y + 4, barW, lay.barH - 8, {
      fill: `url(#bg${i})`, rx: d.borderRadius > 6 ? 6 : d.borderRadius,
      filter: 'url(#card-shadow)',
    });
    // Top highlight
    svg.rect(lay.chartX + 4, y + 5, barW - 8, 1, { fill: 'rgba(255,255,255,0.3)', rx: 0.5 });

    // Value
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 8, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outline bars, glow effects, grid lines

function renderNeon(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 30, 14, 44, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Grid lines
  for (let g = 0; g <= 4; g++) {
    const gx = lay.chartX + (lay.chartW * g) / 4;
    svg.line(gx, lay.contentTop - 4, gx, lay.contentTop + data.items.length * (lay.barH + lay.barGap), {
      stroke: d.border, 'stroke-width': 0.5, opacity: 0.3,
    });
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Neon outline bar
    svg.rect(lay.chartX, y + 4, barW, lay.barH - 8, {
      fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow overlay
    svg.rect(lay.chartX, y + 4, barW, lay.barH - 8, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.4, filter: 'url(#neon-glow)',
    });
    // Inner fill faint
    svg.rect(lay.chartX + 1, y + 5, barW - 2, lay.barH - 10, {
      fill: color, opacity: 0.1, rx: d.borderRadius,
    });

    // Value with neon color
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 8, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: color, opacity: 0.8,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic bars with watercolor filter, soft colors, paper feel

function renderWatercolor(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 36, 16, 48, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (watercolor)',
    buildColorGradients(d, data.items.length, 'bg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Soft axis line
  svg.line(lay.chartX, lay.contentTop - 4, lay.chartX, lay.contentTop + data.items.length * (lay.barH + lay.barGap), {
    stroke: d.border, 'stroke-width': 1, opacity: 0.4,
  });

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Watercolor wash behind bar
    svg.ellipse(lay.chartX + barW / 2, y + lay.barH / 2, barW / 2 + 8, lay.barH / 2 + 4, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });

    // Watercolor bar
    svg.rect(lay.chartX, y + 4, barW, lay.barH - 8, {
      fill: color, opacity: 0.7, rx: d.borderRadius,
      filter: 'url(#watercolor)',
    });

    // Value
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 8, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 100, 28, 14, 40, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Axis line (hand-drawn)
  svg.path(jitterLine(lay.chartX, lay.contentTop - 4, lay.chartX, lay.contentTop + data.items.length * (lay.barH + lay.barGap), 99), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(4, (item.value / lay.maxVal) * lay.chartW);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Hand-drawn bar
    svg.path(jitterRect(lay.chartX, y + 3, barW, lay.barH - 6, i * 5), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
    // Hatching inside bar
    for (let hx = lay.chartX + 6; hx < lay.chartX + barW - 4; hx += 6) {
      svg.path(jitterLine(hx, y + 5, hx, y + lay.barH - 5, i * 7 + hx), {
        fill: 'none', stroke: d.border, 'stroke-width': 0.8, opacity: 0.4,
      });
    }

    // Value
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 6, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const lay = computeLayout(data, !!title, 90, 24, 10, 36, d.labelSize);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Bar chart (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Axis line (pixel)
  const axisTop = lay.contentTop - 4;
  const axisBottom = lay.contentTop + data.items.length * (lay.barH + lay.barGap);
  for (let py = axisTop; py < axisBottom; py += px) {
    svg.rect(lay.chartX - px, py, px, px, { fill: d.border, 'shape-rendering': 'crispEdges' });
  }

  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const y = lay.contentTop + i * (lay.barH + lay.barGap);
    const barW = Math.max(px * 2, Math.floor((item.value / lay.maxVal) * lay.chartW / px) * px);

    // Label
    const fit = fitText(item.label, lay.labelW, 1, d.labelSize);
    svg.text(lay.chartX - 8, y + lay.barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Pixel bar
    svg.raw(pixelBorder(lay.chartX, y + 2, barW, lay.barH - 4, color, px));
    svg.rect(lay.chartX + px, y + 2 + px, barW - px * 2, lay.barH - 4 - px * 2, {
      fill: color, opacity: 0.3, 'shape-rendering': 'crispEdges',
    });

    // Value
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(lay.chartX + barW + 6, y + lay.barH / 2 + 4, valText, {
      'text-anchor': 'start', 'font-size': d.captionSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== HORIZONTAL (style variant) ==========
// Vertical bars growing upward — categories along horizontal axis

function renderHorizontalStyle(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const barW = Math.min(60, Math.floor(360 / count) - 8);
  const gap = 8;
  const chartH = 220;
  const labelH = 40;
  const chartAreaW = count * (barW + gap) - gap;
  const width = pad * 2 + chartAreaW + 40;
  const height = pad * 2 + titleH + chartH + labelH;
  const maxVal = Math.max(...data.items.map(it => it.value), 1);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Bar chart (horizontal)',
    buildColorGradients(d, count, 'bg'));
  svg.defs(defs);

  drawBackground(svg, d, width, height);
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
    const barH = Math.max(4, (item.value / maxVal) * chartH);

    // Bar growing upward
    svg.rect(x, baseY - barH, barW, barH, {
      fill: `url(#bg${i})`, rx: d.borderRadius > 4 ? 4 : d.borderRadius,
      ...d.cardAttrs(),
    });

    // Value above bar
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(x + barW / 2, baseY - barH - 6, valText, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });

    // Label below baseline
    const fit = fitText(item.label, barW + gap, 1, d.captionSize);
    svg.text(x + barW / 2, baseY + 18, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== LOLLIPOP (style variant) ==========
// Vertical lollipop chart: thin stems with circle tips, no bars

function renderLollipop(data: BarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const spacing = Math.max(50, Math.min(80, 400 / count));
  const dotR = 6;
  const chartH = 220;
  const labelH = 40;
  const chartAreaW = count * spacing;
  const width = pad * 2 + chartAreaW + 40;
  const height = pad * 2 + titleH + chartH + labelH;
  const maxVal = Math.max(...data.items.map(it => it.value), 1);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Bar chart (lollipop)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const baseY = pad + titleH + chartH;
  const chartLeft = pad + 20;

  // Baseline
  svg.line(chartLeft - 4, baseY, chartLeft + chartAreaW + 4, baseY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.4,
  });

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const cx = chartLeft + i * spacing + spacing / 2;
    const stemH = Math.max(4, (item.value / maxVal) * chartH);
    const tipY = baseY - stemH;

    // Thin stem
    svg.line(cx, baseY, cx, tipY, {
      stroke: color, 'stroke-width': 2,
    });

    // Circle tip
    svg.circle(cx, tipY, dotR, { fill: color });

    // Value above dot
    const valText = data.unit ? `${item.value} ${data.unit}` : `${item.value}`;
    svg.text(cx, tipY - dotR - 4, valText, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });

    // Label below baseline
    const fit = fitText(item.label, spacing - 6, 1, d.captionSize);
    svg.text(cx, baseY + 18, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}
