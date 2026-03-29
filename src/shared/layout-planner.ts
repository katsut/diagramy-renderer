// Layout planner — data-aware adaptive sizing utilities
// Analyzes data characteristics (item count, text lengths, value ranges)
// and returns layout parameters that prevent overflow and overlap.

import { estimateWidth } from './text.js';

export interface DataProfile {
  count: number;
  maxLabelWidth: number;
  maxDescWidth: number;
  maxValueWidth: number;
  hasDescriptions: boolean;
}

export function profileItems(
  items: { label?: string; description?: string; value?: string | number }[],
  labelFontSize: number,
  descFontSize: number,
): DataProfile {
  let maxLabelWidth = 0;
  let maxDescWidth = 0;
  let maxValueWidth = 0;
  let hasDescriptions = false;

  for (const item of items) {
    if (item.label) {
      maxLabelWidth = Math.max(maxLabelWidth, estimateWidth(item.label, labelFontSize));
    }
    if (item.description) {
      hasDescriptions = true;
      maxDescWidth = Math.max(maxDescWidth, estimateWidth(item.description, descFontSize));
    }
    if (item.value != null) {
      const vStr = typeof item.value === 'number' ? `${item.value}` : item.value;
      maxValueWidth = Math.max(maxValueWidth, estimateWidth(vStr, descFontSize));
    }
  }

  return { count: items.length, maxLabelWidth, maxDescWidth, maxValueWidth, hasDescriptions };
}

// Compute an adaptive label column width that fits actual content
// without wasting space or truncating excessively
export function adaptiveLabelWidth(maxLabelWidth: number, minW: number, maxW: number, padding = 16): number {
  return Math.min(maxW, Math.max(minW, maxLabelWidth + padding));
}

// Compute adaptive chart/bar area width that balances with label width
export function adaptiveChartWidth(labelW: number, minChartW: number, maxTotalW: number, pad: number): number {
  const available = maxTotalW - pad * 2 - labelW - 52;
  return Math.max(minChartW, available);
}

// For horizontal layouts (process, block_list, timeline):
// determine grid dimensions when items exceed a max width threshold
export interface GridLayout {
  cols: number;
  rows: number;
  totalWidth: number;
  totalHeight: number;
}

export function computeGridLayout(
  count: number,
  cellW: number,
  cellH: number,
  gap: number,
  pad: number,
  titleH: number,
  maxWidth: number,
): GridLayout {
  // How many columns fit within maxWidth?
  const maxCols = Math.max(1, Math.floor((maxWidth - pad * 2 + gap) / (cellW + gap)));
  let cols = Math.min(count, maxCols);

  // Avoid orphan row (1 item alone in last row) — reduce cols to balance
  if (cols > 1 && count > cols && count % cols === 1) {
    cols = cols - 1;
  }

  const rows = Math.ceil(count / cols);
  const totalWidth = pad * 2 + cols * cellW + (cols - 1) * gap;
  const totalHeight = pad * 2 + titleH + rows * cellH + (rows - 1) * gap;
  return { cols, rows, totalWidth, totalHeight };
}

// For radial layouts (mind_map): compute radius that prevents overlap
export function adaptiveRadialRadius(branchCount: number, childCount: number): { branchR: number; childR: number } {
  // Minimum arc distance between branches — wider for more children
  const minArcDist = childCount >= 3 ? 140 : childCount >= 2 ? 120 : 90;
  const circumference = branchCount * minArcDist;
  const branchR = Math.max(160, Math.round(circumference / (2 * Math.PI)));

  // Child radius scales with branch count to avoid inter-branch overlap
  const childR = branchCount <= 3 ? 80 : branchCount <= 5 ? 70 : 55;

  return { branchR, childR };
}

// Determine label placement direction: outward from center
// Returns a y-offset multiplier and text anchor hint
export function radialLabelPlacement(
  angle: number,
  nodeR: number,
): { yOffset: number; anchor: 'middle' | 'start' | 'end' } {
  // angle is in radians, -PI/2 is top, PI/2 is bottom
  const sin = Math.sin(angle);
  // If node is above center, place label above; if below, place below
  const yOffset = sin < -0.3 ? -(nodeR + 8) : (nodeR + 16);
  // Left/right anchor for better readability
  const cos = Math.cos(angle);
  const anchor = cos > 0.4 ? 'start' : cos < -0.4 ? 'end' : 'middle';
  return { yOffset, anchor };
}

// For pie chart: compute label positions with better overlap avoidance
export interface PieLabelPos {
  x: number;
  y: number;
  anchor: 'start' | 'end' | 'middle';
  text: string;
}

export function computePieLabels(
  segments: { label: string; value: number }[],
  cx: number,
  cy: number,
  r: number,
  labelFontSize: number,
): PieLabelPos[] {
  const total = segments.reduce((s, seg) => s + seg.value, 0) || 1;
  const labels: PieLabelPos[] = [];
  let angle = 0;

  for (const seg of segments) {
    const sweep = (seg.value / total) * 360;
    if (sweep > 10) {
      const midAngle = angle + sweep / 2;
      const rad = (midAngle - 90) * Math.PI / 180;
      const labelR = r + 24;
      const x = cx + labelR * Math.cos(rad);
      const y = cy + labelR * Math.sin(rad) + 4;
      const pct = Math.round(seg.value / total * 100);
      const anchor = x > cx + 5 ? 'start' : x < cx - 5 ? 'end' : 'middle';
      labels.push({ x, y, anchor, text: `${seg.label} ${pct}%` });
    }
    angle += sweep;
  }

  // Push apart overlapping labels
  labels.sort((a, b) => a.y - b.y);
  const minGap = labelFontSize * 1.5;
  for (let pass = 0; pass < 3; pass++) {
    for (let i = 1; i < labels.length; i++) {
      const gap = labels[i]!.y - labels[i - 1]!.y;
      if (gap < minGap) {
        const shift = (minGap - gap) / 2;
        labels[i - 1]!.y -= shift;
        labels[i]!.y += shift;
      }
    }
  }

  return labels;
}
