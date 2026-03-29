// Concentric circles renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface Ring {
  label: string;
  description?: string;
}

interface ConcentricCirclesData {
  rings: Ring[];
}

function ringColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// Distribute ring labels around circle at different angles to avoid overlap
const LABEL_ANGLES = [0, -60, 60, 180, -120, 120, -30, 150];

function drawRingLabels(
  svg: ReturnType<typeof createDiagramSvg>['svg'],
  d: DesignPreset,
  data: ConcentricCirclesData,
  cx: number, cy: number,
  baseR: number, ringStep: number,
  opts?: { fillOverride?: (i: number) => string },
): void {
  const count = data.rings.length;
  for (let i = 0; i < count; i++) {
    const ring = data.rings[i]!;
    const r = baseR + i * ringStep;
    const color = ringColor(d, i);
    const fill = opts?.fillOverride?.(i) ?? d.text;

    if (i === 0) {
      const fit = fitText(ring.label, baseR * 1.6, 2, d.labelSize);
      let ty = cy - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(cx, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill,
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    } else {
      const angleDeg = LABEL_ANGLES[i % LABEL_ANGLES.length]!;
      const angleRad = angleDeg * Math.PI / 180;
      const labelR = r + 18;
      const lx = cx + labelR * Math.cos(angleRad);
      const ly = cy + labelR * Math.sin(angleRad);
      const anchor = Math.cos(angleRad) > 0.3 ? 'start' : Math.cos(angleRad) < -0.3 ? 'end' : 'middle';
      const fit = fitText(ring.label, 140, 1, d.labelSize);
      svg.line(
        cx + (r - 2) * Math.cos(angleRad), cy + (r - 2) * Math.sin(angleRad),
        lx - 4 * Math.cos(angleRad), ly - 4 * Math.sin(angleRad),
        { stroke: color, 'stroke-width': 1, opacity: 0.3 },
      );
      svg.text(lx, ly + 4, fit.lines[0]!, {
        'text-anchor': anchor, 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill,
      });
    }
  }
}

export function renderConcentricCircles(data: ConcentricCirclesData, title?: string, design?: DesignPreset): string {
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

// ========== CLEAN ==========

function renderClean(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.rings.length;
  const maxR = 40 + count * 36;
  const size = (maxR + 60) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles diagram',
    buildColorGradients(d, count, 'cc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Draw rings from outermost to innermost
  for (let i = count - 1; i >= 0; i--) {
    const r = 40 + (count - 1 - i) * 36 + 36;
    const color = ringColor(d, i);

    svg.beginItem(`rings[${i}]`);
    svg.circle(cx, cy, r, { fill: color, opacity: 0.08 });
    svg.circle(cx, cy, r, { fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3 });
    svg.endItem();
  }

  drawRingLabels(svg, d, data, cx, cy, 40, 36);

  return svg.build();
}

// ========== BOLD ==========
// Pop style: vivid fills, offset shadow, thick borders

function renderBold(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = data.rings.length;
  const maxR = 44 + count * 40;
  const size = (maxR + 70) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (bold)',
    buildColorGradients(d, count, 'cc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Draw rings from outermost to innermost
  for (let i = count - 1; i >= 0; i--) {
    const r = 44 + (count - 1 - i) * 40 + 40;
    const color = ringColor(d, i);

    svg.circle(cx, cy, r, { fill: color, opacity: 0.2, filter: 'url(#bold-offset)' });
    svg.circle(cx, cy, r, { fill: 'none', stroke: color, 'stroke-width': 4 });
  }

  drawRingLabels(svg, d, data, cx, cy, 44, 40);

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat concentric circles, no shadows

function renderFlat(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.rings.length;
  const maxR = 38 + count * 34;
  const size = (maxR + 50) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = count - 1; i >= 0; i--) {
    const r = 38 + (count - 1 - i) * 34 + 34;
    const color = ringColor(d, i);
    svg.circle(cx, cy, r, { fill: color, opacity: 0.12 });
  }

  drawRingLabels(svg, d, data, cx, cy, 38, 34);

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass rings, glow effects

function renderGlass(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.rings.length;
  const maxR = 42 + count * 38;
  const size = (maxR + 65) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (glass)',
    buildColorGradients(d, count, 'cc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = count - 1; i >= 0; i--) {
    const r = 42 + (count - 1 - i) * 38 + 38;
    const color = ringColor(d, i);

    // Glow behind ring
    svg.circle(cx, cy, r + 4, { fill: color, opacity: 0.04, filter: 'url(#shadow)' });
    // Frosted glass ring
    svg.circle(cx, cy, r, {
      fill: d.surface, opacity: 0.08, stroke: d.border, 'stroke-width': 1,
    });
    // Color accent
    svg.circle(cx, cy, r, { fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3 });
  }

  drawRingLabels(svg, d, data, cx, cy, 42, 38);

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon ring outlines, glow effects

function renderNeon(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.rings.length;
  const maxR = 40 + count * 36;
  const size = (maxR + 60) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = count - 1; i >= 0; i--) {
    const r = 40 + (count - 1 - i) * 36 + 36;
    const color = ringColor(d, i);

    svg.circle(cx, cy, r, {
      fill: 'rgba(0,0,0,0.15)', stroke: color, 'stroke-width': 1,
    });
    svg.circle(cx, cy, r, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3, filter: 'url(#neon-glow)',
    });
  }

  drawRingLabels(svg, d, data, cx, cy, 40, 36, {
    fillOverride: (i) => ringColor(d, i),
  });

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft rings, watercolor filter, muted palette

function renderWatercolor(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.rings.length;
  const maxR = 42 + count * 38;
  const size = (maxR + 65) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (watercolor)',
    buildColorGradients(d, count, 'cc'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = count - 1; i >= 0; i--) {
    const r = 42 + (count - 1 - i) * 38 + 38;
    const color = ringColor(d, i);

    svg.circle(cx, cy, r + 8, { fill: color, opacity: 0.08, filter: 'url(#watercolor)' });
    svg.circle(cx, cy, r, { fill: color, opacity: 0.12, filter: 'url(#watercolor)' });
  }

  drawRingLabels(svg, d, data, cx, cy, 42, 38);

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.rings.length;
  const maxR = 36 + count * 32;
  const size = (maxR + 50) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = count - 1; i >= 0; i--) {
    const r = 36 + (count - 1 - i) * 32 + 32;
    svg.circle(cx, cy, r, { fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.4 });
  }

  drawRingLabels(svg, d, data, cx, cy, 36, 32);

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: ConcentricCirclesData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.rings.length;
  const maxR = 30 + count * 28;
  const size = (maxR + 40) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Concentric circles (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  // Draw concentric squares (pixel style)
  for (let i = count - 1; i >= 0; i--) {
    const r = 30 + (count - 1 - i) * 28 + 28;
    const color = ringColor(d, i);
    const bx = Math.round(cx - r);
    const by = Math.round(cy - r);
    const bw = r * 2;
    svg.rect(bx, by, bw, bw, {
      fill: color, opacity: 0.1, 'shape-rendering': 'crispEdges',
    });
    svg.rect(bx, by, bw, bw, {
      fill: 'none', stroke: color, 'stroke-width': 2, 'shape-rendering': 'crispEdges',
    });
  }

  drawRingLabels(svg, d, data, cx, cy, 30, 28);

  return svg.build();
}
