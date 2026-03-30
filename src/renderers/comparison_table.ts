import { SvgBuilder, escapeXml, FILTER_SHADOW, FILTER_CARD_SHADOW, linearGradient } from '../shared/svg.js';
import { getDesign as getTheme, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import { createDiagramSvg, drawBackground, drawTitle, drawSketchBackground, drawPixelBackground } from '../shared/render-utils.js';

function tableCardAttrs(t: DesignPreset): Record<string, string | number> {
  if (t.id === 'watercolor') return { filter: 'url(#wc-light)', opacity: 0.9 };
  return t.cardAttrs();
}

function drawPresetBackground(svg: SvgBuilder, t: DesignPreset, width: number, height: number): void {
  if (t.id === 'sketch') {
    drawSketchBackground(svg, width, height, t.bg);
  } else if (t.id === 'pixel') {
    drawPixelBackground(svg, width, height, t.bg);
  } else {
    drawBackground(svg, t, width, height);
  }
}

function pixelTableCard(svg: SvgBuilder, t: DesignPreset, x: number, y: number, w: number, h: number): void {
  svg.raw(pixelBorder(x, y, w, h, t.primary, 3));
  svg.rect(x + 3, y + 3, w - 6, h - 6, {
    fill: t.surface, 'shape-rendering': 'crispEdges',
  });
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
    case 'matrix': return renderMatrix(data, title, design);
    case 'pricing': return renderPricing(data, title, design);
    case 'scorecard': return renderScorecard(data, title, design);
    case 'versus': return renderVersus(data, title, design);
    case 'feature_matrix': return renderFeatureMatrix(data, title, design);
    case 'timeline_compare': return renderTimelineCompare(data, title, design);
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

  // Clamp individual columns
  for (let i = 0; i < colWidths.length; i++) {
    colWidths[i] = Math.min(colWidths[i]!, maxW);
  }

  // Shrink columns proportionally if total width exceeds max
  // Budget: 960px total - pad*2(96) - tableInset*2(40) - colPad*colCount(16*N) = remaining for columns
  const maxTableW = 960 - 96 - 40 - 16 * colCount;
  const totalColW = colWidths.reduce((s, w) => s + w, 0);
  if (totalColW > maxTableW) {
    const ratio = maxTableW / totalColW;
    const shrunkMin = Math.max(50, Math.round(minW * ratio));
    for (let i = 0; i < colWidths.length; i++) {
      colWidths[i] = Math.max(shrunkMin, Math.round(colWidths[i]! * ratio));
    }
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
  dataField?: string,
): void {
  const fit = fitText(text, maxW - 12, 3, fontSize);
  const lh = Math.round(fit.fontSize * 1.5);
  const totalH = fit.lines.length * lh;
  let y = yCentre - totalH / 2 + lh - 3;
  for (const line of fit.lines) {
    svg.text(x, y, line, {
      'text-anchor': anchor, 'font-size': fit.fontSize, 'font-weight': fontWeight, fill,
      ...(dataField ? { 'data-field': dataField } : {}),
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

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset;

  // --- Inner table card (subtle inset) ---
  const tableH = headerH + totalRowH + 4;

  if (t.id === 'sketch') {
    svg.path(jitterRect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, 0), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (t.id === 'pixel') {
    pixelTableCard(svg, t, tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8);
  } else if (t.id === 'neon') {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: 'rgba(0,0,0,0.4)', rx: t.borderRadius,
      stroke: t.border, 'stroke-width': 1,
    });
  } else if (t.id === 'glass') {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius,
      stroke: t.border, 'stroke-width': 1,
      ...t.cardAttrs(),
    });
  } else if (t.id === 'watercolor') {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius, opacity: 0.9,
      filter: 'url(#watercolor)',
    });
  } else if (t.id === 'bold') {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius,
      stroke: t.border, 'stroke-width': 3,
      filter: 'url(#bold-offset)',
    });
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: 'url(#halftone)', rx: t.borderRadius,
    });
  } else if (t.id === 'minimal') {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius,
    });
  } else {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius, stroke: t.borderWidth > 0 ? t.border : 'none',
      'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
      ...tableCardAttrs(t),
    });
  }

  // --- Header row ---
  if (t.id === 'sketch') {
    // Hand-drawn header underline
    svg.path(jitterLine(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, 1), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (t.id === 'pixel') {
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: t.primary, opacity: 0.15, 'shape-rendering': 'crispEdges',
    });
    svg.raw(pixelBorder(tableLeft, tableTop, totalW, headerH, t.primary, 3));
  } else if (t.id === 'bold') {
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: t.primary, opacity: 0.15, rx: 0,
    });
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: 'url(#halftone)', rx: 0,
    });
    svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
      stroke: t.border, 'stroke-width': 3,
    });
  } else if (t.id === 'neon') {
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: 'rgba(0,255,255,0.06)', rx: 0,
    });
    svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
      stroke: t.primary, 'stroke-width': 1, opacity: 0.6, filter: 'url(#neon-glow)',
    });
  } else if (t.id === 'glass') {
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: 'rgba(255,255,255,0.05)', rx: 0,
    });
    svg.line(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, {
      stroke: t.primary, 'stroke-width': 1, opacity: 0.4,
    });
  } else if (t.id === 'watercolor') {
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: t.primary, opacity: 0.08, rx: 0, filter: 'url(#wc-light)',
    });
  } else if (t.id === 'minimal') {
    // No header bg, just a clean bottom line
    svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
      stroke: t.border, 'stroke-width': 1,
    });
  } else {
    // clean default
    svg.rect(tableLeft, tableTop, totalW, headerH, {
      fill: t.bg, rx: 0,
    });
    svg.line(tableLeft + 8, tableTop + headerH, tableLeft + totalW - 8, tableTop + headerH, {
      stroke: t.primary, 'stroke-width': 2, opacity: 0.25,
    });
  }

  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const color = t.colors[c % t.colors.length]!;

    // Header text — bold, colored subtly
    const fit = fitText(headerText, w - 20, 1, 12);
    const textColor = c === 0 ? t.text : color;

    const headerTextAttrs: Record<string, string | number> = {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700,
      fill: textColor, opacity: c === 0 ? 1 : 0.85, 'letter-spacing': 0.2,
    };
    if (t.id === 'bold') {
      headerTextAttrs['font-weight'] = 900;
      headerTextAttrs['font-size'] = fit.fontSize + 1;
      headerTextAttrs['filter'] = 'url(#bold-offset)';
    }
    if (t.id === 'neon') {
      headerTextAttrs['filter'] = 'url(#neon-glow)';
    }
    headerTextAttrs['data-field'] = `headers[${c}]`;
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, headerTextAttrs);

    // Color-independent differentiator: underline for non-first columns
    if (c > 0 && t.id !== 'minimal') {
      const underY = tableTop + headerH / 2 + 8;
      const uw = Math.min(estimateWidth(fit.lines[0]!, fit.fontSize), w - 24);
      if (t.id === 'sketch') {
        svg.path(jitterLine(hx + w / 2 - uw / 2, underY, hx + w / 2 + uw / 2, underY, c * 7), {
          fill: 'none', stroke: textColor, 'stroke-width': t.borderWidth, opacity: 0.5,
        });
      } else {
        svg.line(hx + w / 2 - uw / 2, underY, hx + w / 2 + uw / 2, underY, {
          stroke: textColor, 'stroke-width': 2, opacity: 0.5,
        });
      }
    }

    hx += w;
  }

  // --- Data rows ---
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const rh = layout.rowHeights[r]!;
    const isOdd = r % 2 === 1;

    svg.beginItem(`rows[${r}]`);

    // Preset-specific alternating row backgrounds
    if (t.id === 'neon') {
      if (isOdd) {
        svg.rect(tableLeft, ry, totalW, rh, { fill: 'rgba(0,255,255,0.03)' });
      }
    } else if (t.id === 'glass') {
      if (isOdd) {
        svg.rect(tableLeft, ry, totalW, rh, { fill: 'rgba(255,255,255,0.03)' });
      }
    } else if (t.id === 'watercolor') {
      if (isOdd) {
        svg.rect(tableLeft, ry, totalW, rh, { fill: t.primary, opacity: 0.04, filter: 'url(#wc-light)' });
      }
    } else if (t.id === 'bold') {
      if (isOdd) {
        svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
        svg.rect(tableLeft, ry, totalW, rh, { fill: 'url(#halftone)' });
      }
    } else if (t.id !== 'sketch' && t.id !== 'pixel') {
      if (isOdd) {
        svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
      }
    }

    // Row separator — preset-specific
    if (r > 0) {
      if (t.id === 'sketch') {
        svg.path(jitterLine(tableLeft + 12, ry, tableLeft + totalW - 12, ry, r * 11), {
          fill: 'none', stroke: t.border, 'stroke-width': 1, opacity: 0.3,
        });
      } else if (t.id === 'pixel') {
        svg.line(tableLeft, ry, tableLeft + totalW, ry, {
          stroke: t.border, 'stroke-width': 1, 'shape-rendering': 'crispEdges', opacity: 0.4,
        });
      } else if (t.id === 'bold') {
        svg.line(tableLeft, ry, tableLeft + totalW, ry, {
          stroke: t.border, 'stroke-width': 3, opacity: 0.15,
        });
      } else if (t.id === 'neon') {
        svg.line(tableLeft + 8, ry, tableLeft + totalW - 8, ry, {
          stroke: t.primary, 'stroke-width': 0.5, opacity: 0.2,
        });
      } else if (t.id === 'minimal') {
        // Only bottom line for the entire table, no inter-row separators
      } else {
        svg.line(tableLeft + 12, ry, tableLeft + totalW - 12, ry, {
          stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
        });
      }
    }

    // Label cell (first column)
    let cx = tableLeft;
    const labelColor = t.colors[r % t.colors.length]!;

    // Accent dot
    if (t.id !== 'minimal' && t.id !== 'sketch') {
      svg.circle(cx + 14, ry + rh / 2, 3.5, {
        fill: labelColor,
        ...(t.id === 'neon' ? { filter: 'url(#neon-glow)' } : {}),
      });
    }

    renderCellText(svg, row.label, cx + 26, ry + rh / 2, paddedWidths[0]! - 30, 'start', 13, 600, t.text, `rows[${r}].label`);
    cx += paddedWidths[0]!;

    // Value cells — slightly lighter
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        renderCellText(svg, row.values[v]!, cx + cw / 2, ry + rh / 2, cw - 8, 'middle', 13, 400, t.textSecondary, `rows[${r}].values[${v}]`);

        // Subtle column divider — preset-specific
        if (v + 2 < layout.colCount) {
          if (t.id === 'sketch') {
            svg.path(jitterLine(cx + cw, ry + 8, cx + cw, ry + rh - 8, r * 13 + v * 5), {
              fill: 'none', stroke: t.border, 'stroke-width': 1, opacity: 0.15,
            });
          } else if (t.id === 'pixel') {
            svg.line(cx + cw, ry, cx + cw, ry + rh, {
              stroke: t.border, 'stroke-width': 1, 'shape-rendering': 'crispEdges', opacity: 0.2,
            });
          } else if (t.id === 'neon') {
            svg.line(cx + cw, ry + 8, cx + cw, ry + rh - 8, {
              stroke: t.primary, 'stroke-width': 0.5, opacity: 0.15,
            });
          } else if (t.id === 'minimal') {
            // No column dividers for minimal
          } else {
            svg.line(cx + cw, ry + 8, cx + cw, ry + rh - 8, {
              stroke: t.border, 'stroke-width': 0.5, opacity: 0.15,
            });
          }
        }
        cx += cw;
      }
    }

    svg.endItem();
    ry += rh;
  }

  // Minimal: single bottom line under the entire table
  if (t.id === 'minimal') {
    svg.line(tableLeft, ry, tableLeft + totalW, ry, {
      stroke: t.border, 'stroke-width': 1,
    });
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

    svg.beginItem(`rows[${i}]`);

    // Row label (card title)
    const fit = fitText(row.label, cardW - 32, 1, 16);
    svg.text(pad + 16, y + 32, fit.lines[0]!, {
      'font-size': fit.fontSize, 'font-weight': 700, fill: t.text,
      'data-field': `rows[${i}].label`,
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
        'data-field': `headers[${h + 1}]`,
      });

      // Value
      const vfit = fitText(value, cardW - 160, 1, 13);
      svg.text(pad + cardW - 16, attrY + 12, vfit.lines[0]!, {
        'text-anchor': 'end', 'font-size': vfit.fontSize, 'font-weight': 500, fill: t.text,
        'data-field': `rows[${i}].values[${h}]`,
      });
    }

    svg.endItem();
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
      'data-field': `headers[${c}]`,
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

    svg.beginItem(`rows[${r}]`);

    // Row underline
    svg.line(tableLeft, y + rowH, tableLeft + totalW, y + rowH, {
      stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
    });

    let cx = tableLeft;
    // Label
    renderCellText(svg, row.label, cx + layout.colWidths[0]! / 2, y + rowH / 2, layout.colWidths[0]!, 'middle', 13, 600, t.text, `rows[${r}].label`);
    cx += layout.colWidths[0]!;

    // Values
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = layout.colWidths[v + 1]!;
        renderCellText(svg, row.values[v]!, cx + cw / 2, y + rowH / 2, cw, 'middle', 13, 400, t.textSecondary, `rows[${r}].values[${v}]`);
        cx += cw;
      }
    }

    svg.endItem();
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
    'data-field': 'headers[1]',
  });
  svg.text(rightCx, contentTop + 16, afterLabel, {
    'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: t.textSecondary,
    'data-field': 'headers[2]',
  });

  const rowStart = contentTop + 36;

  for (let i = 0; i < count; i++) {
    const row = rows[i]!;
    const color = t.colors[i % t.colors.length]!;
    const y = rowStart + i * (rowH + gap);
    const beforeVal = row.values[0] ?? '';
    const afterVal = row.values[1] ?? '';

    svg.beginItem(`rows[${i}]`);

    // Row label above
    svg.text(pad + cardW + arrowW / 2, y + 10, row.label, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 600, fill: color, 'letter-spacing': '0.5',
      'data-field': `rows[${i}].label`,
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
    renderCellText(svg, beforeVal, pad + 20, cardTop + cardInnerH / 2, cardW - 32, 'start', 13, 400, t.textSecondary, `rows[${i}].values[0]`);

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
    renderCellText(svg, afterVal, afterLeft + 20, cardTop + cardInnerH / 2, cardW - 32, 'start', 13, 600, t.text, `rows[${i}].values[1]`);

    svg.endItem();
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
      fill: color, 'data-field': `headers[${c}]`,
    });
    hx += w;
  }

  // Data rows
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const rh = layout.rowHeights[r]!;

    svg.beginItem(`rows[${r}]`);

    if (r % 2 === 1) {
      svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
    }
    if (r > 0) {
      svg.line(tableLeft + 12, ry, tableLeft + totalW - 12, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });
    }

    let cx = tableLeft;
    renderCellText(svg, row.label, cx + 16, ry + rh / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text, `rows[${r}].label`);
    cx += paddedWidths[0]!;

    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        const isHighlight = v + 1 === highlightCol;
        const weight = isHighlight ? 700 : 400;
        const fill = isHighlight ? highlightColor : t.textSecondary;
        renderCellText(svg, row.values[v]!, cx + cw / 2, ry + rh / 2, cw - 8, 'middle', 13, weight, fill, `rows[${r}].values[${v}]`);
        cx += cw;
      }
    }

    svg.endItem();
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
      fill: c === 0 ? t.text : color, 'data-field': `headers[${c}]`,
    });
    hx += w;
  }

  // Data rows
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;

    svg.beginItem(`rows[${r}]`);

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
    renderCellText(svg, row.label, cx + 16, ry + rowH / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text, `rows[${r}].label`);
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
          renderCellText(svg, val, cellCx, cellCy, cw - 8, 'middle', 13, 400, t.textSecondary, `rows[${r}].values[${v}]`);
        }
        cx += cw;
      }
    }

    svg.endItem();
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

    svg.beginItem(`headers[${c + 1}]`);

    // Card title (header name)
    const hFit = fitText(cardHeaders[c]!, cardW - 32, 1, 16);
    svg.text(cardX + cardW / 2, cardY + 36, hFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': hFit.fontSize, 'font-weight': 700, fill: t.text,
      'data-field': `headers[${c + 1}]`,
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
        'data-field': `rows[${r}].label`,
      });

      // Value
      const vFit = fitText(val, cardW / 2 - 20, 1, 13);
      svg.text(cardX + cardW - 16, kvY + 20, vFit.lines[0]!, {
        'text-anchor': 'end', 'font-size': vFit.fontSize, 'font-weight': 600, fill: t.text,
        'data-field': `rows[${r}].values[${c}]`,
      });
    }

    svg.endItem();
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

function hexToRgba(hex: string, alpha: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const r = (num >> 16) & 0xFF;
  const g = (num >> 8) & 0xFF;
  const b = num & 0xFF;
  return `rgba(${r},${g},${b},${alpha})`;
}

// === Matrix: spreadsheet-style grid ===

function renderMatrix(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const isPixel = t.id === 'pixel';
  const pad = 48;
  const titleH = title ? 52 : 0;
  const headerH = 48;
  const layout = computeLayout(data);

  const colPad = 16;
  const paddedWidths = layout.colWidths.map(w => w + colPad);
  const totalW = paddedWidths.reduce((a, b) => a + b, 0);
  const totalRowH = layout.rowHeights.reduce((a, b) => a + b, 0);
  const tableInset = 20;
  const width = pad * 2 + totalW + tableInset * 2;
  const height = pad * 2 + titleH + headerH + totalRowH + tableInset * 2 + 4;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (matrix)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset;
  const tableH = headerH + totalRowH + 4;

  if (isSketch) {
    svg.path(jitterRect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, 0), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (isPixel) {
    pixelTableCard(svg, t, tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8);
  } else {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius,
      stroke: t.borderWidth > 0 ? t.border : 'none',
      'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
      ...tableCardAttrs(t),
    });
  }

  // Column headers
  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const color = c === 0 ? t.text : t.colors[(c - 1) % t.colors.length]!;

    if (c > 0) {
      svg.rect(hx, tableTop, w, headerH, { fill: color, opacity: 0.1 });
    }

    const fit = fitText(headerText, w - 20, 1, 12);
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: color,
      'data-field': `headers[${c}]`,
    });
    hx += w;
  }

  svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
    stroke: t.border, 'stroke-width': 1.5, opacity: 0.4,
  });

  // Vertical column dividers
  let divX = tableLeft;
  for (let c = 0; c < layout.colCount - 1; c++) {
    divX += paddedWidths[c]!;
    svg.line(divX, tableTop, divX, tableTop + tableH, {
      stroke: t.border, 'stroke-width': 0.5, opacity: 0.2,
    });
  }

  // Data rows
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;
    const rh = layout.rowHeights[r]!;

    svg.beginItem(`rows[${r}]`);

    if (r % 2 === 1) {
      svg.rect(tableLeft, ry, totalW, rh, { fill: t.surface, opacity: 0.5 });
    }
    if (r > 0) {
      svg.line(tableLeft, ry, tableLeft + totalW, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.2,
      });
    }

    // Row label
    let cx = tableLeft;
    svg.rect(cx, ry, paddedWidths[0]!, rh, { fill: t.bg, opacity: 0.5 });
    renderCellText(svg, row.label, cx + 16, ry + rh / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text, `rows[${r}].label`);
    cx += paddedWidths[0]!;

    // Value cells with subtle color tinting
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        const color = t.colors[v % t.colors.length]!;
        svg.rect(cx, ry, cw, rh, { fill: color, opacity: 0.04 });
        renderCellText(svg, row.values[v]!, cx + cw / 2, ry + rh / 2, cw - 12, 'middle', 13, 400, t.textSecondary, `rows[${r}].values[${v}]`);
        cx += cw;
      }
    }

    svg.endItem();
    ry += rh;
  }

  return svg.build();
}

// === Pricing: SaaS pricing table with vertical cards ===

function renderPricing(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const pad = 48;
  const titleH = title ? 52 : 0;

  const cardHeaders = data.headers.slice(1);
  const cardCount = cardHeaders.length;
  const rowCount = data.rows.length;
  const kvH = 36;
  const cardPadTop = 64;
  const cardH = cardPadTop + rowCount * kvH + 24;
  const cardW = Math.max(180, Math.min(240, 800 / Math.max(cardCount, 1)));
  const gap = 16;
  const highlightIdx = Math.floor(cardCount / 2);
  const liftH = 16;
  const totalW = cardCount * cardW + (cardCount - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + cardH + liftH;

  const isPixel = t.id === 'pixel';
  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (pricing)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;

  for (let c = 0; c < cardCount; c++) {
    const color = t.colors[c % t.colors.length]!;
    const isHighlight = c === highlightIdx;
    const cardX = pad + c * (cardW + gap);
    const cardY = isHighlight ? contentTop : contentTop + liftH;
    const thisCardH = isHighlight ? cardH + liftH : cardH;

    if (isSketch) {
      svg.path(jitterRect(cardX + 2, cardY + 2, cardW - 4, thisCardH - 4, c * 13), {
        fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
      });
    } else if (isPixel) {
      pixelTableCard(svg, t, cardX, cardY, cardW, thisCardH);
    } else {
      svg.rect(cardX, cardY, cardW, thisCardH, {
        fill: t.surface, rx: t.borderRadius,
        stroke: isHighlight ? color : (t.borderWidth > 0 ? t.border : 'none'),
        'stroke-width': isHighlight ? 2.5 : t.borderWidth,
        ...tableCardAttrs(t),
      });

      // Top color bar
      svg.rect(cardX + 1, cardY + 1, cardW - 2, isHighlight ? 8 : 5, {
        fill: color, rx: t.borderRadius > 0 ? Math.min(t.borderRadius, 4) : 0,
      });

      // Highlight badge
      if (isHighlight) {
        const badgeW = Math.min(cardW - 16, 90);
        svg.rect(cardX + cardW / 2 - badgeW / 2, cardY - 12, badgeW, 24, {
          fill: color, rx: 12,
        });
        svg.text(cardX + cardW / 2, cardY + 3, '\u2605 Popular', {
          'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: '#FFFFFF',
        });
      }
    }

    svg.beginItem(`headers[${c + 1}]`);

    // Card header
    const hFit = fitText(cardHeaders[c]!, cardW - 32, 1, 18);
    svg.text(cardX + cardW / 2, cardY + (isHighlight ? 46 : 40), hFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': hFit.fontSize, 'font-weight': 800, fill: t.text,
      'data-field': `headers[${c + 1}]`,
    });

    // Divider
    svg.line(cardX + 16, cardY + (isHighlight ? 56 : 50), cardX + cardW - 16, cardY + (isHighlight ? 56 : 50), {
      stroke: color, 'stroke-width': 1.5, opacity: 0.3,
    });

    // Key-value pairs
    const kvStart = cardY + cardPadTop + (isHighlight ? liftH / 2 : 0);
    for (let r = 0; r < rowCount; r++) {
      const row = data.rows[r]!;
      const kvY = kvStart + r * kvH;
      const val = row.values[c] ?? '';

      // Row label
      const kFit = fitText(row.label, cardW - 32, 1, 11);
      svg.text(cardX + cardW / 2, kvY + 14, kFit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': kFit.fontSize, 'font-weight': 500, fill: t.textSecondary,
        'data-field': `rows[${r}].label`,
      });

      // Value
      const vFit = fitText(val, cardW - 32, 1, 14);
      svg.text(cardX + cardW / 2, kvY + 30, vFit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': vFit.fontSize, 'font-weight': 700, fill: t.text,
        'data-field': `rows[${r}].values[${c}]`,
      });
    }

    svg.endItem();
  }

  return svg.build();
}

// === Scorecard: item cards with rating bars for numeric values ===

function renderScorecard(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const pad = 48;
  const titleH = title ? 52 : 0;

  const cardHeaders = data.headers.slice(1);
  const cardCount = cardHeaders.length;
  const rowCount = data.rows.length;
  const kvH = 40;
  const cardPadTop = 56;
  const cardH = cardPadTop + rowCount * kvH + 16;
  const cardW = Math.max(200, Math.min(280, 900 / Math.max(cardCount, 1)));
  const gap = 20;
  const cols = Math.min(cardCount, 3);
  const gridRows = Math.ceil(cardCount / cols);
  const totalW = cols * cardW + (cols - 1) * gap;
  const totalH = gridRows * cardH + (gridRows - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + totalH;

  const isPixel = t.id === 'pixel';
  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (scorecard)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;

  // Parse a numeric value from text: strip commas, extract leading digits
  const UNLIMITED_RE = /^(無制限|unlimited|∞|infinity)$/i;
  function parseNumericValue(text: string): number | null {
    if (UNLIMITED_RE.test(text.trim())) return null; // sentinel for "unlimited"
    const stripped = text.replace(/,/g, '');
    const m = stripped.match(/[\d]+(?:\.[\d]+)?/);
    if (!m) return null;
    const n = parseFloat(m[0]!);
    return isNaN(n) ? null : n;
  }
  function isUnlimited(text: string): boolean {
    return UNLIMITED_RE.test(text.trim());
  }

  // Compute per-row max numeric value for normalizing bar widths
  const rowMaxNums: number[] = data.rows.map(row => {
    let mx = 0;
    for (const val of row.values) {
      const n = parseNumericValue(val);
      if (n !== null && n > mx) mx = n;
    }
    return mx;
  });

  for (let c = 0; c < cardCount; c++) {
    const color = t.colors[c % t.colors.length]!;
    const col = c % cols;
    const gridRow = Math.floor(c / cols);
    const cardX = pad + col * (cardW + gap);
    const cardY = contentTop + gridRow * (cardH + gap);

    if (isSketch) {
      svg.path(jitterRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, c * 11), {
        fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
      });
    } else if (isPixel) {
      pixelTableCard(svg, t, cardX, cardY, cardW, cardH);
      svg.rect(cardX + 3, cardY + 4, 5, cardH - 8, { fill: color, 'shape-rendering': 'crispEdges' });
    } else {
      svg.rect(cardX, cardY, cardW, cardH, {
        fill: t.surface, rx: t.borderRadius,
        stroke: t.borderWidth > 0 ? t.border : 'none',
        'stroke-width': t.borderWidth,
        ...tableCardAttrs(t),
      });

      // Color accent left strip
      svg.rect(cardX, cardY + 4, 5, cardH - 8, { fill: color, rx: 2 });
    }

    svg.beginItem(`headers[${c + 1}]`);

    // Card header
    const hFit = fitText(cardHeaders[c]!, cardW - 48, 1, 16);
    svg.text(cardX + 24, cardY + 36, hFit.lines[0]!, {
      'font-size': hFit.fontSize, 'font-weight': 700, fill: t.text,
      'data-field': `headers[${c + 1}]`,
    });

    // Attribute rows
    for (let r = 0; r < rowCount; r++) {
      const row = data.rows[r]!;
      const kvY = cardY + cardPadTop + r * kvH;
      const val = row.values[c] ?? '';
      const numVal = parseNumericValue(val);
      const unlim = isUnlimited(val);
      const rowMax = rowMaxNums[r] ?? 100;

      // Separator
      svg.line(cardX + 20, kvY, cardX + cardW - 16, kvY, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.3,
      });

      // Label
      const kFit = fitText(row.label, cardW / 2 - 28, 1, 11);
      svg.text(cardX + 24, kvY + 18, kFit.lines[0]!, {
        'font-size': kFit.fontSize, 'font-weight': 500, fill: t.textSecondary,
        'data-field': `rows[${r}].label`,
      });

      if (unlim || numVal !== null) {
        // Render as progress bar
        const barW = cardW / 2 - 40;
        const barH = 8;
        const barX = cardX + cardW / 2 + 8;
        const barY = kvY + 12;
        const ratio = unlim ? 1 : (rowMax > 0 ? numVal! / rowMax : 1);
        const fillW = Math.max(10, ratio * barW);

        svg.rect(barX, barY, barW, barH, {
          fill: t.border, opacity: 0.15, rx: 4,
        });
        svg.rect(barX, barY, fillW, barH, {
          fill: color, rx: 4, opacity: 0.8,
        });

        // Value label to the right
        svg.text(barX + barW + 8, barY + barH / 2 + 4, val, {
          'font-size': 10, 'font-weight': 600, fill: t.text,
          'data-field': `rows[${r}].values[${c}]`,
        });
      } else {
        // Text badge (non-numeric values)
        const vFit = fitText(val, cardW / 2 - 28, 1, 12);
        const badgeW = estimateWidth(vFit.lines[0]!, vFit.fontSize) + 16;
        const badgeX = cardX + cardW - 20 - badgeW;
        const badgeY = kvY + 6;
        svg.rect(badgeX, badgeY, badgeW, 22, {
          fill: color, opacity: 0.1, rx: 11,
        });
        svg.text(badgeX + badgeW / 2, badgeY + 15, vFit.lines[0]!, {
          'text-anchor': 'middle', 'font-size': vFit.fontSize, 'font-weight': 600, fill: color,
          'data-field': `rows[${r}].values[${c}]`,
        });
      }
    }

    svg.endItem();
  }

  return svg.build();
}

// === Versus: two-column VS layout ===

function renderVersus(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const isPixel = t.id === 'pixel';

  // If more than 2 items, fall back to graphic
  if (data.headers.length > 3) {
    return renderGraphic(data, title, design);
  }

  const pad = 48;
  const titleH = title ? 52 : 0;
  const rowCount = data.rows.length;
  const rowH = 56;
  const headerH = 64;
  const vsW = 60;
  const colW = 280;
  const gap = 12;
  const width = pad * 2 + colW * 2 + vsW;
  const height = pad * 2 + titleH + headerH + rowCount * (rowH + gap) + 8;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (versus)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;
  const leftColor = t.colors[0]!;
  const rightColor = t.colors[1 % t.colors.length]!;

  // Column headers
  const leftLabel = data.headers[1] ?? 'A';
  const rightLabel = data.headers[2] ?? 'B';

  const leftCx = pad + colW / 2;
  const rightCx = pad + colW + vsW + colW / 2;

  // Left header card
  if (isSketch) {
    svg.path(jitterRect(pad + 2, contentTop + 2, colW - 4, headerH - 12, 0), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (isPixel) {
    pixelTableCard(svg, t, pad, contentTop, colW, headerH - 8);
  } else {
    svg.rect(pad, contentTop, colW, headerH - 8, {
      fill: leftColor, opacity: 0.12, rx: t.borderRadius,
    });
  }
  const lhFit = fitText(leftLabel, colW - 32, 1, 18);
  svg.text(leftCx, contentTop + headerH / 2 - 2, lhFit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': lhFit.fontSize, 'font-weight': 800, fill: leftColor,
    'data-field': 'headers[1]',
  });

  // Right header card
  if (isSketch) {
    svg.path(jitterRect(pad + colW + vsW + 2, contentTop + 2, colW - 4, headerH - 12, 5), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (isPixel) {
    pixelTableCard(svg, t, pad + colW + vsW, contentTop, colW, headerH - 8);
  } else {
    svg.rect(pad + colW + vsW, contentTop, colW, headerH - 8, {
      fill: rightColor, opacity: 0.12, rx: t.borderRadius,
    });
  }
  const rhFit = fitText(rightLabel, colW - 32, 1, 18);
  svg.text(rightCx, contentTop + headerH / 2 - 2, rhFit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': rhFit.fontSize, 'font-weight': 800, fill: rightColor,
    'data-field': 'headers[2]',
  });

  // VS badge
  const vsCx = pad + colW + vsW / 2;
  const vsCy = contentTop + headerH / 2 - 4;
  if (isSketch) {
    const rx = 22 + 1.5;
    const ry2 = 22 - 1;
    svg.raw(`<ellipse cx="${vsCx}" cy="${vsCy}" rx="${rx}" ry="${ry2}" fill="none" stroke="${t.border}" stroke-width="${t.borderWidth}"/>`);
    svg.text(vsCx, vsCy + 6, 'VS', {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 400, fill: t.text,
    });
  } else if (isPixel) {
    svg.rect(vsCx - 22, vsCy - 22, 44, 44, {
      fill: t.primary, 'shape-rendering': 'crispEdges',
    });
    svg.text(vsCx, vsCy + 6, 'VS', {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 900, fill: '#FFFFFF',
    });
  } else {
    svg.circle(vsCx, vsCy, 22, { fill: t.primary, opacity: 0.9 });
    svg.text(vsCx, vsCy + 6, 'VS', {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 900, fill: '#FFFFFF',
    });
  }

  // Rows
  const rowStart = contentTop + headerH;
  for (let r = 0; r < rowCount; r++) {
    const row = data.rows[r]!;
    const ry = rowStart + r * (rowH + gap);
    const leftVal = row.values[0] ?? '';
    const rightVal = row.values[1] ?? '';

    svg.beginItem(`rows[${r}]`);

    // Row label centered
    const labelMaxW = Math.max(150, estimateWidth(row.label, 10) + 16);
    const lFit = fitText(row.label, labelMaxW, 1, 10);
    svg.text(vsCx, ry + 10, lFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': lFit.fontSize, 'font-weight': 600, fill: t.textSecondary,
      'data-field': `rows[${r}].label`,
    });

    // Left card
    if (isSketch) {
      svg.path(jitterRect(pad + 2, ry + 16, colW - 4, rowH - 22, r * 7), {
        fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
      });
    } else if (isPixel) {
      svg.rect(pad, ry + 14, colW, rowH - 18, {
        fill: t.surface, 'shape-rendering': 'crispEdges',
        stroke: leftColor, 'stroke-width': 1,
      });
      svg.rect(pad, ry + 18, 4, rowH - 26, { fill: leftColor, 'shape-rendering': 'crispEdges' });
    } else {
      svg.rect(pad, ry + 14, colW, rowH - 18, {
        fill: t.surface, rx: t.borderRadius,
        stroke: leftColor, 'stroke-width': 1,
        ...tableCardAttrs(t),
      });
      svg.rect(pad, ry + 18, 4, rowH - 26, { fill: leftColor, rx: 2 });
    }
    renderCellText(svg, leftVal, pad + 20, ry + 14 + (rowH - 18) / 2, colW - 32, 'start', 13, 500, t.text, `rows[${r}].values[0]`);

    // Right card
    if (isSketch) {
      svg.path(jitterRect(pad + colW + vsW + 2, ry + 16, colW - 4, rowH - 22, r * 7 + 3), {
        fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
      });
    } else if (isPixel) {
      svg.rect(pad + colW + vsW, ry + 14, colW, rowH - 18, {
        fill: t.surface, 'shape-rendering': 'crispEdges',
        stroke: rightColor, 'stroke-width': 1,
      });
      svg.rect(pad + colW + vsW + colW - 4, ry + 18, 4, rowH - 26, { fill: rightColor, 'shape-rendering': 'crispEdges' });
    } else {
      svg.rect(pad + colW + vsW, ry + 14, colW, rowH - 18, {
        fill: t.surface, rx: t.borderRadius,
        stroke: rightColor, 'stroke-width': 1,
        ...tableCardAttrs(t),
      });
      svg.rect(pad + colW + vsW + colW - 4, ry + 18, 4, rowH - 26, { fill: rightColor, rx: 2 });
    }
    renderCellText(svg, rightVal, pad + colW + vsW + 16, ry + 14 + (rowH - 18) / 2, colW - 32, 'start', 13, 500, t.text, `rows[${r}].values[1]`);

    svg.endItem();
  }

  return svg.build();
}

// === Feature Matrix: check/cross grid with alternating rows ===

function isPositiveValue(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'yes' || v === 'true' || v === '\u2713' || v === '\u25CB' || v === '\u2714' || v === '\u2705' || v === '\u3042\u308A';
}

function isNegativeValue(val: string): boolean {
  const v = val.trim().toLowerCase();
  return v === 'no' || v === 'false' || v === '\u2717' || v === '\u00D7' || v === '\u2718' || v === '\u274C' || v === '\u306A\u3057';
}

function renderFeatureMatrix(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const isPixel = t.id === 'pixel';
  const pad = 48;
  const titleH = title ? 52 : 0;
  const headerH = 52;
  const rowH = 44;
  const layout = computeLayout(data);

  const colPad = 16;
  const paddedWidths = layout.colWidths.map(w => w + colPad);
  const totalW = paddedWidths.reduce((a, b) => a + b, 0);
  const totalRowH = data.rows.length * rowH;
  const tableInset = 20;
  const width = pad * 2 + totalW + tableInset * 2;
  const height = pad * 2 + titleH + headerH + totalRowH + tableInset * 2 + 4;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (feature matrix)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const tableLeft = pad + tableInset;
  const tableTop = pad + titleH + tableInset;
  const tableH = headerH + totalRowH + 4;

  // Table background
  if (isSketch) {
    svg.path(jitterRect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, 0), {
      fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
    });
  } else if (isPixel) {
    pixelTableCard(svg, t, tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8);
  } else {
    svg.rect(tableLeft - 4, tableTop - 4, totalW + 8, tableH + 8, {
      fill: t.surface, rx: t.borderRadius,
      stroke: t.borderWidth > 0 ? t.border : 'none',
      'stroke-width': t.borderWidth > 0 ? 0.5 : 0,
      ...tableCardAttrs(t),
    });
  }

  // Header row
  svg.rect(tableLeft, tableTop, totalW, headerH, { fill: t.primary, opacity: 0.08 });

  let hx = tableLeft;
  for (let c = 0; c < layout.colCount; c++) {
    const w = paddedWidths[c]!;
    const headerText = data.headers[c] ?? '';
    const color = c === 0 ? t.text : t.colors[(c - 1) % t.colors.length]!;
    const fit = fitText(headerText, w - 20, 1, 13);
    svg.text(hx + w / 2, tableTop + headerH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: color,
      'data-field': `headers[${c}]`,
    });
    hx += w;
  }

  // Header bottom border
  svg.line(tableLeft, tableTop + headerH, tableLeft + totalW, tableTop + headerH, {
    stroke: t.primary, 'stroke-width': 2, opacity: 0.3,
  });

  // Grid lines (vertical)
  let divX = tableLeft;
  for (let c = 0; c < layout.colCount - 1; c++) {
    divX += paddedWidths[c]!;
    svg.line(divX, tableTop + headerH, divX, tableTop + tableH, {
      stroke: t.border, 'stroke-width': 0.5, opacity: 0.15,
    });
  }

  // Data rows with alternating backgrounds
  let ry = tableTop + headerH;
  for (let r = 0; r < data.rows.length; r++) {
    const row = data.rows[r]!;

    svg.beginItem(`rows[${r}]`);

    // Alternating row bg
    if (r % 2 === 0) {
      svg.rect(tableLeft, ry, totalW, rowH, { fill: t.bg, opacity: 0.4 });
    }

    if (r > 0) {
      svg.line(tableLeft, ry, tableLeft + totalW, ry, {
        stroke: t.border, 'stroke-width': 0.5, opacity: 0.15,
      });
    }

    // Label column
    let cx = tableLeft;
    renderCellText(svg, row.label, cx + 16, ry + rowH / 2, paddedWidths[0]! - 20, 'start', 13, 600, t.text, `rows[${r}].label`);
    cx += paddedWidths[0]!;

    // Value cells
    for (let v = 0; v < row.values.length; v++) {
      if (v + 1 < layout.colCount) {
        const cw = paddedWidths[v + 1]!;
        const val = row.values[v]!;
        const cellCx = cx + cw / 2;
        const cellCy = ry + rowH / 2;

        if (isPositiveValue(val)) {
          svg.circle(cellCx, cellCy, 14, { fill: '#22C55E', opacity: 0.12 });
          svg.path(`M ${cellCx - 6} ${cellCy} L ${cellCx - 2} ${cellCy + 5} L ${cellCx + 7} ${cellCy - 5}`, {
            fill: 'none', stroke: '#22C55E', 'stroke-width': 2.5, 'stroke-linecap': 'round', 'stroke-linejoin': 'round',
          });
        } else if (isNegativeValue(val)) {
          svg.circle(cellCx, cellCy, 14, { fill: '#EF4444', opacity: 0.08 });
          svg.path(`M ${cellCx - 5} ${cellCy - 5} L ${cellCx + 5} ${cellCy + 5} M ${cellCx + 5} ${cellCy - 5} L ${cellCx - 5} ${cellCy + 5}`, {
            fill: 'none', stroke: '#EF4444', 'stroke-width': 2.5, 'stroke-linecap': 'round',
          });
        } else {
          renderCellText(svg, val, cellCx, cellCy, cw - 12, 'middle', 12, 500, t.textSecondary, `rows[${r}].values[${v}]`);
        }
        cx += cw;
      }
    }

    svg.endItem();
    ry += rowH;
  }

  return svg.build();
}

// === Timeline Compare: horizontal timeline with parallel tracks ===

function renderTimelineCompare(data: ComparisonTableData, title?: string, design?: DesignPreset): string {
  const t = design ?? getTheme();
  const isSketch = t.id === 'sketch';
  const isPixel = t.id === 'pixel';
  const pad = 48;
  const titleH = title ? 52 : 0;

  const timePoints = data.rows;
  const tracks = data.headers.slice(1);
  const pointCount = timePoints.length;
  const trackCount = tracks.length;

  const pointGap = 160;
  const trackH = 52;
  const trackGap = 12;
  const timelineTop = 60;
  const labelColW = 100;

  const contentW = labelColW + pointCount * pointGap;
  const contentH = timelineTop + trackCount * (trackH + trackGap) + 24;
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + contentH;

  const { svg, defs } = createDiagramSvg(t, width, height, title, 'Comparison table (timeline compare)');
  svg.defs(defs);

  drawPresetBackground(svg, t, width, height);
  if (title) drawTitle(svg, t, title, width, pad);

  const contentTop = pad + titleH;
  const tlLeft = pad + labelColW;

  // Time point labels along top
  for (let p = 0; p < pointCount; p++) {
    const px = tlLeft + p * pointGap + pointGap / 2;

    svg.beginItem(`rows[${p}]`);

    // Time point marker
    svg.circle(px, contentTop + timelineTop - 20, 5, { fill: isSketch ? t.border : t.primary });

    // Vertical dotted reference line
    svg.line(px, contentTop + timelineTop - 12, px, contentTop + contentH - 16, {
      stroke: t.border, 'stroke-width': 0.5, opacity: 0.2, 'stroke-dasharray': '4,4',
    });

    // Label
    const lFit = fitText(timePoints[p]!.label, pointGap - 20, 1, 12);
    svg.text(px, contentTop + timelineTop - 28, lFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': lFit.fontSize, 'font-weight': 600, fill: t.text,
      'data-field': `rows[${p}].label`,
    });

    svg.endItem();
  }

  // Horizontal timeline axis
  if (pointCount > 1) {
    const axisY = contentTop + timelineTop - 20;
    svg.line(tlLeft + pointGap / 2 - 10, axisY, tlLeft + (pointCount - 1) * pointGap + pointGap / 2 + 10, axisY, {
      stroke: t.primary, 'stroke-width': 2, opacity: 0.3,
    });
  }

  // Tracks
  for (let tr = 0; tr < trackCount; tr++) {
    const color = t.colors[tr % t.colors.length]!;
    const trackY = contentTop + timelineTop + tr * (trackH + trackGap);

    // Track label on the left
    const tFit = fitText(tracks[tr]!, labelColW - 16, 1, 12);
    svg.text(pad + 8, trackY + trackH / 2 + 4, tFit.lines[0]!, {
      'font-size': tFit.fontSize, 'font-weight': 600, fill: color,
      'data-field': `headers[${tr + 1}]`,
    });

    // Track lane background
    svg.rect(tlLeft, trackY, pointCount * pointGap, trackH, {
      fill: color, opacity: 0.05,
      rx: isPixel ? 0 : t.borderRadius,
      ...(isPixel ? { 'shape-rendering': 'crispEdges' } : {}),
    });

    // Track connecting line
    if (pointCount > 1) {
      svg.line(
        tlLeft + pointGap / 2, trackY + trackH / 2,
        tlLeft + (pointCount - 1) * pointGap + pointGap / 2, trackY + trackH / 2,
        { stroke: color, 'stroke-width': 2, opacity: 0.2 },
      );
    }

    // Values at each time point
    for (let p = 0; p < pointCount; p++) {
      const px = tlLeft + p * pointGap + pointGap / 2;
      const val = timePoints[p]!.values[tr] ?? '';
      const cellW = pointGap - 24;

      // Value card
      const cardW = Math.min(cellW, estimateWidth(val, 11) + 24);
      const cardH = 28;
      if (isSketch) {
        svg.path(jitterRect(px - cardW / 2 + 1, trackY + trackH / 2 - cardH / 2 + 1, cardW - 2, cardH - 2, tr * 7 + p * 3), {
          fill: 'none', stroke: t.border, 'stroke-width': t.borderWidth,
        });
      } else if (isPixel) {
        svg.rect(px - cardW / 2, trackY + trackH / 2 - cardH / 2, cardW, cardH, {
          fill: t.surface, rx: 0,
          stroke: color, 'stroke-width': 1,
          'shape-rendering': 'crispEdges',
        });
      } else {
        svg.rect(px - cardW / 2, trackY + trackH / 2 - cardH / 2, cardW, cardH, {
          fill: t.surface, rx: t.borderRadius > 0 ? Math.min(t.borderRadius, 6) : 0,
          stroke: color, 'stroke-width': 1,
        });
      }

      const vFit = fitText(val, cardW - 12, 1, 11);
      svg.text(px, trackY + trackH / 2 + 4, vFit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': vFit.fontSize, 'font-weight': 500, fill: t.text,
        'data-field': `rows[${p}].values[${tr}]`,
      });
    }
  }

  return svg.build();
}
