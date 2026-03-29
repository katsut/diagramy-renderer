// Ranking renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';
import { profileItems, adaptiveLabelWidth } from '../shared/layout-planner.js';

interface RankingItem {
  label: string;
  value?: string;
  description?: string;
}

interface RankingData {
  items: RankingItem[];
}

function rankColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderRanking(data: RankingData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'vertical') return renderVerticalPodium(data, title, d);
  if (style === 'horizontal') return renderHorizontalBars(data, title, d);
  if (style === 'roi-bar') return renderRoiBar(data, title, d);
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

function renderClean(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const hasDesc = data.items.some(it => it.description);
  const rowH = hasDesc ? 56 : 44;
  const rowGap = 8;
  const rankW = 36;
  const profile = profileItems(data.items, d.labelSize, d.captionSize);
  const labelW = adaptiveLabelWidth(profile.maxLabelWidth, 120, 220);
  const barMaxW = 220;
  const totalW = rankW + 12 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking diagram',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Rank badge
    svg.circle(pad + rankW / 2, y + rowH / 2, rankW / 2, {
      fill: `url(#rk${i})`, ...d.cardAttrs(),
    });
    svg.text(pad + rankW / 2, y + rowH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: 'white',
    });

    // Label
    const lx = pad + rankW + 12;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Value bar
    const bx = lx + labelW + 12;
    svg.rect(bx, y + (rowH - 24) / 2, barW, 24, {
      fill: color, opacity: 0.2, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
    });
    svg.rect(bx, y + (rowH - 24) / 2, barW, 24, {
      fill: `url(#rk${i})`, opacity: 0.7, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
    });

    // Value text
    if (item.value) {
      svg.text(bx + barW - 8, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: 'white',
      });
    }

    // Description (fitted to available width)
    if (item.description) {
      const descMaxW = labelW + 12 + barMaxW;
      const dfit = fitText(item.description, descMaxW, 1, d.captionSize);
      svg.text(lx, y + rowH / 2 + 18, dfit.lines[0]!, {
        'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: large colored rank badges, thick bars with offset shadow

function renderBold(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = data.items.length;
  const rowH = 52;
  const rowGap = 12;
  const rankW = 44;
  const labelW = 170;
  const barMaxW = 240;
  const totalW = rankW + 16 + labelW + 16 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (bold)',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Rank badge with offset shadow
    svg.rect(pad, y + 4, rankW, rowH - 8, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    svg.text(pad + rankW / 2, y + rowH / 2 + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 20, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Label
    const lx = pad + rankW + 16;
    const fit = fitText(item.label, labelW, 1, d.labelSize + 2);
    svg.text(lx, y + rowH / 2 + 6, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 900, fill: d.text,
    });

    // Bar with offset shadow
    const bx = lx + labelW + 16;
    svg.rect(bx, y + (rowH - 28) / 2, barW, 28, {
      fill: color, rx: 6, filter: 'url(#bold-offset)',
    });

    if (item.value) {
      svg.text(bx + barW - 10, y + rowH / 2 + 5, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize + 1, 'font-weight': 800, fill: '#FFFFFF',
      });
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: horizontal rows with color accent, no shadows

function renderFlat(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const rowH = 48;
  const rowGap = 6;
  const cardW = 440;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;

    // Flat row card
    svg.rect(pad, y, cardW, rowH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, rowH - 8, { fill: color, rx: 2 });
    // Rank number
    svg.circle(pad + 28, y + rowH / 2, 14, { fill: color });
    svg.text(pad + 28, y + rowH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#FFFFFF',
    });
    // Label
    const fit = fitText(item.label, 160, 1, d.labelSize);
    svg.text(pad + 52, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    // Inline bar
    const barStart = pad + 220;
    const barMaxFlat = cardW - 230;
    const barW = barMaxFlat * barRatio;
    svg.rect(barStart, y + (rowH - 20) / 2, barW, 20, {
      fill: color, opacity: 0.2, rx: 4,
    });
    svg.rect(barStart, y + (rowH - 20) / 2, barW, 20, {
      fill: color, opacity: 0.6, rx: 4,
    });

    if (item.value) {
      svg.text(barStart + barW - 8, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: '#FFFFFF',
      });
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass rows, glow effects

function renderGlass(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const rowH = 50;
  const rowGap = 10;
  const rankW = 40;
  const labelW = 170;
  const barMaxW = 230;
  const totalW = rankW + 12 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (glass)',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Frosted glass row
    svg.rect(pad, y, pad * 2 + totalW - pad * 2, rowH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(pad + 16, y + 1, totalW - 32, 1, { fill: color, opacity: 0.3, rx: 0.5 });

    // Rank badge with glow
    svg.circle(pad + rankW / 2 + 8, y + rowH / 2, 16, { fill: color, opacity: 0.1 });
    svg.circle(pad + rankW / 2 + 8, y + rowH / 2, 12, {
      fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });
    svg.text(pad + rankW / 2 + 8, y + rowH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Label
    const lx = pad + rankW + 20;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'letter-spacing': '0.3',
    });

    // Bar with glow
    const bx = lx + labelW + 12;
    svg.rect(bx, y + (rowH - 22) / 2, barW, 22, {
      fill: color, opacity: 0.15, rx: 4, filter: 'url(#shadow)',
    });
    svg.rect(bx, y + (rowH - 22) / 2, barW, 22, {
      fill: `url(#rk${i})`, opacity: 0.6, rx: 4,
    });

    if (item.value) {
      svg.text(bx + barW - 8, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: '#FFFFFF',
      });
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon bar outlines, glow rank numbers

function renderNeon(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const rowH = 44;
  const rowGap = 10;
  const rankW = 36;
  const labelW = 160;
  const barMaxW = 220;
  const totalW = rankW + 12 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Neon rank number
    svg.text(pad + rankW / 2, y + rowH / 2 + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, fill: color,
      filter: 'url(#neon-glow)',
    });

    // Label
    const lx = pad + rankW + 12;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Neon bar outline
    const bx = lx + labelW + 12;
    svg.rect(bx, y + (rowH - 22) / 2, barW, 22, {
      fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: 2,
    });
    svg.rect(bx, y + (rowH - 22) / 2, barW, 22, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 2,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });

    if (item.value) {
      svg.text(bx + barW - 8, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: color,
      });
    }
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, watercolor bars, muted palette

function renderWatercolor(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 52 : 0;
  const count = data.items.length;
  const rowH = 48;
  const rowGap = 12;
  const rankW = 40;
  const labelW = 160;
  const barMaxW = 220;
  const totalW = rankW + 12 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (watercolor)',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Watercolor rank circle
    svg.circle(pad + rankW / 2, y + rowH / 2, 18, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(pad + rankW / 2, y + rowH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 600, fill: d.text,
    });

    // Label
    const lx = pad + rankW + 12;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Watercolor bar
    const bx = lx + labelW + 12;
    svg.ellipse(bx + barW / 2, y + rowH / 2, barW / 2 + 6, 14, {
      fill: color, opacity: 0.1, filter: 'url(#watercolor)',
    });
    svg.rect(bx, y + (rowH - 24) / 2, barW, 24, {
      fill: color, opacity: 0.5, rx: 12, filter: 'url(#watercolor)',
    });

    if (item.value) {
      svg.text(bx + barW - 10, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const rowH = 40;
  const rowGap = 8;
  const rankW = 30;
  const labelW = 150;
  const barMaxW = 200;
  const totalW = rankW + 12 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = barMaxW * barRatio;

    // Rank number
    svg.text(pad + rankW / 2, y + rowH / 2 + 5, `${i + 1}.`, {
      'text-anchor': 'middle', 'font-size': 14, fill: d.text,
    });

    // Label
    const lx = pad + rankW + 12;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, fill: d.text,
    });

    // Bar outline
    const bx = lx + labelW + 12;
    svg.path(jitterRect(bx, y + (rowH - 20) / 2, barW, 20, i * 23), {
      fill: 'none', stroke: d.border, 'stroke-width': 1.5,
    });
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.items.length;
  const rowH = 32;
  const rowGap = 4;
  const rankW = 28;
  const labelW = 130;
  const barMaxW = 180;
  const px = 3;
  const totalW = rankW + 10 + labelW + 10 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.6;
    const barW = Math.round(barMaxW * barRatio);

    // Rank box
    svg.rect(pad, y, rankW, rowH, {
      fill: color, opacity: 0.8, 'shape-rendering': 'crispEdges',
    });
    svg.text(pad + rankW / 2, y + rowH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: d.bg,
    });

    // Label
    const lx = pad + rankW + 10;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });

    // Bar
    const bx = lx + labelW + 10;
    svg.rect(bx, y + 4, barW, rowH - 8, {
      fill: color, opacity: 0.7, 'shape-rendering': 'crispEdges',
    });

    if (item.value) {
      svg.text(bx + barW - 6, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 700, fill: d.bg,
      });
    }
  }

  return svg.build();
}

// ========== VERTICAL PODIUM ==========
// Podium-style: vertical bars, tallest first (rank 1), height proportional to rank

function renderVerticalPodium(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const barW = 72;
  const barGap = 12;
  const maxBarH = 220;
  const labelH = 36;
  const width = pad * 2 + count * (barW + barGap) - barGap;
  const height = pad * 2 + titleH + maxBarH + labelH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking podium',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const baseY = pad + titleH + maxBarH;

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.7;
    const barH = maxBarH * barRatio;
    const x = pad + i * (barW + barGap);
    const y = baseY - barH;

    if (d.id === 'neon') {
      svg.rect(x, y, barW, barH, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1.5,
        rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      });
      svg.rect(x, y, barW, barH, {
        fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3,
        rx: d.borderRadius > 8 ? 6 : d.borderRadius, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(x, y, barW, barH, {
        fill: `url(#rk${i})`, rx: d.borderRadius > 8 ? 6 : d.borderRadius, ...d.cardAttrs(),
      });
    }

    svg.text(x + barW / 2, y + 20, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 18, 'font-weight': 800, fill: d.id === 'neon' ? color : 'white',
    });

    if (item.value) {
      svg.text(x + barW / 2, y + 40, item.value, {
        'text-anchor': 'middle', 'font-size': d.captionSize, 'font-weight': 600, fill: d.id === 'neon' ? color : 'white', opacity: 0.9,
      });
    }

    const fit = fitText(item.label, barW - 4, 2, d.captionSize);
    let ly = baseY + 14;
    for (const line of fit.lines) {
      svg.text(x + barW / 2, ly, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      ly += Math.round(fit.fontSize * 1.3);
    }
  }

  return svg.build();
}

// ========== HORIZONTAL BARS ==========
// Compact horizontal bar chart: rank number + label on left, colored bar on right

function renderHorizontalBars(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.items.length;
  const rowH = 36;
  const rowGap = 6;
  const rankW = 28;
  const labelW = 140;
  const barMaxW = 260;
  const totalW = rankW + 8 + labelW + 12 + barMaxW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (horizontal bars)',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = 1 - (i / Math.max(count, 1)) * 0.65;
    const barW = barMaxW * barRatio;

    // Rank number
    svg.text(pad + rankW / 2, y + rowH / 2 + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 800, fill: color,
    });

    // Label
    const lx = pad + rankW + 8;
    const fit = fitText(item.label, labelW, 1, d.labelSize);
    svg.text(lx, y + rowH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Bar
    const bx = lx + labelW + 12;
    const barH = rowH - 10;
    const barY = y + (rowH - barH) / 2;
    if (d.id === 'neon') {
      svg.rect(bx, barY, barW, barH, {
        fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1,
        rx: d.borderRadius > 8 ? 4 : d.borderRadius,
      });
      svg.rect(bx, barY, barW, barH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3,
        rx: d.borderRadius > 8 ? 4 : d.borderRadius, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(bx, barY, barW, barH, {
        fill: `url(#rk${i})`, rx: d.borderRadius > 8 ? 4 : d.borderRadius,
        ...d.cardAttrs(),
      });
    }

    // Value at end of bar
    if (item.value) {
      svg.text(bx + barW - 6, y + rowH / 2 + 4, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize, 'font-weight': 600, fill: d.id === 'neon' ? color : 'white',
      });
    }
  }

  return svg.build();
}

// ========== ROI BAR ==========
// Horizontal bar with value + description text beside it, emphasizing ROI/impact

function renderRoiBar(data: RankingData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.items.length;
  const rowH = 64;
  const rowGap = 12;
  const barMaxW = 200;
  const labelW = 160;
  const descW = 200;
  const totalW = labelW + 16 + barMaxW + 16 + descW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + count * (rowH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Ranking (ROI bar)',
    buildColorGradients(d, count, 'rk'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  // Parse values to determine max for proportional bars
  const numericValues = data.items.map(it => {
    const v = String(it.value ?? '').replace(/[^0-9.\-]/g, '');
    return parseFloat(v) || 0;
  });
  const maxVal = Math.max(...numericValues, 1);

  for (let i = 0; i < count; i++) {
    const item = data.items[i]!;
    const color = rankColor(d, i);
    const y = pad + titleH + i * (rowH + rowGap);
    const barRatio = numericValues[i]! / maxVal;
    const barW = Math.max(barMaxW * barRatio, 20);

    // Row background
    if (d.id !== 'sketch' && d.id !== 'pixel') {
      svg.rect(pad, y, totalW, rowH, {
        fill: d.surface, rx: d.borderRadius, opacity: 0.5, ...d.cardAttrs(),
      });
    }

    // Left color accent
    if (d.id === 'neon') {
      svg.rect(pad, y, 3, rowH, { fill: color, filter: 'url(#neon-glow)' });
    } else {
      svg.rect(pad, y + 8, 4, rowH - 16, { fill: color, rx: 2 });
    }

    // Rank + Label
    const lx = pad + 16;
    svg.text(lx, y + 18, `#${i + 1}`, {
      'text-anchor': 'start', 'font-size': d.captionSize - 1, 'font-weight': 700, fill: color,
    });
    const fit = fitText(item.label, labelW - 20, 1, d.labelSize);
    svg.text(lx, y + 38, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Bar
    const bx = pad + labelW + 16;
    const barY = y + (rowH - 28) / 2;
    if (d.id === 'neon') {
      svg.rect(bx, barY, barW, 28, {
        fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: 4,
      });
      svg.rect(bx, barY, barW, 28, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 4,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      svg.rect(bx, barY, barW, 28, {
        fill: `url(#rk${i})`, rx: 6, ...d.cardAttrs(),
      });
    }

    // Value inside bar
    if (item.value) {
      svg.text(bx + barW - 8, y + rowH / 2 + 5, item.value, {
        'text-anchor': 'end', 'font-size': d.captionSize + 1, 'font-weight': 700,
        fill: d.id === 'neon' ? color : 'white',
      });
    }

    // Description to the right of bar
    if (item.description) {
      const dx = bx + barMaxW + 16;
      const dfit = fitText(item.description, descW, 2, d.captionSize);
      let dy = y + rowH / 2 - (dfit.lines.length > 1 ? 4 : 0);
      for (const line of dfit.lines) {
        svg.text(dx, dy, line, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
        dy += Math.round(dfit.fontSize * 1.4);
      }
    }
  }

  return svg.build();
}
