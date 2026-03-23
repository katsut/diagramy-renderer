import { SvgBuilder, escapeXml, FILTER_SHADOW, FILTER_CARD_SHADOW, linearGradient } from '../shared/svg.js';
import { getDesign as getTheme, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import { createDiagramSvg, drawBackground, drawTitle } from '../shared/render-utils.js';

function tableCardAttrs(t: DesignPreset): Record<string, string | number> {
  if (t.id === 'watercolor') return { filter: 'url(#wc-light)', opacity: 0.9 };
  return t.cardAttrs();
}

interface ComparisonRow {
  label: string;
  values: string[];
}

interface ComparisonTableData {
  headers: string[];
  rows: ComparisonRow[];
}

export function renderComparisonTable(data: ComparisonTableData, title?: string, design?: DesignPreset, style?: string): string {
  const resolvedStyle = style || (data as any).style || 'graphic';
  switch (resolvedStyle) {
    case 'cards': return renderCards(data, title, design);
    case 'minimal': return renderMinimal(data, title, design);
    case 'before-after': return renderBeforeAfter(data, title, design);
    case 'highlight': return renderHighlight(data, title, design);
    case 'checklist': return renderChecklist(data, title, design);
    case 'spec_card': return renderSpecCard(data, title, design);
    default: return renderGraphic(data, title, design);
  }
}

// --- Layout computation ---

interface ColLayout {
  colWidths: number[];
  rowHeights: number[];
  colCount: number;
}

function computeLayout(data: ComparisonTableData): ColLayout {
  const maxValues = Math.max(...data.rows.map(r => r.values.length), 0);
  const colCount = Math.max(data.headers.length, maxValues + 1);
  const minW = 80;
  const maxW = 220;

  const colWidths: number[] = new Array(colCount).fill(minW);

  // Size from headers
  for (let c = 0; c < data.headers.length; c++) {
    colWidths[c] = Math.max(colWidths[c]!, estimateWidth(data.headers[c]!, 13) + 24);
  }

  // Size from data
  for (const row of data.rows) {
    colWidths[0] = Math.max(colWidths[0]!, estimateWidth(row.label, 13) + 24);
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < colCount) {
        colWidths[v + 1] = Math.max(colWidths[v + 1]!, estimateWidth(row.values[v]!, 13) + 24);
      }
    }
  }

  // Clamp
  for (let i = 0; i < colWidths.length; i++) {
    colWidths[i] = Math.min(colWidths[i]!, maxW);
  }

  // Row heights (base 48, expand for wrapping)
  const rowHeights = data.rows.map(row => {
    let maxLines = 1;
    const labelFit = fitText(row.label, colWidths[0]! - 16, 3, 13);
    maxLines = Math.max(maxLines, labelFit.lines.length);
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < colCount) {
        const vFit = fitText(row.values[v]!, colWidths[v + 1]! - 16, 3, 13);
        maxLines = Math.max(maxLines, vFit.lines.length);
      }
    }
    return maxLines > 1 ? 20 + maxLines * 18 : 48;
  });

  return { colWidths, rowHeights, colCount };
}

function renderCellText(
  svg: SvgBuilder, text: string, x: number, yCentre: number, maxW: number,
  anchor: string, fontSize: number, fontWeight: number, fill: string,
): void {
  const fit = fitText(text, maxW - 12, 3, fontSize);
  const lh = Math.round(fit.fontSize * 1.5);
  const totalH = fit.lines.length * lh;
  let y = yCentre - totalH / 2 + lh - 3;
  for (const line of fit.lines) {
    svg.text(x, y, line, {
      'text-anchor': anchor, 'font-size': fit.fontSize, 'font-weight': fontWeight, fill,
    });
    y += lh;
  }
}

// === Graphic: polished table with subtle header accent ===

function renderGraphic(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 48;
  const titleH = title ? 52 : 0;
  const headerH = 48;
  const layout = computeLayout(data);

  // Add extra padding to columns
  const colPad = 16;
  const paddedWidths = layout.colWidths.map(w => w + colPad);
  const totalW = paddedWidths.reduce((a, b) => a + b, 0);
  const totalRowH = layout.rowHeights.reduce((a, b) => a + b, 0);
  const tableInset = 20; // inner margin for the table area
  const width = pad * 2 + totalW + tableInset * 2;
  const height = pad * 2 + titleH + headerH + totalRowH + tableInset * 2 + 4;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset;

  // --- Inner table card (subtle inset) ---
  const tableH = headerH + totalRowH + 4;
  svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
    fill: t.surface, rx: t.borderRadius, stroke: t.borderWidth > 0 ? t.border : 'none',
    'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
    ...tableCardAttrs(t),
  });

  // --- Header row ---
  // Subtle background, not heavy colors
  svg.rect(tableLeft, tableTop, totalW, headerH, {
    fill: t.bg, rx: 0,
  });
  // Bottom accent line under header (using primary color)
  svg.line(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, {
    stroke: t.primary, 'stroke-width': 2, opacity: 0.25,
  });

  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const color = t.colors[c % t.colors.length]!;

    // Header text — bold, colored subtly
    const fit = fitText(headerText, w - 20, 1, 12);
    const textColor = c === 0 ? t.text : color;
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700,
      fill: textColor, opacity: c === 0 ? 1 : 0.85, 'letter-spacing': 0.2,
    });
    // Color-independent differentiator: underline for non-first columns
    if (c > 0) {
      const underY = tableTop + headerH / 2 + 8;
      const uw = Math.min(estimateWidth(fit.lines[0]!, fit.fontSize), w - 24);
      svg.line(hx + w / 2 - uw / 2, underY, hx + w / 2 + uw / 2, underY, {
        stroke: textColor, 'stroke-width': 2, opacity: 0.5,
      });
    }

    hx += w;
  }

  // --- Data rows ---
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const rh = layout.rowHeights[r]!;
    const isOdd = r % 2 === 1;

    // Subtle alternating row bg
    if (isOdd) {
      svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
    }

    // Row separator
    if (r > 0) {
      svg.line(tableLeft + 12, ry, tableLeft + totalW - 12, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });
    }

    // Label cell (first column)
    let cx = tableLeft;
    const labelColor = t.colors[r % t.colors.length]!;

    // Accent dot
    svg.circle(cx + 14, ry + rh / 2, 3.5, { fill: labelColor });

    renderCellText(svg, row.label, cx + 26, ry + rh / 2, paddedWidths[0]! - 30, 'start', 13, 600, t.text);
    cx += paddedWidths[0]!;

    // Value cells — slightly lighter
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        renderCellText(svg, row.values[v]!, cx + cw / 2, ry + rh / 2, cw - 8, 'middle', 13, 400, t.textSecondary);

        // Subtle column divider
        if (v + 2 < layout.colCount) {
          svg.line(cx + cw, ry + 8, cx + cw, ry + rh - 8, {
            stroke: t.border, 'stroke-width': 0.5, opacity: 0.15,
          });
        }
        cx += cw;
      }
    }

    ry += rh;
  }

  return svg.build();
}

// === Cards: each row as an independent card ===

function renderCards(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 40;
  const titleH = title ? 40 : 0;
  const rows = data.rows;
  const count = rows.length;
  const headers = data.headers.slice(1); // skip first (label column)

  const cardW = 340;
  const attrH = 28;
  const cardH = 48 + headers.length * attrH;
  const gap = 16;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * cardH + (count - 1) * gap;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (cards)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const row = rows[i]!;
    const color = t.colors[i % t.colors.length]!;
    const y = contentTop + i * (cardH + gap);

    // Card
    svg.rect(pad, y, cardW, cardH, {
      fill: t.surface, stroke: t.borderWidth > 0 ? t.border : 'none',
      'stroke-width': t.borderWidth, rx: t.borderRadius,
      ...tableCardAttrs(t),
    });

    // Top accent
    if (t.id !== 'watercolor') {
      svg.rect(pad + 1, y + 1, cardW - 2, 4, { fill: color, rx: 2 });
    }

    // Row label (card title)
    const fit = fitText(row.label, cardW - 32, 1, 16);
    svg.text(pad + 16, y + 32, fit.lines[0]!, {
      'font-size': fit.fontSize, 'font-weight': 700, fill: t.text,
    });

    // Attributes
    for (let h = 0; h < headers.length; h++) {
      const attrY = y + 48 + h * attrH;
      const header = headers[h]!;
      const value = row.values[h] ?? '';

      // Separator
      svg.line(pad + 16, attrY - 4, pad + cardW - 16, attrY - 4, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });

      // Header label
      const hfit = fitText(header, 120, 1, 11);
      svg.text(pad + 16, attrY + 12, hfit.lines[0]!, {
        'font-size': hfit.fontSize, 'font-weight': 500, fill: t.textSecondary,
      });

      // Value
      const vfit = fitText(value, cardW - 160, 1, 13);
      svg.text(pad + cardW - 16, attrY + 12, vfit.lines[0]!, {
        'text-anchor': 'end', 'font-size': vfit.fontSize, 'font-weight': 500, fill: t.text,
      });
    }
  }

  return svg.build();
}

// === Minimal: clean lines, no fills ===

function renderMinimal(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 40;
  const titleH = title ? 40 : 0;
  const layout = computeLayout(data);

  const totalW = layout.colWidths.reduce((a, b) => a + b, 0);
  const rowH = 44;
  const headerH = 36;
  const totalH = headerH + data.rows.length * rowH;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (minimal)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableTop = pad + titleH;
  const tableLeft = pad;

  // Header
  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = layout.colWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const fit = fitText(headerText, w - 12, 1, 12);
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 600, fill: t.textSecondary,
    });
    hx += w;
  }

  // Header underline
  svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
    stroke: t.text, 'stroke-width': 1.5, opacity: 0.2,
  });

  // Rows
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const y = tableTop + headerH + r * rowH;

    // Row underline
    svg.line(tableLeft, y + rowH, tableLeft + totalW, y + rowH, {
      stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
    });

    let cx = tableLeft;
    // Label
    renderCellText(svg, row.label, cx + layout.colWidths[0]! / 2, y + rowH / 2, layout.colWidths[0]!, 'middle', 13, 600, t.text);
    cx += layout.colWidths[0]!;

    // Values
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = layout.colWidths[v + 1]!;
        renderCellText(svg, row.values[v]!, cx + cw / 2, y + rowH / 2, cw, 'middle', 13, 400, t.textSecondary);
        cx += cw;
      }
    }
  }

  return svg.build();
}

// === Before/After: side-by-side comparison with arrow ===

function renderBeforeAfter(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 48;
  const titleH = title ? 52 : 0;
  const rows = data.rows;
  const count = rows.length;

  // Before/After uses first 2 value columns (or headers[1] and headers[2])
  const beforeLabel = data.headers[1] ?? 'Before';
  const afterLabel = data.headers[2] ?? 'After';

  const cardW = 260;
  const arrowW = 60;
  const rowH = 90;
  const gap = 16;
  const width = pad * 2 + cardW * 2 + arrowW;
  const height = pad * 2 + titleH + count * (rowH + gap) + 40;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (before-after)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;

  // Column headers
  const leftCx = pad + cardW / 2;
  const rightCx = pad + cardW + arrowW + cardW / 2;
  svg.text(leftCx, contentTop + 16, beforeLabel, {
    'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: t.textSecondary,
  });
  svg.text(rightCx, contentTop + 16, afterLabel, {
    'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: t.textSecondary,
  });

  const rowStart = contentTop + 36;

  for (let i = 0; i < count; i++) {
    const row = rows[i]!;
    const color = t.colors[i % t.colors.length]!;
    const y = rowStart + i * (rowH + gap);
    const beforeVal = row.values[0] ?? '';
    const afterVal = row.values[1] ?? '';

    // Row label above
    svg.text(pad + cardW + arrowW / 2, y + 10, row.label, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: color, 'letter-spacing': '0.5',
    });

    // Before card (muted)
    const cardTop = y + 18;
    const cardInnerH = rowH - 22;
    svg.rect(pad, cardTop, cardW, cardInnerH, {
      fill: t.surface, stroke: t.border, 'stroke-width': 1, rx: t.borderRadius,
      ...tableCardAttrs(t),
    });
    // Left accent strip
    svg.rect(pad, cardTop + 4, 4, cardInnerH - 8, { fill: t.textSecondary, rx: 2, opacity: 0.3 });
    renderCellText(svg, beforeVal, pad + 20, cardTop + cardInnerH / 2, cardW - 32, 'start', 13, 400, t.textSecondary);

    // Arrow
    const arrowCx = pad + cardW + arrowW / 2;
    const arrowCy = cardTop + cardInnerH / 2;
    svg.path(`M ${arrowCx - 16} ${arrowCy} L ${arrowCx + 10} ${arrowCy}`, {
      fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round',
    });
    svg.path(`M ${arrowCx + 4} ${arrowCy - 6} L ${arrowCx + 14} ${arrowCy} L ${arrowCx + 4} ${arrowCy + 6}`, {
      fill: 'none', stroke: color, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
    });

    // After card (highlighted)
    const afterLeft = pad + cardW + arrowW;
    svg.rect(afterLeft, cardTop, cardW, cardInnerH, {
      fill: t.surface, stroke: color, 'stroke-width': 1.5, rx: t.borderRadius,
      ...tableCardAttrs(t),
    });
    // Left accent strip (colored)
    svg.rect(afterLeft, cardTop + 4, 4, cardInnerH - 8, { fill: color, rx: 2 });
    renderCellText(svg, afterVal, afterLeft + 20, cardTop + cardInnerH / 2, cardW - 32, 'start', 13, 600, t.text);
  }

  return svg.build();
}

// === Highlight: table with recommended column emphasized ===

function renderHighlight(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 48;
  const titleH = title ? 52 : 0;
  const headerH = 56;
  const layout = computeLayout(data);

  const colPad = 16;
  const paddedWidths = layout.colWidths.map(w => w + colPad);
  const totalW = paddedWidths.reduce((a, b) => a + b, 0);
  const totalRowH = layout.rowHeights.reduce((a, b) => a + b, 0);
  const tableInset = 20;
  const badgeH = 28;
  const width = pad * 2 + totalW + tableInset * 2;
  const height = pad * 2 + titleH + badgeH + headerH + totalRowH + tableInset * 2 + 4;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (highlight)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset + badgeH;

  // Highlighted column index: last data column (or column 2 if only 2)
  const highlightCol = Math.max(1, layout.colCount - 1);
  const highlightColor = t.colors[0]!;

  // Compute highlighted column x position
  let highlightX = tableLeft;
  for (let c = 0; c < highlightCol; c++) highlightX += paddedWidths[c]!;
  const highlightW = paddedWidths[highlightCol]!;

  // Table card
  const tableH = headerH + totalRowH + 4;
  svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
    fill: t.surface, rx: t.borderRadius, stroke: t.borderWidth > 0 ? t.border : 'none',
    'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
    ...tableCardAttrs(t),
  });

  // Highlighted column background
  svg.rect(highlightX, tableTop, highlightW, tableH, {
    fill: highlightColor, opacity: 0.08, rx: 0,
  });

  // Highlighted column thick border
  svg.rect(highlightX - 1, tableTop - 1, highlightW + 2, tableH + 2, {
    fill: 'none', stroke: highlightColor, 'stroke-width': 2.5, rx: t.borderRadius,
  });

  // "Recommended" badge above highlighted column
  const badgeW = Math.min(highlightW - 8, 100);
  const badgeCx = highlightX + highlightW / 2;
  const badgeY = tableTop - badgeH + 2;
  svg.rect(badgeCx - badgeW / 2, badgeY, badgeW, 22, {
    fill: highlightColor, rx: 11,
  });
  svg.text(badgeCx, badgeY + 15, '\u2605 Recommend', {
    'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#FFFFFF',
  });

  // Header row
  svg.rect(tableLeft, tableTop, totalW, headerH, { fill: t.bg, rx: 0 });
  svg.line(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, {
    stroke: t.border, 'stroke-width': 1, opacity: 0.2,
  });

  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const isHighlight = c === highlightCol;
    const fontSize = isHighlight ? 14 : 12;
    const fit = fitText(headerText, w - 20, 1, fontSize);
    const color = isHighlight ? highlightColor : (c === 0 ? t.text : t.textSecondary);
    svg.text(hx + w / 2, tableTop + headerH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isHighlight ? 800 : 600,
      fill: color,
    });
    hx += w;
  }

  // Data rows
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const rh = layout.rowHeights[r]!;

    if (r % 2 === 1) {
      svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
    }
    if (r > 0) {
      svg.line(tableLeft + 12, ry, tableLeft + totalW - 12, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });
    }

    let cx = tableLeft;
    renderCellText(svg, row.label, cx + 16, ry + rh / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text);
    cx += paddedWidths[0]!;

    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        const isHighlight = v + 1 === highlightCol;
        const weight = isHighlight ? 700 : 400;
        const fill = isHighlight ? highlightColor : t.textSecondary;
        renderCellText(svg, row.values[v]!, cx + cw / 2, ry + rh / 2, cw - 8, 'middle', 13, weight, fill);
        cx += cw;
      }
    }
    ry += rh;
  }

  return svg.build();
}

// === Checklist: feature comparison with check/cross marks ===

function isPositive(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '\u2713' || v === '\u25CB' || v === '\u2714' || v === '\u2705';
}

function isNegative(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'no' || v === 'false' || v === '\u2717' || v === '\u00D7' || v === '\u2718' || v === '\u274C';
}

function renderChecklist(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 48;
  const titleH = title ? 52 : 0;
  const headerH = 48;
  const rowH = 44;
  const layout = computeLayout(data);

  const colPad = 16;
  const paddedWidths = layout.colWidths.map(w => w + colPad);
  const totalW = paddedWidths.reduce((a, b) => a + b, 0);
  const totalRowH = data.rows.length * rowH;
  const tableInset = 20;
  const width = pad * 2 + totalW + tableInset * 2;
  const height = pad * 2 + titleH + headerH + totalRowH + tableInset * 2 + 4;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (checklist)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset;

  // Table card
  const tableH = headerH + totalRowH + 4;
  svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
    fill: t.surface, rx: t.borderRadius, stroke: t.borderWidth > 0 ? t.border : 'none',
    'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
    ...tableCardAttrs(t),
  });

  // Header row
  svg.rect(tableLeft, tableTop, totalW, headerH, { fill: t.bg, rx: 0 });
  svg.line(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, {
    stroke: t.primary, 'stroke-width': 2, opacity: 0.25,
  });

  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const color = t.colors[c % t.colors.length]!;
    const fit = fitText(headerText, w - 20, 1, 12);
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700,
      fill: c === 0 ? t.text : color,
    });
    hx += w;
  }

  // Data rows
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;

    if (r % 2 === 1) {
      svg.rect(tableLeft, ry, totalW, rowH, { fill: t.surface, opacity: 0.5 });
    }
    if (r > 0) {
      svg.line(tableLeft + 12, ry, tableLeft + totalW - 12, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });
    }

    // Label (first column)
    let cx = tableLeft;
    renderCellText(svg, row.label, cx + 16, ry + rowH / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text);
    cx += paddedWidths[0]!;

    // Value cells - render as check/cross or text
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        const val = row.values[v]!;
        const cellCx = cx + cw / 2;
        const cellCy = ry + rowH / 2;

        if (isPositive(val)) {
          // Green check circle
          svg.circle(cellCx, cellCy, 12, { fill: '#22C55E', opacity: 0.15 });
          svg.path(`M ${cellCx - 5} ${cellCy} L ${cellCx - 1} ${cellCy + 4} L ${cellCx + 6} ${cellCy - 4}`, {
            fill: 'none', stroke: '#22C55E', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          });
        } else if (isNegative(val)) {
          // Red cross circle
          svg.circle(cellCx, cellCy, 12, { fill: '#EF4444', opacity: 0.1 });
          svg.path(`M ${cellCx - 4} ${cellCy - 4} L ${cellCx + 4} ${cellCy + 4} M ${cellCx + 4} ${cellCy - 4} L ${cellCx - 4} ${cellCy + 4}`, {
            fill: 'none', stroke: '#EF4444', 'stroke-width': 2.5, 'stroke-linecap': 'round',
          });
        } else {
          // Plain text
          renderCellText(svg, val, cellCx, cellCy, cw - 8, 'middle', 13, 400, t.textSecondary);
        }
        cx += cw;
      }
    }
    ry += rowH;
  }

  return svg.build();
}

// === Spec Card: each data column as a card with key-value pairs ===

function renderSpecCard(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const pad = 48;
  const titleH = title ? 52 : 0;

  // Cards from headers[1:], rows provide key-value pairs
  const cardHeaders = data.headers.slice(1);
  const cardCount = cardHeaders.length;
  const rowCount = data.rows.length;
  const kvH = 32;
  const cardPadTop = 52;
  const cardH = cardPadTop + rowCount * kvH + 16;
  const cardW = 220;
  const gap = 20;
  const totalW = cardCount * cardW + (cardCount - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (spec card)');
  svg.defs(defs);

  drawBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;

  for (let c = 0; c < cardCount; c++) {
    const color = t.colors[c % t.colors.length]!;
    const cardX = pad + c * (cardW + gap);
    const cardY = contentTop;

    // Card background
    svg.rect(cardX, cardY, cardW, cardH, {
      fill: t.surface, rx: t.borderRadius,
      stroke: t.borderWidth > 0 ? t.border : 'none',
      'stroke-width': t.borderWidth,
      ...tableCardAttrs(t),
    });

    // Top color accent bar
    svg.rect(cardX + 1, cardY + 1, cardW - 2, 5, { fill: color, rx: 2 });

    // Card title (header name)
    const hFit = fitText(cardHeaders[c]!, cardW - 32, 1, 16);
    svg.text(cardX + cardW / 2, cardY + 36, hFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': hFit.fontSize, 'font-weight': 700, fill: t.text,
    });

    // Key-value pairs from rows
    for (let r = 0; r < rowCount; r++) {
      const row = data.rows[r]!;
      const kvY = cardY + cardPadTop + r * kvH;
      const val = row.values[c] ?? '';

      // Separator
      svg.line(cardX + 16, kvY, cardX + cardW - 16, kvY, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });

      // Key (row label)
      const kFit = fitText(row.label, cardW / 2 - 20, 1, 11);
      svg.text(cardX + 16, kvY + 20, kFit.lines[0]!, {
        'font-size': kFit.fontSize, 'font-weight': 500, fill: t.textSecondary,
      });

      // Value
      const vFit = fitText(val, cardW / 2 - 20, 1, 13);
      svg.text(cardX + cardW - 16, kvY + 20, vFit.lines[0]!, {
        'text-anchor': 'end', 'font-size': vFit.fontSize, 'font-weight': 600, fill: t.text,
      });
    }
  }

  return svg.build();
}

// --- Utility ---

function adjustBrightness(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + amount));
  const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + amount));
  const b = Math.min(255, Math.max(0, (num & 0xFF) + amount));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
