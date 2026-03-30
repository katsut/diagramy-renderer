// KPI card renderer — dashboard-style metric cards

import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawPresetCard,
  drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  trend?: string;
  description?: string;
}

interface KpiCardData {
  cards: KpiItem[];
}

function itemColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function trendColor(trend: string | undefined, d: DesignPreset): string {
  if (!trend) return d.textSecondary;
  if (trend.startsWith('+') || trend.startsWith('↑')) return '#10B981';
  if (trend.startsWith('-') || trend.startsWith('↓')) return '#EF4444';
  return d.textSecondary;
}

function trendArrow(trend: string | undefined): string {
  if (!trend) return '';
  if (trend.startsWith('+') || trend.startsWith('↑')) return '▲ ';
  if (trend.startsWith('-') || trend.startsWith('↓')) return '▼ ';
  return '';
}

export function renderKpiCard(data: KpiCardData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'grid': return renderGrid(data, title, d);
    case 'dashboard': return renderDashboard(data, title, d);
    default: return renderHorizontal(data, title, d);
  }
}

// ========== HORIZONTAL (default) ==========

function renderHorizontal(data: KpiCardData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.cards.length;
  const cardW = 200;
  const cardH = 150;
  const gap = 20;
  const totalW = count * cardW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'KPI card dashboard');
  svg.defs(defs);

  const contentTop = pad + titleH;

  switch (d.id) {
    case 'sketch': {
      drawSketchBackground(svg, width, height, d.bg);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.path(jitterRect(x, contentTop, cardW, cardH, i * 17), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
        });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'pixel': {
      const px = 3;
      drawPixelBackground(svg, width, height, d.bg);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.raw(pixelBorder(x, contentTop, cardW, cardH, color, px));
        svg.rect(x + px, contentTop + px, cardW - px * 2, cardH - px * 2, {
          fill: d.surface, 'shape-rendering': 'crispEdges',
        });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'bold': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, contentTop, cardW, cardH, {
          fill: d.surface, stroke: d.border, 'stroke-width': 3,
          rx: d.borderRadius, filter: 'url(#bold-offset)',
        });
        svg.rect(x + 1, contentTop + 1, cardW - 2, 5, { fill: color, rx: 2 });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'neon': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, contentTop, cardW, cardH, {
          fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
        });
        svg.rect(x, contentTop, cardW, cardH, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
          opacity: 0.4, filter: 'url(#neon-glow)',
        });
        svg.rect(x + 1, contentTop + 1, cardW - 2, cardH - 2, {
          fill: color, opacity: 0.05, rx: d.borderRadius,
        });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'glass': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, contentTop, cardW, cardH, {
          fill: d.surface, stroke: d.border, 'stroke-width': 1,
          rx: d.borderRadius, ...d.cardAttrs(),
        });
        svg.rect(x + 8, contentTop + 1, cardW - 16, 1, { fill: color, opacity: 0.3, rx: 0.5 });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'watercolor': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.ellipse(x + cardW / 2, contentTop + cardH / 2, cardW / 2 + 6, cardH / 2 + 4, {
          fill: color, opacity: 0.08, filter: 'url(#watercolor)',
        });
        svg.rect(x, contentTop, cardW, cardH, {
          fill: d.surface, opacity: 0.7, rx: d.borderRadius, filter: 'url(#watercolor)',
        });
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    default: {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const x = pad + i * (cardW + gap);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        drawPresetCard(svg, d, x, contentTop, cardW, cardH, color);
        drawKpiContent(svg, d, card, cx, contentTop, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
  }

  return svg.build();
}

// ========== GRID (2-column) ==========

function renderGrid(data: KpiCardData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.cards.length;
  const cols = 2;
  const rows = Math.ceil(count / cols);
  const cardW = 220;
  const cardH = 150;
  const gapX = 20;
  const gapY = 20;
  const totalW = cols * cardW + (cols - 1) * gapX;
  const totalH = rows * cardH + (rows - 1) * gapY;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'KPI card dashboard (grid)');
  svg.defs(defs);

  const contentTop = pad + titleH;

  switch (d.id) {
    case 'sketch': {
      drawSketchBackground(svg, width, height, d.bg);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.path(jitterRect(x, y, cardW, cardH, i * 17), {
          fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
        });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'pixel': {
      const px = 3;
      drawPixelBackground(svg, width, height, d.bg);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.raw(pixelBorder(x, y, cardW, cardH, color, px));
        svg.rect(x + px, y + px, cardW - px * 2, cardH - px * 2, {
          fill: d.surface, 'shape-rendering': 'crispEdges',
        });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'bold': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, y, cardW, cardH, {
          fill: d.surface, stroke: d.border, 'stroke-width': 3,
          rx: d.borderRadius, filter: 'url(#bold-offset)',
        });
        svg.rect(x + 1, y + 1, cardW - 2, 5, { fill: color, rx: 2 });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'neon': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, y, cardW, cardH, {
          fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
        });
        svg.rect(x, y, cardW, cardH, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
          opacity: 0.4, filter: 'url(#neon-glow)',
        });
        svg.rect(x + 1, y + 1, cardW - 2, cardH - 2, {
          fill: color, opacity: 0.05, rx: d.borderRadius,
        });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'glass': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.rect(x, y, cardW, cardH, {
          fill: d.surface, stroke: d.border, 'stroke-width': 1,
          rx: d.borderRadius, ...d.cardAttrs(),
        });
        svg.rect(x + 8, y + 1, cardW - 16, 1, { fill: color, opacity: 0.3, rx: 0.5 });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    case 'watercolor': {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        svg.ellipse(x + cardW / 2, y + cardH / 2, cardW / 2 + 6, cardH / 2 + 4, {
          fill: color, opacity: 0.08, filter: 'url(#watercolor)',
        });
        svg.rect(x, y, cardW, cardH, {
          fill: d.surface, opacity: 0.7, rx: d.borderRadius, filter: 'url(#watercolor)',
        });
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
    default: {
      drawBackground(svg, d, width, height);
      if (title) drawTitle(svg, d, title, width, pad);
      for (let i = 0; i < count; i++) {
        const card = data.cards[i]!;
        const color = itemColor(d, i);
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = pad + col * (cardW + gapX);
        const y = contentTop + row * (cardH + gapY);
        const cx = x + cardW / 2;
        svg.beginItem(`cards[${i}]`);
        drawPresetCard(svg, d, x, y, cardW, cardH, color);
        drawKpiContent(svg, d, card, cx, y, cardW, color, `cards[${i}]`);
        svg.endItem();
      }
      break;
    }
  }

  return svg.build();
}

// ========== Shared card content ==========

// ========== DASHBOARD ==========
// Compact multi-KPI view: hero card for first item, smaller cards for rest

function renderDashboard(data: KpiCardData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.cards.length;

  // Hero card (first item) + smaller cards for rest
  const heroW = 280;
  const heroH = 160;
  const smallCardW = 180;
  const smallCardH = 110;
  const gap = 16;
  const smallCols = 2;
  const smallRows = Math.ceil(Math.max(count - 1, 0) / smallCols);
  const smallGridW = smallCols * smallCardW + (smallCols - 1) * gap;
  const smallGridH = smallRows * smallCardH + (smallRows - 1) * gap;

  const rightH = Math.max(heroH, smallGridH);
  const width = pad * 2 + heroW + gap + smallGridW;
  const height = pad * 2 + titleH + rightH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'KPI dashboard');
  svg.defs(defs);

  if (d.id === 'sketch') {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.id === 'pixel') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  // Hero card (first KPI)
  if (count > 0) {
    const card = data.cards[0]!;
    const color = itemColor(d, 0);
    const hx = pad;
    const hy = contentTop;

    if (d.id === 'neon') {
      svg.rect(hx, hy, heroW, heroH, {
        fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 2, rx: d.borderRadius,
      });
      svg.rect(hx, hy, heroW, heroH, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else if (d.id === 'bold') {
      svg.rect(hx, hy, heroW, heroH, {
        fill: d.surface, stroke: d.border, 'stroke-width': 3,
        rx: d.borderRadius, filter: 'url(#bold-offset)',
      });
      svg.rect(hx + 1, hy + 1, heroW - 2, 6, { fill: color, rx: 3 });
    } else if (d.id === 'sketch') {
      svg.path(jitterRect(hx, hy, heroW, heroH, 42), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else {
      drawPresetCard(svg, d, hx, hy, heroW, heroH, color);
    }

    // Hero content — larger
    svg.beginItem('cards[0]');
    const hcx = hx + heroW / 2;
    const labelFit = fitText(card.label, heroW - 32, 1, d.captionSize + 1);
    svg.text(hcx, hy + 32, labelFit.lines[0] ?? card.label, {
      'text-anchor': 'middle', 'font-size': d.captionSize + 1, fill: d.textSecondary,
      'data-field': 'cards[0].label',
    });

    const valueText = card.unit ? `${card.value}${card.unit}` : card.value;
    let valueFontSize = d.titleSize + 16;
    while (estimateWidth(valueText, valueFontSize) > heroW - 32 && valueFontSize > 14) {
      valueFontSize--;
    }
    svg.text(hcx, hy + 82, valueText, {
      'text-anchor': 'middle', 'font-size': valueFontSize, 'font-weight': 800, fill: d.text,
      'data-field': 'cards[0].value',
    });

    if (card.trend) {
      const tc = trendColor(card.trend, d);
      const arrow = trendArrow(card.trend);
      svg.text(hcx, hy + 115, `${arrow}${card.trend}`, {
        'text-anchor': 'middle', 'font-size': d.labelSize + 2, 'font-weight': 600, fill: tc,
        'data-field': 'cards[0].trend',
      });
    }

    if (card.description) {
      const descFit = fitText(card.description, heroW - 32, 1, d.captionSize);
      svg.text(hcx, hy + 142, descFit.lines[0] ?? card.description, {
        'text-anchor': 'middle', 'font-size': descFit.fontSize, fill: d.textSecondary,
        'data-field': 'cards[0].description',
      });
    }
    svg.endItem();
  }

  // Smaller cards for remaining KPIs
  const smallStartX = pad + heroW + gap;
  for (let i = 1; i < count; i++) {
    const card = data.cards[i]!;
    const color = itemColor(d, i);
    const col = (i - 1) % smallCols;
    const row = Math.floor((i - 1) / smallCols);
    const sx = smallStartX + col * (smallCardW + gap);
    const sy = contentTop + row * (smallCardH + gap);

    svg.beginItem(`cards[${i}]`);
    if (d.id === 'neon') {
      svg.rect(sx, sy, smallCardW, smallCardH, {
        fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      });
      svg.rect(sx, sy, smallCardW, smallCardH, {
        fill: 'none', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else if (d.id === 'bold') {
      svg.rect(sx, sy, smallCardW, smallCardH, {
        fill: d.surface, stroke: d.border, 'stroke-width': 3,
        rx: d.borderRadius, filter: 'url(#bold-offset)',
      });
      svg.rect(sx + 1, sy + 1, smallCardW - 2, 4, { fill: color, rx: 2 });
    } else if (d.id === 'sketch') {
      svg.path(jitterRect(sx, sy, smallCardW, smallCardH, i * 23), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else {
      drawPresetCard(svg, d, sx, sy, smallCardW, smallCardH, color);
    }

    drawKpiContent(svg, d, card, sx + smallCardW / 2, sy, smallCardW, color, `cards[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

function drawKpiContent(
  svg: ReturnType<typeof createDiagramSvg>['svg'],
  d: DesignPreset,
  card: KpiItem,
  cx: number,
  top: number,
  cardW: number,
  color: string,
  dataPath?: string,
): void {
  // Label (top)
  const labelFit = fitText(card.label, cardW - 24, 1, d.captionSize);
  svg.text(cx, top + 28, labelFit.lines[0] ?? card.label, {
    'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
    ...(dataPath ? { 'data-field': `${dataPath}.label` } : {}),
  });

  // Large value — shrink font until it fits within card width
  const valueText = card.unit ? `${card.value}${card.unit}` : card.value;
  const maxValueW = cardW - 20;
  let valueFontSize = d.titleSize + 8;
  while (estimateWidth(valueText, valueFontSize) > maxValueW && valueFontSize > 12) {
    valueFontSize--;
  }
  svg.text(cx, top + 70, valueText, {
    'text-anchor': 'middle', 'font-size': valueFontSize, 'font-weight': 800, fill: d.text,
    ...(dataPath ? { 'data-field': `${dataPath}.value` } : {}),
  });

  // Trend
  if (card.trend) {
    const tc = trendColor(card.trend, d);
    const arrow = trendArrow(card.trend);
    svg.text(cx, top + 100, `${arrow}${card.trend}`, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': 600, fill: tc,
      ...(dataPath ? { 'data-field': `${dataPath}.trend` } : {}),
    });
  }

  // Description
  if (card.description) {
    const descFit = fitText(card.description, cardW - 24, 1, d.captionSize - 1);
    svg.text(cx, top + 125, descFit.lines[0] ?? card.description, {
      'text-anchor': 'middle', 'font-size': descFit.fontSize, fill: d.textSecondary,
      ...(dataPath ? { 'data-field': `${dataPath}.description` } : {}),
    });
  }
}
