// KPI card renderer — dashboard-style metric cards

import { getDesign, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawPresetCard,
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
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const card = data.cards[i]!;
    const color = itemColor(d, i);
    const x = pad + i * (cardW + gap);
    const cx = x + cardW / 2;

    drawPresetCard(svg, d, x, contentTop, cardW, cardH, color);
    drawKpiContent(svg, d, card, cx, contentTop, cardW, color);
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
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const card = data.cards[i]!;
    const color = itemColor(d, i);
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = pad + col * (cardW + gapX);
    const y = contentTop + row * (cardH + gapY);
    const cx = x + cardW / 2;

    drawPresetCard(svg, d, x, y, cardW, cardH, color);
    drawKpiContent(svg, d, card, cx, y, cardW, color);
  }

  return svg.build();
}

// ========== Shared card content ==========

function drawKpiContent(
  svg: ReturnType<typeof createDiagramSvg>['svg'],
  d: DesignPreset,
  card: KpiItem,
  cx: number,
  top: number,
  cardW: number,
  color: string,
): void {
  // Label (top)
  const labelFit = fitText(card.label, cardW - 24, 1, d.captionSize);
  svg.text(cx, top + 28, labelFit.lines[0] ?? card.label, {
    'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.textSecondary,
  });

  // Large value
  const valueText = card.unit ? `${card.value}${card.unit}` : card.value;
  const valueFit = fitText(valueText, cardW - 20, 1, d.titleSize + 8);
  svg.text(cx, top + 70, valueFit.lines[0] ?? valueText, {
    'text-anchor': 'middle', 'font-size': valueFit.fontSize, 'font-weight': 800, fill: d.text,
  });

  // Trend
  if (card.trend) {
    const tc = trendColor(card.trend, d);
    const arrow = trendArrow(card.trend);
    svg.text(cx, top + 100, `${arrow}${card.trend}`, {
      'text-anchor': 'middle', 'font-size': d.labelSize, 'font-weight': 600, fill: tc,
    });
  }

  // Description
  if (card.description) {
    const descFit = fitText(card.description, cardW - 24, 1, d.captionSize - 1);
    svg.text(cx, top + 125, descFit.lines[0] ?? card.description, {
      'text-anchor': 'middle', 'font-size': descFit.fontSize, fill: d.textSecondary,
    });
  }
}
