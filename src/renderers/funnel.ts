// Funnel renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import { icon } from '../shared/icons.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawIconNode,
} from '../shared/render-utils.js';
import { profileItems } from '../shared/layout-planner.js';

interface FunnelStage {
  label: string;
  value?: string;
  description?: string;
}

interface FunnelData {
  stages: FunnelStage[];
}

const STAGE_ICONS = ['users', 'target', 'trending-up', 'check', 'zap', 'lightbulb'];

function stageIcon(i: number): string {
  return STAGE_ICONS[i % STAGE_ICONS.length]!;
}

function stageColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function funnelRatios(i: number, count: number): { topHalf: number; botHalf: number } {
  const fullW = 1;
  const topRatio = 1 - (i / count) * 0.7;
  const botRatio = 1 - ((i + 1) / count) * 0.7;
  return { topHalf: (fullW / 2) * topRatio, botHalf: (fullW / 2) * botRatio };
}

export function renderFunnel(data: FunnelData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'horizontal': return renderHorizontal(data, title, d);
    case 'pipeline': return renderPipeline(data, title, d);
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

// --- Shared drawing helpers ---

function drawTrapezoid(svg: SvgBuilder, cx: number, y: number, h: number, funnelW: number, i: number, count: number, attrs: Record<string, string | number>): void {
  const { topHalf, botHalf } = funnelRatios(i, count);
  const tw = funnelW * topHalf;
  const bw = funnelW * botHalf;
  const gap = 2;
  svg.polygon(
    `${cx - tw},${y + gap} ${cx + tw},${y + gap} ${cx + bw},${y + h - gap} ${cx - bw},${y + h - gap}`,
    attrs,
  );
}

function contrastFill(bgColor: string, lightFill: string, darkFill: string): string {
  // Parse hex color and compute relative luminance
  const hex = bgColor.replace('#', '');
  if (hex.length < 6) return lightFill;
  const r = parseInt(hex.slice(0, 2), 16) / 255;
  const g = parseInt(hex.slice(2, 4), 16) / 255;
  const b = parseInt(hex.slice(4, 6), 16) / 255;
  const lum = 0.299 * r + 0.587 * g + 0.114 * b;
  return lum > 0.5 ? darkFill : lightFill;
}

function drawStageLabel(svg: SvgBuilder, d: DesignPreset, cx: number, y: number, h: number, stage: FunnelStage, fill: string, segColor?: string, dataPath?: string): void {
  const textFill = segColor ? contrastFill(segColor, fill, d.id === 'pixel' ? '#1A1A2E' : '#1E293B') : fill;
  svg.text(cx, y + h / 2 + 5, stage.label, {
    'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: textFill,
    ...(dataPath ? { 'data-field': `${dataPath}.label` } : {}),
  });
  if (stage.value) {
    svg.text(cx, y + h / 2 + 20, stage.value, {
      'text-anchor': 'middle', 'font-size': d.captionSize, fill: textFill,
      ...(dataPath ? { 'data-field': `${dataPath}.value` } : {}),
    });
  }
}

function drawAnnotation(svg: SvgBuilder, d: DesignPreset, annotX: number, y: number, h: number, annotW: number, connFromX: number, color: string, i: number, stage: FunnelStage): void {
  const connY = y + h / 2;
  svg.path(`M ${connFromX} ${connY} L ${annotX - 8} ${connY}`, {
    fill: 'none', stroke: color, 'stroke-width': 1.5, 'stroke-dasharray': '4,4', opacity: 0.4,
  });

  const iconCx = annotX + 24;
  const iconCy = y + h / 2;
  drawIconNode(svg, d, iconCx, iconCy, 14, color, `fg${i}`, stageIcon(i), 12);

  const textX = annotX + 52;
  drawLabelBlock(svg, d, stage.label, stage.description, textX, y + (stage.description ? 20 : h / 2 - 2), annotW - 60, 'start', `stages[${i}]`);
}

// ========== CLEAN ==========

function renderClean(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.stages.length;
  const funnelW = 320;
  const annotW = 300;
  const gap = 40;
  const hasDesc = data.stages.some(s => s.description);
  const stageH = hasDesc ? 96 : 80;
  const width = pad * 2 + funnelW + gap + annotW;
  const height = pad * 2 + titleH + count * stageH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram',
    buildColorGradients(d, count, 'fg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 10;
  const funnelCx = pad + funnelW / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const { topHalf } = funnelRatios(i, count);

    svg.beginItem(`stages[${i}]`);
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, { fill: color, opacity: 0.85 });
    drawStageLabel(svg, d, funnelCx, y, stageH, stage, 'white', color, `stages[${i}]`);
    drawAnnotation(svg, d, pad + funnelW + gap, y, stageH, annotW, funnelCx + funnelW * topHalf - 10, color, i, stage);
    svg.endItem();
  }

  // Bottom circle
  const bottomY = contentTop + count * stageH + 10;
  drawIconNode(svg, d, funnelCx, bottomY + 16, 10, d.colors[0]!, 'fg0', 'check', 12);

  return svg.build();
}

// ========== BOLD ==========
// Pop style: colored trapezoids, thick borders, offset shadow, large labels

function renderBold(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 56 : 0;
  const count = data.stages.length;
  const funnelW = 340;
  const annotW = 300;
  const gap = 44;
  const hasDesc = data.stages.some(s => s.description);
  const stageH = hasDesc ? 104 : 90;
  const width = pad * 2 + funnelW + gap + annotW;
  const height = pad * 2 + titleH + count * stageH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (bold)',
    buildColorGradients(d, count, 'fg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 10;
  const funnelCx = pad + funnelW / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const { topHalf } = funnelRatios(i, count);

    // Offset shadow trapezoid
    drawTrapezoid(svg, funnelCx + 4, y + 4, stageH, funnelW, i, count, {
      fill: '#000000', opacity: 0.15,
    });
    // Main colored trapezoid with thick border
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: color, stroke: d.border, 'stroke-width': 3,
    });
    // Large number + label
    svg.text(funnelCx, y + stageH / 2 - 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 24, 'font-weight': 900, fill: '#FFFFFF',
    });
    svg.text(funnelCx, y + stageH / 2 + 16, stage.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize + 2, 'font-weight': d.fontWeight, fill: '#FFFFFF',
    });
    if (stage.value) {
      svg.text(funnelCx, y + stageH / 2 + 32, stage.value, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: '#FFFFFF', opacity: 0.9,
      });
    }
    drawAnnotation(svg, d, pad + funnelW + gap, y, stageH, annotW, funnelCx + funnelW * topHalf - 10, color, i, stage);
  }

  return svg.build();
}

// ========== FLAT ==========
// Horizontal bar style: flat rectangles (not trapezoids), left-aligned, no shadows

function renderFlat(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const count = data.stages.length;
  const maxBarW = 440;
  const barH = 48;
  const gap = 6;
  const width = pad * 2 + maxBarW + 80;
  const height = pad * 2 + titleH + count * (barH + gap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * (barH + gap);
    const ratio = 1 - (i / count) * 0.7;
    const barW = Math.floor(maxBarW * ratio);

    // Flat bar — no shadow, left-aligned
    svg.rect(pad, y, barW, barH, { fill: color, rx: d.borderRadius, opacity: 0.9 });
    // Label inside bar
    svg.text(pad + 16, y + barH / 2 + 5, stage.label, {
      'text-anchor': 'start', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: '#FFFFFF',
    });
    // Value right of bar
    if (stage.value) {
      svg.text(pad + barW + 12, y + barH / 2 + 5, stage.value, {
        'text-anchor': 'start', 'font-size': d.captionSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark background, translucent trapezoids, glow effects

function renderGlass(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.stages.length;
  const funnelW = 340;
  const annotW = 300;
  const gap = 44;
  const hasDesc = data.stages.some(s => s.description);
  const stageH = hasDesc ? 100 : 84;
  const width = pad * 2 + funnelW + gap + annotW;
  const height = pad * 2 + titleH + count * stageH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (glass)',
    buildColorGradients(d, count, 'fg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 10;
  const funnelCx = pad + funnelW / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const { topHalf } = funnelRatios(i, count);

    // Glow behind trapezoid
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: color, opacity: 0.08, filter: 'url(#shadow)',
    });
    // Translucent trapezoid with subtle border
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, opacity: 0.75,
      ...d.cardAttrs(),
    });
    // Top highlight line
    const tw = funnelW * funnelRatios(i, count).topHalf;
    svg.path(`M ${funnelCx - tw + 20} ${y + 3} L ${funnelCx + tw - 20} ${y + 3}`, {
      stroke: color, 'stroke-width': 1, opacity: 0.4, 'stroke-linecap': 'round',
    });
    // Icon with glow
    svg.circle(funnelCx, y + stageH / 2, 18, { fill: color, opacity: 0.12 });
    svg.raw(icon(stageIcon(i), funnelCx, y + stageH / 2, 14, '#FFFFFF'));
    // Label below icon
    svg.text(funnelCx, y + stageH / 2 + 28, stage.label, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    drawAnnotation(svg, d, pad + funnelW + gap, y, stageH, annotW, funnelCx + funnelW * topHalf - 10, color, i, stage);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark background, neon outline trapezoids, glow

function renderNeon(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.stages.length;
  const funnelW = 340;
  const annotW = 300;
  const gap = 44;
  const hasDesc = data.stages.some(s => s.description);
  const stageH = hasDesc ? 100 : 84;
  const width = pad * 2 + funnelW + gap + annotW;
  const height = pad * 2 + titleH + count * stageH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 10;
  const funnelCx = pad + funnelW / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const { topHalf } = funnelRatios(i, count);

    // Dark fill trapezoid
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1,
    });
    // Neon glow outline
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3, filter: 'url(#neon-glow)',
    });
    // Neon icon ring
    svg.circle(funnelCx, y + stageH / 2, 16, {
      fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
    });
    svg.raw(icon(stageIcon(i), funnelCx, y + stageH / 2, 12, color));
    // Stage number
    svg.text(funnelCx + 30, y + stageH / 2 + 5, `0${i + 1}`, {
      'text-anchor': 'start', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    // Label
    svg.text(funnelCx - 30, y + stageH / 2 + 5, stage.label, {
      'text-anchor': 'end', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    drawAnnotation(svg, d, pad + funnelW + gap, y, stageH, annotW, funnelCx + funnelW * topHalf - 10, color, i, stage);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft trapezoids with watercolor wash, bleed effects

function renderWatercolor(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.stages.length;
  const funnelW = 340;
  const annotW = 300;
  const gap = 44;
  const hasDesc = data.stages.some(s => s.description);
  const stageH = hasDesc ? 100 : 84;
  const width = pad * 2 + funnelW + gap + annotW;
  const height = pad * 2 + titleH + count * stageH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (watercolor)',
    buildColorGradients(d, count, 'fg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH + 10;
  const funnelCx = pad + funnelW / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const { topHalf, botHalf } = funnelRatios(i, count);

    // Watercolor bleed behind trapezoid
    const avgHalf = (funnelW * topHalf + funnelW * botHalf) / 2;
    svg.ellipse(funnelCx, y + stageH / 2, avgHalf + 12, stageH / 2 + 6, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft-painted trapezoid
    drawTrapezoid(svg, funnelCx, y, stageH, funnelW, i, count, {
      fill: color, opacity: 0.6, filter: 'url(#watercolor)',
    });
    // Label
    svg.text(funnelCx, y + stageH / 2 + 5, stage.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    if (stage.value) {
      svg.text(funnelCx, y + stageH / 2 + 20, stage.value, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary, opacity: 0.8,
      });
    }
    drawAnnotation(svg, d, pad + funnelW + gap, y, stageH, annotW, funnelCx + funnelW * topHalf - 10, color, i, stage);
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.stages.length;
  const funnelW = 300;
  const stageH = 70;
  const width = pad * 2 + funnelW;
  const height = pad * 2 + titleH + count * stageH + 30;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const cx = width / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const y = contentTop + i * stageH;
    drawTrapezoid(svg, cx, y, stageH, funnelW, i, count, { fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth });
    drawStageLabel(svg, d, cx, y, stageH, stage, d.text);
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.stages.length;
  const funnelW = 300;
  const stageH = 60;
  const width = pad * 2 + funnelW;
  const height = pad * 2 + titleH + count * stageH + 20;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const cx = width / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const y = contentTop + i * stageH;
    const ratio = 1 - (i / count) * 0.7;
    const w = Math.floor(funnelW * ratio);

    svg.rect(cx - w / 2, y + 2, w, stageH - 4, {
      fill: color, opacity: 0.85, 'shape-rendering': 'crispEdges',
    });
    drawStageLabel(svg, d, cx, y, stageH, stage, d.text, color);
  }

  return svg.build();
}

// ========== HORIZONTAL ==========
// Horizontal funnel: stages narrow left-to-right

function hFunnelRatios(i: number, count: number): { leftHalf: number; rightHalf: number } {
  const leftRatio = 1 - (i / count) * 0.7;
  const rightRatio = 1 - ((i + 1) / count) * 0.7;
  return { leftHalf: leftRatio / 2, rightHalf: rightRatio / 2 };
}

function renderHorizontal(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.stages.length;
  const funnelH = 240;
  const stageW = 120;
  const labelH = 80;
  const width = pad * 2 + count * stageW + 40;
  const height = pad * 2 + titleH + funnelH + labelH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel diagram (horizontal)',
    buildColorGradients(d, count, 'fg'));
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
  const cy = contentTop + funnelH / 2;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);
    const x = pad + i * stageW;
    const { leftHalf, rightHalf } = hFunnelRatios(i, count);
    const lh = funnelH * leftHalf;
    const rh = funnelH * rightHalf;
    const gap = 2;

    // Trapezoid (horizontal: tall left, short right)
    if (d.id === 'neon') {
      svg.polygon(
        `${x + gap},${cy - lh} ${x + stageW - gap},${cy - rh} ${x + stageW - gap},${cy + rh} ${x + gap},${cy + lh}`,
        { fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1.5 },
      );
      svg.polygon(
        `${x + gap},${cy - lh} ${x + stageW - gap},${cy - rh} ${x + stageW - gap},${cy + rh} ${x + gap},${cy + lh}`,
        { fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3, filter: 'url(#neon-glow)' },
      );
    } else {
      svg.polygon(
        `${x + gap},${cy - lh} ${x + stageW - gap},${cy - rh} ${x + stageW - gap},${cy + rh} ${x + gap},${cy + lh}`,
        { fill: color, opacity: 0.85 },
      );
    }

    // Stage number inside
    svg.text(x + stageW / 2, cy + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Label below
    const labelY = contentTop + funnelH + 16;
    drawLabelBlock(svg, d, stage.label, stage.value, x + stageW / 2, labelY, stageW - 12);
  }

  // Arrow indicator at the end
  const arrowX = pad + count * stageW + 8;
  svg.path(`M ${arrowX} ${cy - 8} L ${arrowX + 16} ${cy} L ${arrowX} ${cy + 8}`, {
    fill: d.colors[0]!, opacity: 0.5,
  });

  return svg.build();
}

// ========== PIPELINE ==========
// Equal-width rounded rectangles stacked vertically, connected by arrows

function renderPipeline(data: FunnelData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.stages.length;
  const boxW = 380;
  const boxH = 56;
  const gap = 16;
  const arrowH = 20;
  const width = pad * 2 + boxW;
  const height = pad * 2 + titleH + count * boxH + (count - 1) * (gap + arrowH);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Funnel pipeline',
    buildColorGradients(d, count, 'fg'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const cx = pad + boxW / 2;
  let curY = pad + titleH;

  for (let i = 0; i < count; i++) {
    const stage = data.stages[i]!;
    const color = stageColor(d, i);

    if (d.id === 'neon') {
      svg.rect(pad, curY, boxW, boxH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(pad, curY, boxW, boxH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      // Box shadow
      svg.rect(pad + 2, curY + 2, boxW, boxH, {
        fill: '#000', opacity: 0.06, rx: d.borderRadius,
      });
      // Box
      svg.rect(pad, curY, boxW, boxH, {
        fill: d.surface, stroke: color, 'stroke-width': 2, rx: d.borderRadius,
        ...d.cardAttrs(),
      });
      // Color accent on left
      svg.rect(pad, curY + 6, 4, boxH - 12, { fill: color, rx: 2 });
    }

    // Step number
    svg.circle(pad + 28, curY + boxH / 2, 12, { fill: color });
    svg.text(pad + 28, curY + boxH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Label
    const fit = fitText(stage.label, boxW - 80, 1, d.labelSize);
    svg.text(pad + 48, curY + boxH / 2 - (stage.description ? 4 : 0) + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    // Description
    if (stage.description) {
      const dfit = fitText(stage.description, boxW - 80, 1, d.captionSize);
      svg.text(pad + 48, curY + boxH / 2 + 16, dfit.lines[0]!, {
        'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
      });
    }

    // Arrow between stages
    if (i < count - 1) {
      const ay1 = curY + boxH + 4;
      const ay2 = ay1 + arrowH - 4;
      svg.path(`M ${cx} ${ay1} L ${cx} ${ay2}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 2, opacity: 0.4,
      });
      svg.path(`M ${cx - 5} ${ay2 - 5} L ${cx} ${ay2} L ${cx + 5} ${ay2 - 5}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 2, opacity: 0.4,
      });
    }

    curY += boxH + gap + arrowH;
  }

  return svg.build();
}
