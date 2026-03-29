// Venn diagram renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface VennSet {
  label: string;
  items: string[];
}

interface VennData {
  sets: VennSet[];
  intersection?: string;
}

function setColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderVenn(data: VennData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'distinction': return renderDistinction(data, title, d);
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

// --- Circle positions for 2-3 sets ---

function circleLayout(count: number, cx: number, cy: number, radius: number, overlap: number): Array<{ x: number; y: number }> {
  if (count === 1) return [{ x: cx, y: cy }];
  if (count === 2) {
    return [
      { x: cx - overlap, y: cy },
      { x: cx + overlap, y: cy },
    ];
  }
  // 3 sets: triangle arrangement
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: cx + overlap * Math.cos(angle), y: cy + overlap * Math.sin(angle) };
  });
}

// ========== CLEAN ==========

function renderClean(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 90;
  const overlap = 50;
  const size = (circR + overlap + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram',
    buildColorGradients(d, count, 'vn'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Circles with transparency
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    svg.circle(pos.x, pos.y, circR, { fill: color, opacity: 0.15 });
    svg.circle(pos.x, pos.y, circR, { fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5 });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    // Push label away from center
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 40;
    const labelY = pos.y + (dy / dist) * 40;

    const fit = fitText(set.label, circR * 1.2, 2, d.labelSize);
    let ty = labelY - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(labelX, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }

    // Items below label
    for (let j = 0; j < Math.min(set.items.length, 3); j++) {
      svg.text(labelX, ty + 2, set.items[j]!, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
      ty += Math.round(d.captionSize * 1.3);
    }
  }

  // Intersection label
  if (data.intersection) {
    const fit = fitText(data.intersection, 80, 2, d.captionSize + 1);
    let ty = cy - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(cx, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick borders, offset shadow, vivid fills

function renderBold(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 100;
  const overlap = 54;
  const size = (circR + overlap + 90) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (bold)',
    buildColorGradients(d, count, 'vn'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Circles with bold fills and offset shadow
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    svg.circle(pos.x, pos.y, circR, { fill: color, opacity: 0.25, filter: 'url(#bold-offset)' });
    svg.circle(pos.x, pos.y, circR, { fill: 'none', stroke: color, 'stroke-width': 4 });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 44;
    const labelY = pos.y + (dy / dist) * 44;

    const fit = fitText(set.label, circR * 1.2, 1, d.labelSize + 2);
    svg.text(labelX, labelY, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: d.text,
    });
  }

  if (data.intersection) {
    const fit = fitText(data.intersection, 90, 2, d.captionSize + 2);
    let ty = cy - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(cx, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat circles, no shadows, clean labels

function renderFlat(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 85;
  const overlap = 48;
  const size = (circR + overlap + 70) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Flat filled circles — no border, no shadow
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    svg.circle(pos.x, pos.y, circR, { fill: color, opacity: 0.18 });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 38;
    const labelY = pos.y + (dy / dist) * 38;

    svg.text(labelX, labelY, set.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  if (data.intersection) {
    svg.text(cx, cy + 4, data.intersection, {
      'text-anchor': 'middle', 'font-size': d.captionSize + 1, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass circles, glow effects

function renderGlass(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 95;
  const overlap = 52;
  const size = (circR + overlap + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (glass)',
    buildColorGradients(d, count, 'vn'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Glass circles with glow
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    // Glow behind
    svg.circle(pos.x, pos.y, circR + 4, { fill: color, opacity: 0.06, filter: 'url(#shadow)' });
    // Frosted circle
    svg.circle(pos.x, pos.y, circR, {
      fill: d.surface, opacity: 0.15, stroke: d.border, 'stroke-width': 1,
    });
    // Top highlight
    svg.circle(pos.x, pos.y, circR, {
      fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3,
    });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const color = setColor(d, i);
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 42;
    const labelY = pos.y + (dy / dist) * 42;

    const fit = fitText(set.label, circR * 1.2, 2, d.labelSize);
    let ty = labelY - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(labelX, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
        'letter-spacing': '0.3',
      });
      ty += Math.round(fit.fontSize * 1.4);
    }

    for (let j = 0; j < Math.min(set.items.length, 3); j++) {
      svg.text(labelX, ty + 2, set.items[j]!, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
      ty += Math.round(d.captionSize * 1.3);
    }
  }

  if (data.intersection) {
    const fit = fitText(data.intersection, 80, 2, d.captionSize + 1);
    let ty = cy - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(cx, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon circle outlines, glow effects

function renderNeon(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 90;
  const overlap = 50;
  const size = (circR + overlap + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Neon circle outlines
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    svg.circle(pos.x, pos.y, circR, {
      fill: 'rgba(0,0,0,0.2)', stroke: color, 'stroke-width': 1.5,
    });
    svg.circle(pos.x, pos.y, circR, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.3, filter: 'url(#neon-glow)',
    });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const color = setColor(d, i);
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 40;
    const labelY = pos.y + (dy / dist) * 40;

    svg.text(labelX, labelY, set.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': d.fontWeight, fill: color,
    });
  }

  if (data.intersection) {
    svg.text(cx, cy + 4, data.intersection, {
      'text-anchor': 'middle', 'font-size': d.captionSize + 1, 'font-weight': d.fontWeight, fill: d.text,
    });
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft circles, watercolor filter, muted palette

function renderWatercolor(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 95;
  const overlap = 52;
  const size = (circR + overlap + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (watercolor)',
    buildColorGradients(d, count, 'vn'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Watercolor circles
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    svg.circle(pos.x, pos.y, circR + 8, { fill: color, opacity: 0.1, filter: 'url(#watercolor)' });
    svg.circle(pos.x, pos.y, circR, { fill: color, opacity: 0.15, filter: 'url(#watercolor)' });
  }

  // Set labels
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 40;
    const labelY = pos.y + (dy / dist) * 40;

    const fit = fitText(set.label, circR * 1.2, 2, d.labelSize);
    let ty = labelY - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(labelX, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }

    for (let j = 0; j < Math.min(set.items.length, 3); j++) {
      svg.text(labelX, ty + 2, set.items[j]!, {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
      });
      ty += Math.round(d.captionSize * 1.3);
    }
  }

  if (data.intersection) {
    const fit = fitText(data.intersection, 80, 2, d.captionSize + 1);
    let ty = cy - ((fit.lines.length - 1) * fit.fontSize * 0.7);
    for (const line of fit.lines) {
      svg.text(cx, ty, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      ty += Math.round(fit.fontSize * 1.4);
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 80;
  const overlap = 44;
  const size = (circR + overlap + 70) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    svg.circle(pos.x, pos.y, circR, { fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.5 });
  }

  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = pos.x + (dx / dist) * 36;
    const labelY = pos.y + (dy / dist) * 36;

    svg.text(labelX, labelY, set.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize, fill: d.text,
    });
  }

  if (data.intersection) {
    svg.text(cx, cy + 4, data.intersection, {
      'text-anchor': 'middle', 'font-size': d.captionSize + 1, fill: d.text,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: VennData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = Math.min(data.sets.length, 3);
  const circR = 70;
  const overlap = 38;
  const size = (circR + overlap + 50) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circleLayout(count, cx, cy, circR, overlap);

  // Use rectangles for pixel style
  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const color = setColor(d, i);
    const bx = Math.round(pos.x - circR);
    const by = Math.round(pos.y - circR);
    const bw = circR * 2;
    svg.rect(bx, by, bw, bw, {
      fill: color, opacity: 0.15, 'shape-rendering': 'crispEdges',
    });
    svg.rect(bx, by, bw, bw, {
      fill: 'none', stroke: color, 'stroke-width': 2, 'shape-rendering': 'crispEdges',
    });
  }

  for (let i = 0; i < count; i++) {
    const pos = positions[i]!;
    const set = data.sets[i]!;
    const dx = pos.x - cx;
    const dy = pos.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const labelX = Math.round(pos.x + (dx / dist) * 30);
    const labelY = Math.round(pos.y + (dy / dist) * 30);

    svg.text(labelX, labelY, set.label, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': 700, fill: d.text,
    });
  }

  if (data.intersection) {
    svg.text(Math.round(cx), Math.round(cy) + 4, data.intersection, {
      'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': 700, fill: d.text,
    });
  }

  return svg.build();
}

// ========== DISTINCTION (style variant) ==========
// Emphasizes differences between sets — sets drawn further apart, "vs" label between them

function renderDistinction(data: VennData, title: string | undefined, d: DesignPreset): string {
  const count = Math.min(data.sets.length, 3);
  const pad = 48;
  const titleH = title ? 48 : 0;
  const cardW = 200;
  const cardH = 200;
  const gapW = 80; // wider gap between sets
  const totalW = count * cardW + (count - 1) * gapW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH + 40;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Venn diagram (distinction)',
    buildColorGradients(d, count, 'vn'));
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
    const set = data.sets[i]!;
    const color = setColor(d, i);
    const cx = pad + i * (cardW + gapW) + cardW / 2;
    const cy = contentTop + cardH / 2;
    const circR = cardW / 2 - 10;

    // Circle for each set (no overlap)
    if (d.lineJitter) {
      svg.circle(cx, cy, circR, { fill: 'none', stroke: color, 'stroke-width': 2 });
    } else if (d.id === 'neon') {
      svg.circle(cx, cy, circR, { fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1.5 });
      svg.circle(cx, cy, circR, { fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.3, filter: 'url(#neon-glow)' });
    } else if (d.id === 'bold') {
      svg.circle(cx, cy, circR, { fill: color, opacity: 0.15, filter: 'url(#bold-offset)' });
      svg.circle(cx, cy, circR, { fill: 'none', stroke: color, 'stroke-width': 4 });
    } else if (d.id === 'watercolor') {
      svg.circle(cx, cy, circR + 4, { fill: color, opacity: 0.1, filter: 'url(#watercolor)' });
      svg.circle(cx, cy, circR, { fill: color, opacity: 0.12, filter: 'url(#watercolor)' });
    } else {
      svg.circle(cx, cy, circR, { fill: color, opacity: 0.1 });
      svg.circle(cx, cy, circR, { fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5 });
    }

    // Set label (centered, bold)
    const labelFit = fitText(set.label, cardW - 32, 2, d.labelSize + 1);
    let ty = cy - 20 - ((labelFit.lines.length - 1) * labelFit.fontSize * 0.6);
    for (const line of labelFit.lines) {
      svg.text(cx, ty, line, {
        'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': 700,
        fill: d.id === 'neon' ? color : d.text,
        ...(d.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
      });
      ty += Math.round(labelFit.fontSize * 1.4);
    }

    // Items below label
    for (let j = 0; j < Math.min(set.items.length, 4); j++) {
      const itemFit = fitText(set.items[j]!, cardW - 48, 1, d.captionSize);
      svg.text(cx, ty + 4, itemFit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
      ty += Math.round(d.captionSize * 1.4);
    }

    // "vs" or divider between sets (not after the last one)
    if (i < count - 1) {
      const vsX = pad + i * (cardW + gapW) + cardW + gapW / 2;
      const vsY = contentTop + cardH / 2;

      if (d.id === 'neon') {
        svg.text(vsX, vsY - 4, 'vs', {
          'text-anchor': 'middle', 'font-size': d.labelSize + 4, 'font-weight': 700,
          fill: '#FF00FF', filter: 'url(#neon-glow)',
        });
        // Vertical divider lines
        svg.line(vsX, vsY - cardH / 2 + 20, vsX, vsY - 18, {
          stroke: '#FF00FF', 'stroke-width': 1, opacity: 0.4, filter: 'url(#neon-glow)',
        });
        svg.line(vsX, vsY + 14, vsX, vsY + cardH / 2 - 20, {
          stroke: '#FF00FF', 'stroke-width': 1, opacity: 0.4, filter: 'url(#neon-glow)',
        });
      } else if (d.id === 'bold') {
        svg.text(vsX, vsY + 6, 'VS', {
          'text-anchor': 'middle', 'font-size': d.labelSize + 8, 'font-weight': 900, fill: d.text,
        });
      } else {
        // Subtle vertical dashes with "vs" label
        svg.line(vsX, vsY - cardH / 2 + 20, vsX, vsY - 14, {
          stroke: d.border, 'stroke-width': 1.5, opacity: 0.3, 'stroke-dasharray': '4,4',
        });
        svg.text(vsX, vsY + 4, 'vs', {
          'text-anchor': 'middle', 'font-size': d.captionSize + 2, 'font-weight': d.fontWeight,
          fill: d.textSecondary,
        });
        svg.line(vsX, vsY + 14, vsX, vsY + cardH / 2 - 20, {
          stroke: d.border, 'stroke-width': 1.5, opacity: 0.3, 'stroke-dasharray': '4,4',
        });
      }
    }
  }

  // Intersection label at the bottom if present
  if (data.intersection) {
    const intY = contentTop + cardH + 24;
    const intFit = fitText(data.intersection, totalW - 40, 1, d.captionSize + 1);
    svg.text(width / 2, intY, intFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': intFit.fontSize, 'font-weight': d.fontWeight,
      fill: d.textSecondary, 'font-style': 'italic',
    });
  }

  return svg.build();
}
