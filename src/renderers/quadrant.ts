// Quadrant renderer — 2x2 labeled quadrant grid, design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface QuadrantData {
  labels: [string, string, string, string];
  quadrants: [string[], string[], string[], string[]];
}

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderQuadrant(data: QuadrantData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'color_block') return renderColorBlock(data, title, d);
  if (style === 'bubble') return renderBubble(data, title, d);
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

// --- Shared helpers ---

function maxItems(data: QuadrantData): number {
  return Math.max(...data.quadrants.map(q => q.length), 1);
}

function quadrantItemLines(
  svg: SvgBuilder, items: string[], x: number, startY: number, maxW: number,
  fontSize: number, fill: string, bulletFill: string,
): void {
  const lh = Math.round(fontSize * 1.6);
  let y = startY;
  for (const item of items) {
    const fit = fitText(item, maxW - 16, 1, fontSize);
    svg.circle(x + 4, y - 3, 2.5, { fill: bulletFill, opacity: 0.6 });
    svg.text(x + 14, y, fit.lines[0]!, {
      'font-size': fit.fontSize, fill,
    });
    y += lh;
  }
}

// ========== CLEAN ==========

function renderClean(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const cellW = 240;
  const itemH = maxItems(data) * 24 + 48;
  const cellH = Math.max(itemH, 120);
  const gap = 8;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant diagram');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const gridLeft = pad;

  // Quadrant positions: TL=0, TR=1, BL=2, BR=3
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = gridLeft + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Cell card
    drawPresetCard(svg, d, qx, qy, cellW, cellH, color);

    // Label
    const labelFit = fitText(data.labels[qi]!, cellW - 24, 1, d.labelSize);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 8, qy + 50, cellW - 16, 12, d.text, color);
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: vivid fills, offset shadow, thick borders

function renderBold(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const cellW = 250;
  const itemH = maxItems(data) * 26 + 52;
  const cellH = Math.max(itemH, 130);
  const gap = 10;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (bold)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Colored card with offset shadow
    svg.rect(qx, qy, cellW, cellH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner area
    svg.rect(qx + 4, qy + 40, cellW - 8, cellH - 48, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });

    // Label in colored header
    const labelFit = fitText(data.labels[qi]!, cellW - 28, 1, d.labelSize + 2);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Items in white area
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 12, qy + 58, cellW - 20, 13, d.text, color);
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat colored cells, no shadows

function renderFlat(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const cellW = 230;
  const itemH = maxItems(data) * 22 + 44;
  const cellH = Math.max(itemH, 110);
  const gap = 4;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Flat cell — no shadow, no border
    svg.rect(qx, qy, cellW, cellH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(qx, qy + 4, 4, cellH - 8, { fill: color, rx: 2 });

    // Label
    const labelFit = fitText(data.labels[qi]!, cellW - 28, 1, d.labelSize);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 8, qy + 48, cellW - 20, 12, d.text, color);
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass cells, glow accents

function renderGlass(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const cellW = 250;
  const itemH = maxItems(data) * 24 + 52;
  const cellH = Math.max(itemH, 130);
  const gap = 12;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (glass)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Glow behind
    svg.rect(qx + 4, qy + 4, cellW - 8, cellH - 8, {
      fill: color, opacity: 0.06, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass cell
    svg.rect(qx, qy, cellW, cellH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(qx + 16, qy + 1, cellW - 32, 1, { fill: color, opacity: 0.4, rx: 0.5 });

    // Label
    const labelFit = fitText(data.labels[qi]!, cellW - 24, 1, d.labelSize);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
      'letter-spacing': '0.3',
    });

    // Items
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 8, qy + 52, cellW - 20, 12, d.text, color);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon cell outlines, glow labels

function renderNeon(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const cellW = 240;
  const itemH = maxItems(data) * 24 + 48;
  const cellH = Math.max(itemH, 120);
  const gap = 10;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Dark cell with neon border
    svg.rect(qx, qy, cellW, cellH, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(qx, qy, cellW, cellH, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });

    // Label with number tag
    svg.text(qx + cellW - 16, qy + 18, `0${qi + 1}`, {
      'text-anchor': 'end', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    const labelFit = fitText(data.labels[qi]!, cellW - 24, 1, d.labelSize);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 8, qy + 50, cellW - 20, 12, d.text, color);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, watercolor wash cells, muted colors

function renderWatercolor(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const cellW = 240;
  const itemH = maxItems(data) * 24 + 48;
  const cellH = Math.max(itemH, 120);
  const gap = 16;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (watercolor)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);
    const ccx = qx + cellW / 2;
    const ccy = qy + cellH / 2;

    // Watercolor wash blob behind cell
    svg.ellipse(ccx, ccy, cellW / 2 + 10, cellH / 2 + 8, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });
    // Soft cell
    svg.rect(qx, qy, cellW, cellH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });

    // Label
    const labelFit = fitText(data.labels[qi]!, cellW - 24, 1, d.labelSize);
    svg.text(qx + 16, qy + 28, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    quadrantItemLines(svg, data.quadrants[qi]!, qx + 8, qy + 50, cellW - 20, 12, d.text, color);
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const cellW = 220;
  const itemH = maxItems(data) * 22 + 44;
  const cellH = Math.max(itemH, 110);
  const gridW = cellW * 2 + 24;
  const gridH = cellH * 2 + 24;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const cx = pad + gridW / 2;
  const cy = contentTop + gridH / 2;

  // Hand-drawn cross lines
  svg.path(jitterLine(cx, contentTop + 4, cx, contentTop + gridH - 4, 42), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });
  svg.path(jitterLine(pad + 4, cy, pad + gridW - 4, cy, 43), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });

  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const qx = pad + pos.col * (cellW + 24) + 12;
    const qy = contentTop + pos.row * (cellH + 24) + 8;

    // Label
    const labelFit = fitText(data.labels[qi]!, cellW - 24, 1, d.labelSize);
    svg.text(qx + 8, qy + 20, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'text-decoration': 'underline',
    });

    // Items as simple text lines
    const lh = 20;
    let iy = qy + 42;
    for (const item of data.quadrants[qi]!) {
      const fit = fitText(item, cellW - 32, 1, 12);
      svg.text(qx + 18, iy, `- ${fit.lines[0]!}`, {
        'font-size': fit.fontSize, fill: d.text,
      });
      iy += lh;
    }
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const px = 3;
  const cellW = 210;
  const itemH = maxItems(data) * 20 + 40;
  const cellH = Math.max(itemH, 100);
  const gap = 12;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Pixel border
    svg.raw(pixelBorder(qx, qy, cellW, cellH, color, px));
    svg.rect(qx + px, qy + px, cellW - px * 2, cellH - px * 2, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });

    // Label badge
    const labelFit = fitText(data.labels[qi]!, cellW - 32, 1, d.labelSize);
    svg.rect(qx + px, qy + px, cellW - px * 2, px * 7, {
      fill: color, opacity: 0.3, 'shape-rendering': 'crispEdges',
    });
    svg.text(qx + 12, qy + px * 5 + 2, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    const lh = 18;
    let iy = qy + px * 7 + 18;
    for (const item of data.quadrants[qi]!) {
      const fit = fitText(item, cellW - 28, 1, 11);
      svg.rect(qx + 10, iy - 5, px, px, { fill: color, 'shape-rendering': 'crispEdges' });
      svg.text(qx + 18, iy, fit.lines[0]!, {
        'font-size': fit.fontSize, fill: d.text,
      });
      iy += lh;
    }
  }

  return svg.build();
}

// ========== COLOR_BLOCK (style variant) ==========
// SWOT-style color blocks: no axis labels, 2x2 large colored blocks with label + bullet items

function renderColorBlock(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 48 : 0;
  const cellW = 260;
  const itemH = maxItems(data) * 24 + 52;
  const cellH = Math.max(itemH, 140);
  const gap = 2;
  const gridW = cellW * 2 + gap;
  const gridH = cellH * 2 + gap;
  const width = pad * 2 + gridW;
  const height = pad * 2 + titleH + gridH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (color block)');
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
  const positions = [
    { col: 0, row: 0 },
    { col: 1, row: 0 },
    { col: 0, row: 1 },
    { col: 1, row: 1 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const pos = positions[qi]!;
    const color = itemColor(d, qi);
    const qx = pad + pos.col * (cellW + gap);
    const qy = contentTop + pos.row * (cellH + gap);

    // Large colored background block
    if (d.id === 'neon') {
      svg.rect(qx, qy, cellW, cellH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(qx, qy, cellW, cellH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(qx, qy, cellW, cellH, {
        fill: color, opacity: 0.12, rx: d.borderRadius,
      });
    }

    // Bold label
    const labelFit = fitText(data.labels[qi]!, cellW - 32, 1, d.labelSize + 2);
    svg.text(qx + 20, qy + 32, labelFit.lines[0]!, {
      'font-size': labelFit.fontSize, 'font-weight': 700, fill: color,
    });

    // Bullet items
    const lh = Math.round(13 * 1.6);
    let iy = qy + 56;
    for (const item of data.quadrants[qi]!) {
      const fit = fitText(item, cellW - 48, 1, 13);
      svg.circle(qx + 24, iy - 3, 3, { fill: color, opacity: 0.5 });
      svg.text(qx + 36, iy, fit.lines[0]!, {
        'font-size': fit.fontSize, fill: d.text,
      });
      iy += lh;
    }
  }

  return svg.build();
}

// ========== BUBBLE ==========
// Bubble chart: X/Y axes, items as circles placed by quadrant position

function renderBubble(data: QuadrantData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 48 : 0;
  const axisLen = 400;
  const axisMargin = 40;
  const width = pad * 2 + axisLen + axisMargin;
  const height = pad * 2 + titleH + axisLen + axisMargin;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Quadrant (bubble)');
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const originX = pad + axisMargin;
  const originY = pad + titleH + axisLen;
  const endX = originX + axisLen;
  const endY = pad + titleH;

  // Axes
  svg.line(originX, originY, endX, originY, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.5,
  });
  svg.line(originX, originY, originX, endY, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.5,
  });
  // Arrow tips
  svg.path(`M ${endX - 6} ${originY - 4} L ${endX} ${originY} L ${endX - 6} ${originY + 4}`, {
    fill: d.border, opacity: 0.5,
  });
  svg.path(`M ${originX - 4} ${endY + 6} L ${originX} ${endY} L ${originX + 4} ${endY + 6}`, {
    fill: d.border, opacity: 0.5,
  });

  // Quadrant tint areas
  const midX = originX + axisLen / 2;
  const midY = originY - axisLen / 2;
  const halfLen = axisLen / 2;
  for (let qi = 0; qi < 4; qi++) {
    const color = itemColor(d, qi);
    const qx = qi === 0 || qi === 2 ? originX : midX;
    const qy = qi === 0 || qi === 1 ? midY : originY - halfLen;
    svg.rect(qx, qy, halfLen, halfLen, { fill: color, opacity: 0.04 });
  }

  // Dashed center lines
  svg.line(midX, originY, midX, endY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.15, 'stroke-dasharray': '4,4',
  });
  svg.line(originX, midY, endX, midY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.15, 'stroke-dasharray': '4,4',
  });

  // Quadrant label positions: TL=0, TR=1, BL=2, BR=3
  const labelPositions = [
    { lx: originX + 8, ly: midY - halfLen + 18 },
    { lx: midX + 8, ly: midY - halfLen + 18 },
    { lx: originX + 8, ly: midY + 18 },
    { lx: midX + 8, ly: midY + 18 },
  ];

  for (let qi = 0; qi < 4; qi++) {
    const color = itemColor(d, qi);
    const lp = labelPositions[qi]!;

    // Quadrant label
    const labelFit = fitText(data.labels[qi]!, halfLen - 16, 1, d.captionSize);
    svg.text(lp.lx, lp.ly, labelFit.lines[0]!, {
      'text-anchor': 'start', 'font-size': labelFit.fontSize, fill: color, opacity: 0.6,
    });

    // Bubble positions: spread items within quadrant
    const items = data.quadrants[qi]!;
    const baseX = qi === 0 || qi === 2 ? originX + halfLen * 0.25 : midX + halfLen * 0.25;
    const baseY = qi === 0 || qi === 1 ? endY + halfLen * 0.3 : midY + halfLen * 0.3;

    for (let j = 0; j < items.length; j++) {
      const bubbleR = Math.max(20, 32 - items.length * 2);
      const offsetX = (j % 3) * (bubbleR * 2.2) + (j > 2 ? bubbleR : 0);
      const offsetY = Math.floor(j / 3) * (bubbleR * 2.2);
      const bx = baseX + offsetX;
      const by = baseY + offsetY;

      if (d.id === 'neon') {
        svg.circle(bx, by, bubbleR, { fill: 'rgba(0,0,0,0.4)' });
        svg.circle(bx, by, bubbleR, {
          fill: 'none', stroke: color, 'stroke-width': 1.5,
        });
        svg.circle(bx, by, bubbleR, {
          fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3, filter: 'url(#neon-glow)',
        });
      } else {
        svg.circle(bx, by, bubbleR, { fill: color, opacity: 0.2 });
        svg.circle(bx, by, bubbleR, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.6,
        });
      }
      const fit = fitText(items[j]!, bubbleR * 1.6, 1, 10);
      svg.text(bx, by + 4, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
      });
    }
  }

  return svg.build();
}
