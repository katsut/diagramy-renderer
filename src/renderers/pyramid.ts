// Pyramid renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface PyramidLayer {
  label: string;
  description?: string;
}

interface PyramidData {
  layers: PyramidLayer[];
}

function layerColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderPyramid(data: PyramidData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'horizontal') return renderHorizontalBars(data, title, d);
  if (style === 'steps') return renderSteps(data, title, d);
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

// ========== CLEAN ==========

function renderClean(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.layers.length;
  const layerH = 48;
  const gap = 3;
  const baseW = 400;
  const topW = 80;
  const pyramidH = count * (layerH + gap);
  const descW = 160;
  const width = pad * 2 + baseW + descW + 20;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid diagram',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);
    const ratio = i / Math.max(count - 1, 1);
    const w = topW + (baseW - topW) * ratio;
    const x = pyramidX + (baseW - w) / 2;

    // Trapezoid
    const nextRatio = (i + 1) / Math.max(count - 1, 1);
    const nextW = i < count - 1 ? topW + (baseW - topW) * nextRatio : w;
    const nextX = pyramidX + (baseW - nextW) / 2;

    svg.path(`M ${x} ${y} L ${x + w} ${y} L ${nextX + nextW} ${y + layerH} L ${nextX} ${y + layerH} Z`, {
      fill: `url(#py${i})`, opacity: 0.85,
    });

    const fit = fitText(layer.label, w - 20, 1, d.labelSize);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: 'white',
    });

    // Description on the right
    if (layer.description) {
      const descX = pyramidX + baseW + 20;
      svg.line(x + w, y + layerH / 2, descX - 4, y + layerH / 2, {
        stroke: color, 'stroke-width': 1, opacity: 0.3, 'stroke-dasharray': '3,3',
      });
      const dfit = fitText(layer.description, descW, 2, d.captionSize);
      let dy = y + layerH / 2 - ((dfit.lines.length - 1) * dfit.fontSize * 0.65);
      for (const line of dfit.lines) {
        svg.text(descX, dy, line, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
        dy += Math.round(dfit.fontSize * 1.3);
      }
    }
  }

  return svg.build();
}

// --- Shared trapezoid path ---

function trapezoidPath(
  pyramidX: number, baseW: number, topW: number,
  y: number, layerH: number, i: number, count: number,
): string {
  const ratio = i / Math.max(count - 1, 1);
  const w = topW + (baseW - topW) * ratio;
  const x = pyramidX + (baseW - w) / 2;
  const nextRatio = (i + 1) / Math.max(count - 1, 1);
  const nextW = i < count - 1 ? topW + (baseW - topW) * nextRatio : w;
  const nextX = pyramidX + (baseW - nextW) / 2;
  return `M ${x} ${y} L ${x + w} ${y} L ${nextX + nextW} ${y + layerH} L ${nextX} ${y + layerH} Z`;
}

// ========== BOLD ==========
// Pop style: vivid fills, offset shadow, thick borders, large text

function renderBold(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = data.layers.length;
  const layerH = 56;
  const gap = 4;
  const baseW = 420;
  const topW = 90;
  const pyramidH = count * (layerH + gap);
  const width = pad * 2 + baseW;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (bold)',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);

    // Trapezoid with offset shadow
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: color, filter: 'url(#bold-offset)',
    });
    // Thick border
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: 'none', stroke: d.border, 'stroke-width': 3,
    });

    const fit = fitText(layer.label, baseW * 0.5, 1, d.labelSize + 2);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 6, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat fills, no shadows, horizontal stacked bars

function renderFlat(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.layers.length;
  const layerH = 44;
  const gap = 2;
  const maxW = 400;
  const width = pad * 2 + maxW;
  const height = pad * 2 + titleH + count * (layerH + gap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);
    const ratio = i / Math.max(count - 1, 1);
    const w = 80 + (maxW - 80) * ratio;
    const x = pad + (maxW - w) / 2;

    // Flat rectangle — no shadow, no border
    svg.rect(x, y, w, layerH, { fill: color, opacity: 0.85, rx: d.borderRadius });

    const fit = fitText(layer.label, w - 16, 1, d.labelSize);
    svg.text(pad + maxW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: '#FFFFFF',
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass trapezoids, glow accents

function renderGlass(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerH = 52;
  const gap = 4;
  const baseW = 420;
  const topW = 90;
  const pyramidH = count * (layerH + gap);
  const descW = 160;
  const width = pad * 2 + baseW + descW + 20;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (glass)',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);

    // Glow behind trapezoid
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: color, opacity: 0.06, filter: 'url(#shadow)',
    });
    // Frosted glass trapezoid
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: d.surface, opacity: 0.6, stroke: d.border, 'stroke-width': 1,
    });
    // Color accent line at top
    const ratio = i / Math.max(count - 1, 1);
    const w = topW + (baseW - topW) * ratio;
    const lx = pyramidX + (baseW - w) / 2;
    svg.line(lx + 10, y + 1, lx + w - 10, y + 1, {
      stroke: color, 'stroke-width': 1, opacity: 0.4,
    });

    const fit = fitText(layer.label, w - 20, 1, d.labelSize);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      'letter-spacing': '0.3',
    });

    if (layer.description) {
      const descX = pyramidX + baseW + 20;
      svg.line(lx + w, y + layerH / 2, descX - 4, y + layerH / 2, {
        stroke: color, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '3,3',
      });
      const dfit = fitText(layer.description, descW, 2, d.captionSize);
      let dy = y + layerH / 2 - ((dfit.lines.length - 1) * dfit.fontSize * 0.65);
      for (const line of dfit.lines) {
        svg.text(descX, dy, line, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
        dy += Math.round(dfit.fontSize * 1.3);
      }
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon trapezoid outlines, glow effects

function renderNeon(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerH = 50;
  const gap = 6;
  const baseW = 400;
  const topW = 80;
  const pyramidH = count * (layerH + gap);
  const width = pad * 2 + baseW;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);

    // Dark fill with neon border
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1,
    });
    // Glow border
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3, filter: 'url(#neon-glow)',
    });

    const fit = fitText(layer.label, baseW * 0.5, 1, d.labelSize);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, watercolor wash, muted colors

function renderWatercolor(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerH = 52;
  const gap = 4;
  const baseW = 400;
  const topW = 80;
  const pyramidH = count * (layerH + gap);
  const descW = 160;
  const width = pad * 2 + baseW + descW + 20;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (watercolor)',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);
    const ratio = i / Math.max(count - 1, 1);
    const w = topW + (baseW - topW) * ratio;

    // Watercolor wash behind
    svg.ellipse(pyramidX + baseW / 2, y + layerH / 2, w / 2 + 10, layerH / 2 + 6, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Watercolor trapezoid
    svg.path(trapezoidPath(pyramidX, baseW, topW, y, layerH, i, count), {
      fill: color, opacity: 0.5, filter: 'url(#watercolor)',
    });

    const fit = fitText(layer.label, w - 20, 1, d.labelSize);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });

    if (layer.description) {
      const descX = pyramidX + baseW + 20;
      const dfit = fitText(layer.description, descW, 2, d.captionSize);
      let dy = y + layerH / 2 - ((dfit.lines.length - 1) * dfit.fontSize * 0.65);
      for (const line of dfit.lines) {
        svg.text(descX, dy, line, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
        dy += Math.round(dfit.fontSize * 1.3);
      }
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.layers.length;
  const layerH = 44;
  const gap = 4;
  const baseW = 380;
  const topW = 70;
  const pyramidH = count * (layerH + gap);
  const width = pad * 2 + baseW;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const y = startY + i * (layerH + gap);
    const ratio = i / Math.max(count - 1, 1);
    const w = topW + (baseW - topW) * ratio;
    const x = pyramidX + (baseW - w) / 2;
    const nextRatio = (i + 1) / Math.max(count - 1, 1);
    const nextW = i < count - 1 ? topW + (baseW - topW) * nextRatio : w;
    const nextX = pyramidX + (baseW - nextW) / 2;

    svg.path(`M ${x} ${y} L ${x + w} ${y} L ${nextX + nextW} ${y + layerH} L ${nextX} ${y + layerH} Z`, {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    const fit = fitText(layer.label, w - 20, 1, d.labelSize);
    svg.text(pyramidX + baseW / 2, y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.layers.length;
  const layerH = 36;
  const gap = 2;
  const baseW = 360;
  const topW = 60;
  const pyramidH = count * (layerH + gap);
  const width = pad * 2 + baseW;
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const pyramidX = pad;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (layerH + gap);
    const ratio = i / Math.max(count - 1, 1);
    const w = Math.round(topW + (baseW - topW) * ratio);
    const x = Math.round(pyramidX + (baseW - w) / 2);

    // Pixel style: use rectangles
    svg.rect(x, y, w, layerH, {
      fill: color, opacity: 0.8, 'shape-rendering': 'crispEdges',
    });

    const fit = fitText(layer.label, w - 14, 1, d.labelSize);
    svg.text(Math.round(pyramidX + baseW / 2), y + layerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.bg,
    });
  }

  return svg.build();
}

// ========== HORIZONTAL BARS ==========
// Horizontal stacked bars: narrowest at left (top=most important), widening to right (bottom=foundation)

function renderHorizontalBars(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.layers.length;
  const barH = 44;
  const barGap = 6;
  const maxBarW = 420;
  const minBarW = 100;
  const labelW = 140;
  const width = pad * 2 + labelW + 12 + maxBarW;
  const height = pad * 2 + titleH + count * (barH + barGap) - barGap;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid horizontal',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const barX = pad + labelW + 12;
  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (barH + barGap);
    // Top layer (i=0) is narrowest, bottom layer is widest
    const ratio = count <= 1 ? 1 : i / (count - 1);
    const barW = minBarW + (maxBarW - minBarW) * ratio;

    svg.rect(barX, y, barW, barH, {
      fill: `url(#py${i})`, rx: d.borderRadius > 8 ? 6 : d.borderRadius, ...d.cardAttrs(),
    });

    // Label to the left
    const fit = fitText(layer.label, labelW - 8, 1, d.labelSize);
    svg.text(pad + labelW, y + barH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'end', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });

    // Description inside bar
    if (layer.description) {
      const dfit = fitText(layer.description, barW - 16, 1, d.captionSize);
      svg.text(barX + 10, y + barH / 2 + 4, dfit.lines[0]!, {
        'text-anchor': 'start', 'font-size': dfit.fontSize, fill: 'white', opacity: 0.9,
      });
    }
  }

  return svg.build();
}

// ========== STEPS ==========
// Step pyramid: rectangular steps stacked, getting narrower at top (staircase view)

function renderSteps(data: PyramidData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.layers.length;
  const stepH = 52;
  const gap = 4;
  const maxW = 460;
  const minW = 120;
  const descW = 160;
  const pyramidH = count * (stepH + gap);
  const width = pad * 2 + maxW + (data.layers.some(l => l.description) ? descW + 20 : 0);
  const height = pad * 2 + titleH + pyramidH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Pyramid (steps)',
    buildColorGradients(d, count, 'py'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const startY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = startY + i * (stepH + gap);
    // Top layer (i=0) is narrowest, bottom is widest — left-aligned for staircase effect
    const ratio = count <= 1 ? 1 : i / (count - 1);
    const w = minW + (maxW - minW) * ratio;

    // Step shadow
    svg.rect(pad + 2, y + 2, w, stepH, {
      fill: '#000', opacity: 0.06, rx: d.borderRadius,
    });
    // Step rectangle
    svg.rect(pad, y, w, stepH, {
      fill: `url(#py${i})`, rx: d.borderRadius, ...d.cardAttrs(),
    });

    // Step number
    svg.text(pad + 20, y + stepH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 700, fill: 'rgba(255,255,255,0.6)',
    });

    // Label
    const fit = fitText(layer.label, w - 50, 1, d.labelSize);
    svg.text(pad + 40, y + stepH / 2 - (layer.description ? 2 : 0) + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Description inline or on right
    if (layer.description) {
      if (w > 260) {
        const dfit = fitText(layer.description, w - 60, 1, d.captionSize);
        svg.text(pad + 40, y + stepH / 2 + 16, dfit.lines[0]!, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: 'rgba(255,255,255,0.8)',
        });
      } else {
        const descX = pad + maxW + 20;
        const dfit = fitText(layer.description, descW, 1, d.captionSize);
        svg.text(descX, y + stepH / 2 + 4, dfit.lines[0]!, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
      }
    }
  }

  return svg.build();
}
