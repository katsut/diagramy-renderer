// Radar/spider chart renderer — polygon overlays with design-system awareness

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface RadarAxis {
  label: string;
  max?: number;
}

interface RadarItem {
  label: string;
  values: number[];
}

interface RadarChartData {
  axes: RadarAxis[];
  items: RadarItem[];
}

export function renderRadarChart(data: RadarChartData, title?: string, design?: DesignPreset): string {
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

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function axisPoint(cx: number, cy: number, r: number, i: number, total: number): { x: number; y: number } {
  const angle = (2 * Math.PI * i) / total - Math.PI / 2;
  return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
}

function polygonPoints(cx: number, cy: number, r: number, values: number[], maxVals: number[]): string {
  const n = values.length;
  return values.map((v, i) => {
    const ratio = v / (maxVals[i] ?? 100);
    const pt = axisPoint(cx, cy, r * Math.min(ratio, 1), i, n);
    return `${pt.x},${pt.y}`;
  }).join(' ');
}

// ========== CLEAN ==========

function renderClean(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const r = 130;
  const chartCx = pad + r + 40;
  const chartCy = pad + titleH + r + 20;
  const legendX = chartCx + r + 60;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 40;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Grid rings
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    const pts = Array.from({ length: n }, (_, i) => {
      const pt = axisPoint(chartCx, chartCy, ringR, i, n);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    svg.polygon(pts, { fill: 'none', stroke: d.border, 'stroke-width': 0.5, opacity: 0.5 });
  }

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 0.8, opacity: 0.5 });

    const labelPt = axisPoint(chartCx, chartCy, r + 18, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Data polygons
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);
    svg.polygon(pts, { fill: color, opacity: 0.15, stroke: color, 'stroke-width': 2 });

    // Data points
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 4, { fill: color, stroke: d.bg, 'stroke-width': 2 });
    });
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 24;
    svg.rect(legendX, ly, 14, 14, { fill: itemColor(d, i), rx: 3 });
    const fit = fitText(item.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 20, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== BOLD ==========
// Thick polygon outlines with offset shadow, bold axis labels

function renderBold(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 56 : 0;
  const r = 140;
  const chartCx = pad + r + 44;
  const chartCy = pad + titleH + r + 24;
  const legendX = chartCx + r + 64;
  const legendW = 150;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 48;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (bold)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Bold grid rings (thick lines)
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    const pts = Array.from({ length: n }, (_, i) => {
      const pt = axisPoint(chartCx, chartCy, ringR, i, n);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    svg.polygon(pts, { fill: 'none', stroke: d.border, 'stroke-width': ring === 4 ? 3 : 1, opacity: 0.4 });
  }

  // Axis lines (thick)
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 2, opacity: 0.5 });

    const labelPt = axisPoint(chartCx, chartCy, r + 22, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.labelSize);
    svg.text(labelPt.x, labelPt.y + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 800, fill: d.text,
    });
  }

  // Data polygons with offset shadow
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);
    svg.polygon(pts, {
      fill: color, opacity: 0.2, stroke: color, 'stroke-width': 3,
      filter: 'url(#bold-offset)',
    });

    // Bold data points
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 6, { fill: color, stroke: d.border, 'stroke-width': 3 });
    });
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 30;
    svg.rect(legendX, ly, 18, 18, { fill: itemColor(d, i), rx: 4, stroke: d.border, 'stroke-width': 2 });
    const fit = fitText(item.label, legendW - 28, 1, d.labelSize);
    svg.text(legendX + 26, ly + 14, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 800, fill: d.text,
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: flat polygon fills, clean grid, no shadows

function renderFlat(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const r = 120;
  const chartCx = pad + r + 36;
  const chartCy = pad + titleH + r + 16;
  const legendX = chartCx + r + 50;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 32;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (flat)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Minimal grid — concentric circles instead of polygons
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    svg.circle(chartCx, chartCy, ringR, { fill: 'none', stroke: d.border, 'stroke-width': 0.5, opacity: 0.3 });
  }

  // Axis lines (thin)
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 0.5, opacity: 0.3 });

    const labelPt = axisPoint(chartCx, chartCy, r + 16, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Data polygons (flat fill, no border shadow)
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);
    svg.polygon(pts, { fill: color, opacity: 0.2, stroke: color, 'stroke-width': 1.5 });

    // Small data dots
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 3, { fill: color });
    });
  }

  // Legend with color dots
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 22;
    svg.circle(legendX + 6, ly + 7, 5, { fill: itemColor(d, i) });
    const fit = fitText(item.label, legendW - 20, 1, d.labelSize);
    svg.text(legendX + 16, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, glowing polygons with frosted-glass grid

function renderGlass(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const r = 130;
  const chartCx = pad + r + 40;
  const chartCy = pad + titleH + r + 20;
  const legendX = chartCx + r + 60;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 40;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (glass)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Frosted grid rings
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    const pts = Array.from({ length: n }, (_, i) => {
      const pt = axisPoint(chartCx, chartCy, ringR, i, n);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    svg.polygon(pts, { fill: 'none', stroke: d.border, 'stroke-width': 0.5 });
  }

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 0.8, opacity: 0.5 });

    const labelPt = axisPoint(chartCx, chartCy, r + 20, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Data polygons with glow
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);

    // Glow polygon
    svg.polygon(pts, {
      fill: color, opacity: 0.08, stroke: color, 'stroke-width': 2,
      filter: 'url(#card-shadow)',
    });
    // Top highlight
    svg.polygon(pts, {
      fill: 'none', stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });

    // Glowing data points
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 5, { fill: color, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1 });
    });
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 26;
    svg.rect(legendX, ly, 14, 14, {
      fill: itemColor(d, i), rx: 4, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });
    const fit = fitText(item.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 22, ly + 12, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon polygon outlines, glow

function renderNeon(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const r = 130;
  const chartCx = pad + r + 40;
  const chartCy = pad + titleH + r + 20;
  const legendX = chartCx + r + 56;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 40;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (neon)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Grid with neon accent
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    const pts = Array.from({ length: n }, (_, i) => {
      const pt = axisPoint(chartCx, chartCy, ringR, i, n);
      return `${pt.x},${pt.y}`;
    }).join(' ');
    svg.polygon(pts, { fill: 'none', stroke: d.border, 'stroke-width': 0.5 });
  }

  // Axis lines
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 0.5 });

    const labelPt = axisPoint(chartCx, chartCy, r + 20, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Data polygons with neon outline
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);

    // Dark fill
    svg.polygon(pts, { fill: color, opacity: 0.05, stroke: color, 'stroke-width': 1.5 });
    // Neon glow outline
    svg.polygon(pts, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.4, filter: 'url(#neon-glow)',
    });

    // Neon data points
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 4, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    });
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const ly = chartCy - r + i * 24;
    svg.rect(legendX, ly, 12, 12, { fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 2 });
    const fit = fitText(item.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 18, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic: watercolor polygon, soft colors, paper feel

function renderWatercolor(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const r = 125;
  const chartCx = pad + r + 40;
  const chartCy = pad + titleH + r + 20;
  const legendX = chartCx + r + 56;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 40;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (watercolor)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Soft grid rings
  for (let ring = 1; ring <= 4; ring++) {
    const ringR = r * ring / 4;
    svg.circle(chartCx, chartCy, ringR, { fill: 'none', stroke: d.border, 'stroke-width': 0.5, opacity: 0.3 });
  }

  // Axis lines + labels
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.line(chartCx, chartCy, pt.x, pt.y, { stroke: d.border, 'stroke-width': 0.8, opacity: 0.3 });

    const labelPt = axisPoint(chartCx, chartCy, r + 20, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  // Data polygons with watercolor filter
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const color = itemColor(d, i);
    const pts = polygonPoints(chartCx, chartCy, r, item.values, maxVals);

    // Watercolor wash blob behind polygon
    svg.circle(chartCx, chartCy, r * 0.7, { fill: color, opacity: 0.06, filter: 'url(#watercolor)' });
    // Watercolor polygon
    svg.polygon(pts, {
      fill: color, opacity: 0.25, stroke: color, 'stroke-width': 1.5,
      filter: 'url(#watercolor)',
    });

    // Soft data points
    item.values.forEach((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      const pt = axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
      svg.circle(pt.x, pt.y, 5, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    });
  }

  // Legend with watercolor swatches
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 24;
    svg.circle(legendX + 7, ly + 7, 6, { fill: itemColor(d, i), opacity: 0.7, filter: 'url(#watercolor)' });
    const fit = fitText(item.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 20, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const r = 120;
  const chartCx = pad + r + 40;
  const chartCy = pad + titleH + r + 20;
  const legendX = chartCx + r + 50;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 40;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  // Axis lines (hand-drawn)
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    svg.path(jitterLine(chartCx, chartCy, pt.x, pt.y, i * 13), {
      fill: 'none', stroke: d.border, 'stroke-width': 1, opacity: 0.5,
    });

    const labelPt = axisPoint(chartCx, chartCy, r + 18, i, n);
    const fit = fitText(data.axes[i]!.label, 80, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  // Grid ring (outermost only, hand-drawn)
  for (let i = 0; i < n; i++) {
    const p1 = axisPoint(chartCx, chartCy, r, i, n);
    const p2 = axisPoint(chartCx, chartCy, r, (i + 1) % n, n);
    svg.path(jitterLine(p1.x, p1.y, p2.x, p2.y, i * 7 + 50), {
      fill: 'none', stroke: d.border, 'stroke-width': 1, opacity: 0.4,
    });
  }

  // Data polygons (hand-drawn edges)
  for (let di = 0; di < data.items.length; di++) {
    const item = data.items[di]!;
    const pts: { x: number; y: number }[] = item.values.map((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      return axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
    });

    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i]!;
      const p2 = pts[(i + 1) % pts.length]!;
      svg.path(jitterLine(p1.x, p1.y, p2.x, p2.y, di * 17 + i * 3), {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5,
      });
    }

    // Data points
    for (const pt of pts) {
      svg.circle(pt.x, pt.y, 3, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    }
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 22;
    svg.circle(legendX + 5, ly + 6, 4, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    const fit = fitText(item.label, legendW - 20, 1, d.labelSize);
    svg.text(legendX + 16, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: RadarChartData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const pad = 36;
  const titleH = title ? 44 : 0;
  const r = 100;
  const chartCx = pad + r + 30;
  const chartCy = pad + titleH + r + 16;
  const legendX = chartCx + r + 40;
  const legendW = 140;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 32;
  const n = data.axes.length;
  const maxVals = data.axes.map(a => a.max ?? 100);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Radar chart (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  // Axis lines (pixel)
  for (let i = 0; i < n; i++) {
    const pt = axisPoint(chartCx, chartCy, r, i, n);
    const steps = Math.floor(r / px);
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const x = Math.floor((chartCx + (pt.x - chartCx) * t) / px) * px;
      const y = Math.floor((chartCy + (pt.y - chartCy) * t) / px) * px;
      svg.rect(x, y, px, px, { fill: d.border, opacity: 0.4, 'shape-rendering': 'crispEdges' });
    }

    const labelPt = axisPoint(chartCx, chartCy, r + 16, i, n);
    const fit = fitText(data.axes[i]!.label, 70, 1, d.captionSize);
    svg.text(labelPt.x, labelPt.y + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  // Data polygons (pixel outline)
  for (let di = 0; di < data.items.length; di++) {
    const item = data.items[di]!;
    const color = itemColor(d, di);
    const pts = item.values.map((v, ai) => {
      const ratio = v / (maxVals[ai] ?? 100);
      return axisPoint(chartCx, chartCy, r * Math.min(ratio, 1), ai, n);
    });

    // Draw polygon edges with pixel dots
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i]!;
      const p2 = pts[(i + 1) % pts.length]!;
      const dist = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
      const steps = Math.floor(dist / px);
      for (let s = 0; s <= steps; s++) {
        const t = s / Math.max(steps, 1);
        const x = Math.floor((p1.x + (p2.x - p1.x) * t) / px) * px;
        const y = Math.floor((p1.y + (p2.y - p1.y) * t) / px) * px;
        svg.rect(x, y, px, px, { fill: color, 'shape-rendering': 'crispEdges' });
      }
    }

    // Data point markers
    for (const pt of pts) {
      svg.rect(pt.x - px, pt.y - px, px * 2, px * 2, { fill: color, 'shape-rendering': 'crispEdges' });
    }
  }

  // Legend
  for (let i = 0; i < data.items.length; i++) {
    const item = data.items[i]!;
    const ly = chartCy - r + i * 22;
    svg.rect(legendX, ly, px * 4, px * 4, { fill: itemColor(d, i), 'shape-rendering': 'crispEdges' });
    const fit = fitText(item.label, legendW - 20, 1, d.labelSize);
    svg.text(legendX + px * 5 + 4, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}
