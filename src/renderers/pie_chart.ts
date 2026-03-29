// Pie chart renderer — circular segments with design-system awareness

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';
import { computePieLabels, type PieLabelPos } from '../shared/layout-planner.js';

interface PieSegment {
  label: string;
  value: number;
}

interface PieChartData {
  segments: PieSegment[];
}

export function renderPieChart(data: PieChartData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'donut') return renderDonut(data, title, d);
  if (style === 'waffle') return renderWaffle(data, title, d);
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

function segColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number): { x: number; y: number } {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// Resolve overlapping label positions by pushing apart vertically
function resolveOverlap(labels: { x: number; y: number; text: string }[], minGap = 14): void {
  // Sort by y, then push apart
  labels.sort((a, b) => a.y - b.y);
  for (let i = 1; i < labels.length; i++) {
    const gap = labels[i]!.y - labels[i - 1]!.y;
    if (gap < minGap) {
      const shift = (minGap - gap) / 2;
      labels[i - 1]!.y -= shift;
      labels[i]!.y += shift;
    }
  }
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number): string {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y} Z`;
}

// ========== CLEAN ==========

function renderClean(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const r = 120;
  const chartCx = pad + r + 10;
  const chartCy = pad + titleH + r + 10;
  const legendX = chartCx + r + 50;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart',
    buildColorGradients(d, data.segments.length, 'ps'));
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  const pieLabels = computePieLabels(data.segments, chartCx, chartCy, r, d.captionSize);

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const sweep = (seg.value / total) * 360;

    svg.beginItem(`segments[${i}]`);
    if (sweep > 0.5) {
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: `url(#ps${i})`, stroke: d.bg, 'stroke-width': 2,
        ...d.cardAttrs(),
      });
    }
    svg.endItem();

    angle += sweep;
  }

  for (const lp of pieLabels) {
    svg.text(lp.x, lp.y, lp.text, {
      'text-anchor': lp.anchor, 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.textSecondary,
    });
  }

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 24;
    svg.rect(legendX, ly, 14, 14, { fill: segColor(d, i), rx: 3 });
    const fit = fitText(seg.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 20, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick-bordered segments with offset shadow, large percentage labels

function renderBold(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 56 : 0;
  const r = 130;
  const chartCx = pad + r + 14;
  const chartCy = pad + titleH + r + 14;
  const legendX = chartCx + r + 56;
  const legendW = 170;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 28;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (bold)',
    buildColorGradients(d, data.segments.length, 'ps'));
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      // Segment with thick border + offset shadow
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: color, stroke: d.border, 'stroke-width': 3,
        filter: 'url(#bold-offset)',
      });
    }

    // Large percentage label inside
    const midAngle = angle + sweep / 2;
    const labelR = r * 0.65;
    const labelPt = polarToCartesian(chartCx, chartCy, labelR, midAngle);
    const pct = Math.round(seg.value / total * 100);
    if (sweep > 20) {
      svg.text(labelPt.x, labelPt.y + 6, `${pct}%`, {
        'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: '#FFFFFF',
      });
    }

    angle += sweep;
  }

  // Legend with bold numbers
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 30;
    svg.rect(legendX, ly, 18, 18, { fill: segColor(d, i), rx: 4, stroke: d.border, 'stroke-width': 2 });
    const fit = fitText(seg.label, legendW - 28, 1, d.labelSize);
    svg.text(legendX + 26, ly + 14, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 800, fill: d.text,
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material: flat-color donut with clean legend, no shadow

function renderFlat(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const r = 110;
  const innerR = 60;
  const chartCx = pad + r + 10;
  const chartCy = pad + titleH + r + 10;
  const legendX = chartCx + r + 40;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (flat)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      // Flat segment (no border, no shadow)
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: color, stroke: d.bg, 'stroke-width': 1,
      });
    }

    angle += sweep;
  }

  // Inner circle to create donut
  svg.circle(chartCx, chartCy, innerR, { fill: d.bg });
  // Total label in center
  svg.text(chartCx, chartCy + 5, `${total}`, {
    'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 700, fill: d.text,
  });

  // Flat legend with color dots
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 22;
    svg.circle(legendX + 6, ly + 7, 5, { fill: segColor(d, i) });
    const pct = Math.round(seg.value / total * 100);
    const fit = fitText(seg.label, legendW - 50, 1, d.labelSize);
    svg.text(legendX + 16, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
    svg.text(legendX + legendW - 4, ly + 11, `${pct}%`, {
      'text-anchor': 'end', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass segments with glow

function renderGlass(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const r = 125;
  const chartCx = pad + r + 14;
  const chartCy = pad + titleH + r + 14;
  const legendX = chartCx + r + 56;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 28;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (glass)',
    buildColorGradients(d, data.segments.length, 'ps'));
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  // Glow behind pie
  svg.circle(chartCx, chartCy, r + 8, { fill: d.colors[0]!, opacity: 0.06, filter: 'url(#shadow)' });

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: `url(#ps${i})`, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
        filter: 'url(#card-shadow)',
      });
    }

    // Glowing percentage label
    const midAngle = angle + sweep / 2;
    const labelR = r * 0.65;
    const labelPt = polarToCartesian(chartCx, chartCy, labelR, midAngle);
    const pct = Math.round(seg.value / total * 100);
    if (sweep > 18) {
      svg.text(labelPt.x, labelPt.y + 4, `${pct}%`, {
        'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight,
        fill: '#FFFFFF', opacity: 0.9,
      });
    }

    angle += sweep;
  }

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 26;
    svg.rect(legendX, ly, 14, 14, {
      fill: segColor(d, i), rx: 4, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });
    const fit = fitText(seg.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 22, ly + 12, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: neon outline segments, dark bg

function renderNeon(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const r = 120;
  const chartCx = pad + r + 14;
  const chartCy = pad + titleH + r + 14;
  const legendX = chartCx + r + 50;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 28;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (neon)');
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      // Filled segment with faint neon color
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: color, opacity: 0.15, stroke: color, 'stroke-width': 1.5,
      });
      // Neon glow outline
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: 'none', stroke: color, 'stroke-width': 2,
        opacity: 0.5, filter: 'url(#neon-glow)',
      });
    }

    // Percentage with neon color
    const midAngle = angle + sweep / 2;
    const labelR = r * 0.6;
    const labelPt = polarToCartesian(chartCx, chartCy, labelR, midAngle);
    const pct = Math.round(seg.value / total * 100);
    if (sweep > 20) {
      svg.text(labelPt.x, labelPt.y + 4, `${pct}%`, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: color, opacity: 0.9,
      });
    }

    angle += sweep;
  }

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const ly = chartCy - r + i * 24;
    svg.rect(legendX, ly, 12, 12, { fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 2 });
    const fit = fitText(seg.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 18, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic segments with watercolor filter, paper feel

function renderWatercolor(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const r = 120;
  const chartCx = pad + r + 14;
  const chartCy = pad + titleH + r + 14;
  const legendX = chartCx + r + 50;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 28;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (watercolor)',
    buildColorGradients(d, data.segments.length, 'ps'));
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  // Watercolor wash behind pie
  svg.circle(chartCx, chartCy, r + 12, { fill: d.border, opacity: 0.08, filter: 'url(#watercolor)' });

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
        fill: color, opacity: 0.7, stroke: d.bg, 'stroke-width': 2,
        filter: 'url(#watercolor)',
      });
    }

    // Soft percentage label
    const midAngle = angle + sweep / 2;
    const labelR = r * 0.6;
    const labelPt = polarToCartesian(chartCx, chartCy, labelR, midAngle);
    const pct = Math.round(seg.value / total * 100);
    if (sweep > 20) {
      svg.text(labelPt.x, labelPt.y + 4, `${pct}%`, {
        'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': 600, fill: d.text,
      });
    }

    angle += sweep;
  }

  // Legend with watercolor swatches
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 24;
    svg.circle(legendX + 7, ly + 7, 6, { fill: segColor(d, i), opacity: 0.7, filter: 'url(#watercolor)' });
    const fit = fitText(seg.label, legendW - 24, 1, d.labelSize);
    svg.text(legendX + 20, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const r = 110;
  const chartCx = pad + r + 10;
  const chartCy = pad + titleH + r + 10;
  const legendX = chartCx + r + 50;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  // Outer circle (hand-drawn)
  svg.circle(chartCx, chartCy, r, {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth, filter: 'url(#rough)',
  });

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5 && sweep < 359.5) {
      // Divider line from center to edge
      const edgePt = polarToCartesian(chartCx, chartCy, r, angle);
      svg.path(jitterLine(chartCx, chartCy, edgePt.x, edgePt.y, i * 11), {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5,
      });
    }

    // Label
    const midAngle = angle + sweep / 2;
    const labelR = r * 0.6;
    const labelPt = polarToCartesian(chartCx, chartCy, labelR, midAngle);
    const pct = Math.round(seg.value / total * 100);
    if (sweep > 20) {
      svg.text(labelPt.x, labelPt.y + 4, `${pct}%`, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.text,
      });
    }

    angle += sweep;
  }

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 22;
    svg.circle(legendX + 5, ly + 6, 4, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(legendX + 5, ly + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 7, fill: d.text,
    });
    const fit = fitText(seg.label, legendW - 20, 1, d.labelSize);
    svg.text(legendX + 16, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const pad = 36;
  const titleH = title ? 44 : 0;
  const gridR = 16; // radius in pixel units
  const r = gridR * px;
  const chartCx = pad + r + 10;
  const chartCy = pad + titleH + r + 10;
  const legendX = chartCx + r + 40;
  const legendW = 150;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pie chart (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;

  // Build angle ranges
  const ranges: { start: number; end: number; color: string }[] = [];
  let angle = 0;
  for (let i = 0; i < data.segments.length; i++) {
    const sweep = (data.segments[i]!.value / total) * 360;
    ranges.push({ start: angle, end: angle + sweep, color: segColor(d, i) });
    angle += sweep;
  }

  // Draw pie as pixel grid
  svg.raw('<g shape-rendering="crispEdges">');
  for (let gy = -gridR; gy <= gridR; gy++) {
    for (let gx = -gridR; gx <= gridR; gx++) {
      const dist = Math.sqrt(gx * gx + gy * gy);
      if (dist > gridR) continue;
      const a = (Math.atan2(gx, -gy) * 180 / Math.PI + 360) % 360;
      const seg = ranges.find(r => a >= r.start && a < r.end) ?? ranges[ranges.length - 1]!;
      svg.rect(chartCx + gx * px, chartCy + gy * px, px, px, { fill: seg.color });
    }
  }
  svg.raw('</g>');

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const ly = chartCy - r + i * 22;
    svg.rect(legendX, ly, px * 4, px * 4, { fill: segColor(d, i), 'shape-rendering': 'crispEdges' });
    const fit = fitText(seg.label, legendW - 20, 1, d.labelSize);
    svg.text(legendX + px * 5 + 4, ly + 10, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== WAFFLE ==========
// Waffle chart: 10x10 grid of squares, colored proportionally

function renderWaffle(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const cellSize = 24;
  const cellGap = 3;
  const gridSize = 10 * (cellSize + cellGap) - cellGap;
  const legendX = pad + gridSize + 40;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + gridSize;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Waffle chart');
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const gridTop = pad + titleH;

  // Compute cell counts for each segment (total = 100 cells)
  const cellCounts: number[] = [];
  let remaining = 100;
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    if (i === data.segments.length - 1) {
      cellCounts.push(remaining);
    } else {
      const count = Math.round((seg.value / total) * 100);
      cellCounts.push(count);
      remaining -= count;
    }
  }

  // Fill grid: rows top-to-bottom, left-to-right
  let segIdx = 0;
  let segUsed = 0;
  for (let row = 0; row < 10; row++) {
    for (let col = 0; col < 10; col++) {
      while (segIdx < cellCounts.length - 1 && segUsed >= cellCounts[segIdx]!) {
        segIdx++;
        segUsed = 0;
      }
      const color = segColor(d, segIdx);
      const x = pad + col * (cellSize + cellGap);
      const y = gridTop + row * (cellSize + cellGap);
      if (d.id === 'neon') {
        svg.rect(x, y, cellSize, cellSize, {
          fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: 3,
        });
        svg.rect(x, y, cellSize, cellSize, {
          fill: 'none', stroke: color, 'stroke-width': 1, rx: 3,
          opacity: 0.3, filter: 'url(#neon-glow)',
        });
      } else {
        svg.rect(x, y, cellSize, cellSize, {
          fill: color, rx: 3, opacity: 0.85, ...d.cardAttrs(),
        });
      }
      segUsed++;
    }
  }

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const pct = Math.round((seg.value / total) * 100);
    const ly = gridTop + i * 28;
    svg.rect(legendX, ly, 16, 16, { fill: segColor(d, i), rx: 3 });
    const fit = fitText(seg.label, legendW - 60, 1, d.labelSize);
    svg.text(legendX + 24, ly + 12, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
    svg.text(legendX + legendW - 4, ly + 12, `${pct}%`, {
      'text-anchor': 'end', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}

// ========== DONUT (style variant) ==========
// Pie chart with inner circle cutout, center shows total

function renderDonut(data: PieChartData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const r = 120;
  const innerR = Math.round(r * 0.55);
  const chartCx = pad + r + 10;
  const chartCy = pad + titleH + r + 10;
  const legendX = chartCx + r + 50;
  const legendW = 160;
  const width = legendX + legendW + pad;
  const height = pad * 2 + titleH + r * 2 + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Donut chart',
    buildColorGradients(d, data.segments.length, 'ps'));
  svg.defs(defs);

  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const total = data.segments.reduce((s, seg) => s + seg.value, 0) || 1;
  let angle = 0;

  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const color = segColor(d, i);
    const sweep = (seg.value / total) * 360;

    if (sweep > 0.5) {
      if (d.id === 'neon') {
        svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
          fill: color, opacity: 0.15, stroke: color, 'stroke-width': 1.5,
        });
        svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
          fill: 'none', stroke: color, 'stroke-width': 2,
          opacity: 0.5, filter: 'url(#neon-glow)',
        });
      } else {
        svg.path(arcPath(chartCx, chartCy, r, angle, angle + sweep), {
          fill: `url(#ps${i})`, stroke: d.bg, 'stroke-width': 2,
          ...d.cardAttrs(),
        });
      }
    }

    angle += sweep;
  }

  // Inner circle cutout
  svg.circle(chartCx, chartCy, innerR, { fill: d.bg });

  // Center text — total value
  svg.text(chartCx, chartCy - 2, `${total}`, {
    'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 700, fill: d.text,
  });
  svg.text(chartCx, chartCy + 16, 'Total', {
    'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
  });

  // Legend
  for (let i = 0; i < data.segments.length; i++) {
    const seg = data.segments[i]!;
    const pct = Math.round(seg.value / total * 100);
    const ly = chartCy - r + i * 24;
    svg.rect(legendX, ly, 14, 14, { fill: segColor(d, i), rx: 3 });
    const fit = fitText(seg.label, legendW - 50, 1, d.labelSize);
    svg.text(legendX + 20, ly + 11, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });
    svg.text(legendX + legendW - 4, ly + 11, `${pct}%`, {
      'text-anchor': 'end', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  return svg.build();
}
