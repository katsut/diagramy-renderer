// Gantt chart renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';
import { profileItems, adaptiveLabelWidth } from '../shared/layout-planner.js';

interface GanttTask {
  label: string;
  start: number;
  end: number;
  group?: string;
}

interface GanttData {
  tasks: GanttTask[];
}

function taskColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderGantt(data: GanttData, title?: string, design?: DesignPreset): string {
  const d = design ?? getDesign();
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

// --- Shared layout ---

function timeRange(tasks: GanttTask[]): { min: number; max: number } {
  const min = Math.min(...tasks.map(t => t.start));
  const max = Math.max(...tasks.map(t => t.end));
  return { min, max: max === min ? min + 1 : max };
}

interface GanttLayout {
  pad: number; titleH: number; labelW: number; barAreaW: number;
  rowH: number; rowGap: number; axisH: number;
  width: number; height: number;
}

function computeGanttLayout(
  data: GanttData, hasTitle: boolean, d: DesignPreset,
  baseLabelW: number, baseBarAreaW: number,
  rowH: number, rowGap: number, axisH: number, pad: number, titleHOverride?: number,
): GanttLayout {
  const titleH = hasTitle ? (titleHOverride ?? 44) : 0;
  const profile = profileItems(
    data.tasks.map(t => ({ label: t.label })),
    d.labelSize, d.captionSize,
  );
  const labelW = adaptiveLabelWidth(profile.maxLabelWidth, baseLabelW, 240);
  const barAreaW = Math.max(240, Math.min(baseBarAreaW + 40, 620 - labelW));
  const width = pad * 2 + labelW + barAreaW;
  const height = pad * 2 + titleH + axisH + data.tasks.length * (rowH + rowGap);
  return { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height };
}

// ========== CLEAN ==========

function renderClean(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 140, 360, 36, 6, 24, 48);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart',
    buildColorGradients(d, data.tasks.length, 'gt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Time axis
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.line(x, topY, x, topY + axisH + data.tasks.length * (rowH + rowGap), {
      stroke: d.border, 'stroke-width': 1, opacity: 0.15,
    });
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  // Task bars
  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Label
    const fit = fitText(task.label, labelW - 16, 1, d.labelSize);
    svg.text(pad + labelW - 8, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Bar
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.rect(x1, y + 4, bw, rowH - 8, {
      fill: `url(#gt${i})`, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      ...d.cardAttrs(),
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 130, 340, 32, 6, 24, 48, 48);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Axis ticks
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.line(x, topY, x, topY + axisH + data.tasks.length * (rowH + rowGap), {
      stroke: d.border, 'stroke-width': 0.5, opacity: 0.2,
    });
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    const fit = fitText(task.label, labelW - 16, 1, d.labelSize);
    svg.text(pad + labelW - 8, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.path(jitterRect(x1, y + 4, bw, rowH - 8, i * 19), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 120, 320, 28, 4, 20, 40, 40);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;
  const px = 3;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    const fit = fitText(task.label, labelW - 12, 1, d.labelSize);
    svg.text(pad + labelW - 6, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    const x1 = Math.round(barX + ((task.start - min) / range) * barAreaW);
    const x2 = Math.round(barX + ((task.end - min) / range) * barAreaW);
    const bw = Math.max(x2 - x1, px * 3);
    svg.rect(x1, y + 2, bw, rowH - 4, {
      fill: color, opacity: 0.85, 'shape-rendering': 'crispEdges',
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: colored bars with offset shadow, thick borders, large labels

function renderBold(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 150, 380, 44, 10, 28, 52, 56);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (bold)',
    buildColorGradients(d, data.tasks.length, 'gt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Time axis
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.line(x, topY, x, topY + axisH + data.tasks.length * (rowH + rowGap), {
      stroke: d.border, 'stroke-width': 1, opacity: 0.1,
    });
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize + 1, 'font-weight': 700, fill: d.textSecondary,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Bold number badge
    svg.circle(pad + 16, y + rowH / 2, 14, { fill: color });
    svg.text(pad + 16, y + rowH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Label
    const fit = fitText(task.label, labelW - 44, 1, d.labelSize + 1);
    svg.text(pad + 36, y + rowH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 800, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Bar with offset shadow
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.rect(x1, y + 6, bw, rowH - 12, {
      fill: color, rx: 4, filter: 'url(#bold-offset)',
      stroke: d.text, 'stroke-width': 2,
    });
    // Percentage label inside bar
    if (bw > 30) {
      svg.text(x1 + bw / 2, y + rowH / 2 + 4, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#FFFFFF',
      });
    }

    svg.endItem();
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: horizontal layout, left color strip, no shadows

function renderFlat(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 120, 360, 40, 4, 24, 36);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Axis labels only (no grid lines for flat)
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Row background
    svg.rect(pad, y, labelW + barAreaW, rowH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, rowH - 8, { fill: color, rx: 2 });

    // Label
    const fit = fitText(task.label, labelW - 20, 1, d.labelSize);
    svg.text(pad + 14, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Flat bar (no shadow, no border)
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.rect(x1, y + 8, bw, rowH - 16, {
      fill: color, rx: 3,
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass bars, glow effects

function renderGlass(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 140, 380, 40, 8, 28, 48, 52);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (glass)',
    buildColorGradients(d, data.tasks.length, 'gt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Subtle grid lines
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.line(x, topY + axisH, x, topY + axisH + data.tasks.length * (rowH + rowGap), {
      stroke: d.border, 'stroke-width': 1, opacity: 0.1,
    });
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Label with glow dot
    svg.circle(pad + 8, y + rowH / 2, 4, { fill: color, opacity: 0.6 });
    const fit = fitText(task.label, labelW - 24, 1, d.labelSize);
    svg.text(pad + 18, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Frosted glass bar
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.rect(x1, y + 4, bw, rowH - 8, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: 6,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x1 + 8, y + 5, Math.max(bw - 16, 2), 1, { fill: color, opacity: 0.4, rx: 0.5 });
    // Color fill inside
    svg.rect(x1 + 2, y + 6, bw - 4, rowH - 12, {
      fill: color, opacity: 0.15, rx: 5,
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outline bars, glow effects

function renderNeon(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 140, 370, 38, 8, 26, 44, 52);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Neon grid
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.line(x, topY + axisH, x, topY + axisH + data.tasks.length * (rowH + rowGap), {
      stroke: d.border, 'stroke-width': 0.5, opacity: 0.15,
    });
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary, opacity: 0.7,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Number tag
    svg.text(pad + 4, y + rowH / 2 + 4, `0${i + 1}`, {
      'text-anchor': 'start', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });

    // Label
    const fit = fitText(task.label, labelW - 32, 1, d.labelSize);
    svg.text(pad + 28, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Neon outlined bar
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    svg.rect(x1, y + 4, bw, rowH - 8, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: 4,
    });
    // Glow border
    svg.rect(x1, y + 4, bw, rowH - 8, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 4,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });

    svg.endItem();
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft bars, muted colors, paper feel

function renderWatercolor(data: GanttData, title: string | undefined, d: DesignPreset): string {
  const lay = computeGanttLayout(data, !!title, d, 140, 370, 40, 10, 26, 48, 52);
  const { pad, titleH, labelW, barAreaW, rowH, rowGap, axisH, width, height } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Gantt chart (watercolor)',
    buildColorGradients(d, data.tasks.length, 'gt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const { min, max } = timeRange(data.tasks);
  const range = max - min;
  const barX = pad + labelW;
  const topY = pad + titleH;

  // Soft axis
  const ticks = Math.min(range + 1, 8);
  for (let t = 0; t <= ticks; t++) {
    const x = barX + (t / ticks) * barAreaW;
    const val = Math.round(min + (t / ticks) * range);
    svg.text(x, topY + axisH - 6, `${val}`, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary, opacity: 0.6,
    });
  }

  for (let i = 0; i < data.tasks.length; i++) {
    const task = data.tasks[i]!;
    const color = taskColor(d, i);
    const y = topY + axisH + i * (rowH + rowGap);

    svg.beginItem(`tasks[${i}]`);

    // Watercolor number circle
    svg.circle(pad + 12, y + rowH / 2, 10, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(pad + 12, y + rowH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: d.text,
    });

    // Label
    const fit = fitText(task.label, labelW - 32, 1, d.labelSize);
    svg.text(pad + 28, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'data-field': `tasks[${i}].label`,
    });

    // Watercolor wash bar
    const x1 = barX + ((task.start - min) / range) * barAreaW;
    const x2 = barX + ((task.end - min) / range) * barAreaW;
    const bw = Math.max(x2 - x1, 4);
    // Wash blob behind
    svg.ellipse(x1 + bw / 2, y + rowH / 2, bw / 2 + 6, rowH / 2 + 4, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });
    // Soft bar
    svg.rect(x1, y + 6, bw, rowH - 12, {
      fill: color, opacity: 0.7, rx: 6, filter: 'url(#watercolor)',
    });

    svg.endItem();
  }

  return svg.build();
}
