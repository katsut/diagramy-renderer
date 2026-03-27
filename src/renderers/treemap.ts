// Treemap renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface TreemapItem {
  label: string;
  value: number;
  children?: TreemapItem[];
}

interface TreemapData {
  items: TreemapItem[];
}

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderTreemap(data: TreemapData, title?: string, design?: DesignPreset): string {
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

// --- Squarified layout ---

interface TRect { label: string; x: number; y: number; w: number; h: number; colorIdx: number; }

function squarify(items: TreemapItem[], x: number, y: number, w: number, h: number, startIdx: number): TRect[] {
  const total = items.reduce((s, it) => s + Math.max(it.value, 1), 0);
  if (total === 0 || items.length === 0) return [];

  const rects: TRect[] = [];
  let cx = x, cy = y, cw = w, ch = h;
  let remaining = total;

  for (let i = 0; i < items.length; i++) {
    const item = items[i]!;
    const ratio = Math.max(item.value, 1) / remaining;
    const isHoriz = cw >= ch;
    const rw = isHoriz ? cw * ratio : cw;
    const rh = isHoriz ? ch : ch * ratio;

    rects.push({ label: item.label, x: cx, y: cy, w: rw, h: rh, colorIdx: startIdx + i });
    remaining -= Math.max(item.value, 1);

    if (isHoriz) cx += rw;
    else cy += rh;

    if (isHoriz) cw -= rw;
    else ch -= rh;
  }
  return rects;
}

// ========== CLEAN ==========

function renderClean(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const chartW = 500;
  const chartH = 320;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram',
    buildColorGradients(d, data.items.length, 'tm'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 3;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    svg.rect(r.x + gap, r.y + gap, Math.max(r.w - gap * 2, 1), Math.max(r.h - gap * 2, 1), {
      fill: color, opacity: 0.75, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      ...d.cardAttrs(),
    });
    if (r.w > 40 && r.h > 24) {
      const fit = fitText(r.label, r.w - gap * 2 - 12, 2, d.labelSize);
      let ty = r.y + gap + r.h / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(r.x + r.w / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: 'white',
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const chartW = 480;
  const chartH = 300;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 4;

  for (const r of rects) {
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);
    svg.path(jitterRect(rx, ry, rw, rh, r.colorIdx * 17), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
    if (rw > 40 && rh > 24) {
      const fit = fitText(r.label, rw - 12, 2, d.labelSize);
      let ty = ry + rh / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const chartW = 460;
  const chartH = 280;
  const px = 3;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 2;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = Math.round(r.x + gap);
    const ry = Math.round(r.y + gap);
    const rw = Math.round(Math.max(r.w - gap * 2, px * 3));
    const rh = Math.round(Math.max(r.h - gap * 2, px * 3));
    svg.rect(rx, ry, rw, rh, {
      fill: color, opacity: 0.8, 'shape-rendering': 'crispEdges',
    });
    if (rw > 40 && rh > 20) {
      const fit = fitText(r.label, rw - 10, 1, d.labelSize);
      svg.text(rx + rw / 2, ry + rh / 2 + 4, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.bg,
      });
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: thick borders, offset shadow, large bold labels

function renderBold(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const chartW = 520;
  const chartH = 340;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (bold)',
    buildColorGradients(d, data.items.length, 'tm'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 4;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);

    // Colored rect with offset shadow and thick border
    svg.rect(rx, ry, rw, rh, {
      fill: color, rx: d.borderRadius,
      stroke: d.text, 'stroke-width': 3, filter: 'url(#bold-offset)',
    });

    if (rw > 40 && rh > 28) {
      // Number badge
      svg.circle(rx + 18, ry + 18, 12, { fill: '#FFFFFF' });
      svg.text(rx + 18, ry + 22, `${r.colorIdx + 1}`, {
        'text-anchor': 'middle', 'font-size': 11, 'font-weight': 900, fill: color,
      });
      const fit = fitText(r.label, rw - 12, 2, d.labelSize + 1);
      let ty = ry + rh / 2 + 4;
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 800, fill: '#FFFFFF',
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: no shadows, no borders, subtle color fills

function renderFlat(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const chartW = 480;
  const chartH = 300;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 2;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);

    // Flat fill — no shadow, no border
    svg.rect(rx, ry, rw, rh, {
      fill: color, rx: d.borderRadius,
    });

    if (rw > 36 && rh > 22) {
      const fit = fitText(r.label, rw - 12, 2, d.labelSize);
      let ty = ry + rh / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: '#FFFFFF',
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass rectangles, glow effects

function renderGlass(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const chartW = 520;
  const chartH = 340;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (glass)',
    buildColorGradients(d, data.items.length, 'tm'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 4;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);

    // Glow behind
    svg.rect(rx + 2, ry + 2, rw - 4, rh - 4, {
      fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass rect
    svg.rect(rx, ry, rw, rh, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    if (rw > 30) {
      svg.rect(rx + 8, ry + 1, Math.max(rw - 16, 2), 1, { fill: color, opacity: 0.4, rx: 0.5 });
    }
    // Color tint inside
    svg.rect(rx + 2, ry + 2, rw - 4, rh - 4, {
      fill: color, opacity: 0.08, rx: d.borderRadius - 1,
    });

    if (rw > 40 && rh > 24) {
      const fit = fitText(r.label, rw - 12, 2, d.labelSize);
      let ty = ry + rh / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outline rectangles, glow effects

function renderNeon(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const chartW = 500;
  const chartH = 320;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 3;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);

    // Dark rect with neon border
    svg.rect(rx, ry, rw, rh, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(rx, ry, rw, rh, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });

    if (rw > 40 && rh > 24) {
      const fit = fitText(r.label, rw - 12, 2, d.labelSize);
      let ty = ry + rh / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: TreemapData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const chartW = 500;
  const chartH = 320;
  const width = pad * 2 + chartW;
  const height = pad * 2 + titleH + chartH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Treemap diagram (watercolor)',
    buildColorGradients(d, data.items.length, 'tm'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const rects = squarify(data.items, pad, pad + titleH, chartW, chartH, 0);
  const gap = 4;

  for (const r of rects) {
    const color = itemColor(d, r.colorIdx);
    const rx = r.x + gap;
    const ry = r.y + gap;
    const rw = Math.max(r.w - gap * 2, 1);
    const rh = Math.max(r.h - gap * 2, 1);

    // Watercolor wash blob behind
    svg.ellipse(rx + rw / 2, ry + rh / 2, rw / 2 + 6, rh / 2 + 4, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });
    // Soft rect
    svg.rect(rx, ry, rw, rh, {
      fill: color, opacity: 0.6, rx: d.borderRadius, filter: 'url(#watercolor)',
    });

    if (rw > 40 && rh > 24) {
      const fit = fitText(r.label, rw - 12, 2, d.labelSize);
      let ty = ry + rh / 2 - ((fit.lines.length - 1) * fit.fontSize * 0.7);
      for (const line of fit.lines) {
        svg.text(rx + rw / 2, ty, line, {
          'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: d.text,
        });
        ty += Math.round(fit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}
