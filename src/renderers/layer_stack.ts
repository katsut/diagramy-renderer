// Layer stack renderer — horizontal layer bands (architecture diagram style)

import { getDesign, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
} from '../shared/render-utils.js';

interface LayerItem {
  label: string;
  components?: string[];
  description?: string;
}

interface LayerStackData {
  layers: LayerItem[];
}

function layerColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderLayerStack(data: LayerStackData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'horizontal': return renderHorizontal(data, title, d);
    default: return renderVertical(data, title, d);
  }
}

// ========== VERTICAL (default, top→bottom) ==========

function renderVertical(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.layers.length;
  const layerW = 500;
  const layerH = 70;
  const gap = 8;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    // Layer band
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface,
      stroke: d.borderWidth > 0 ? d.border : 'none',
      'stroke-width': d.borderWidth,
      rx: d.borderRadius,
      ...d.cardAttrs(),
    });

    // Left color accent
    svg.rect(pad, y + 4, 6, layerH - 8, { fill: color, rx: 3 });

    // Label
    const labelFit = fitText(layer.label, 160, 1, d.labelSize);
    svg.text(pad + 24, y + layerH / 2 + 5, labelFit.lines[0] ?? layer.label, {
      'text-anchor': 'start', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Components as tags
    if (layer.components && layer.components.length > 0) {
      const tagStartX = pad + 190;
      let tx = tagStartX;
      for (let j = 0; j < layer.components.length; j++) {
        const comp = layer.components[j]!;
        const compW = estimateWidth(comp, d.captionSize - 1) + 16;
        if (tx + compW > pad + layerW - 10) break;

        svg.rect(tx, y + layerH / 2 - 12, compW, 24, {
          fill: color, opacity: 0.12, rx: 4,
        });
        svg.rect(tx, y + layerH / 2 - 12, compW, 24, {
          fill: 'none', stroke: color, 'stroke-width': 0.5, rx: 4, opacity: 0.4,
        });
        svg.text(tx + compW / 2, y + layerH / 2 + 4, comp, {
          'text-anchor': 'middle', 'font-size': d.captionSize - 1, fill: d.text,
        });
        tx += compW + 8;
      }
    }

    // Description (right side)
    if (layer.description) {
      const descFit = fitText(layer.description, 120, 1, d.captionSize - 1);
      svg.text(pad + layerW - 12, y + layerH / 2 + 4, descFit.lines[0] ?? layer.description, {
        'text-anchor': 'end', 'font-size': descFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== HORIZONTAL (left→right) ==========

function renderHorizontal(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.layers.length;
  const layerW = 160;
  const layerH = 280;
  const gap = 8;
  const totalW = count * layerW + (count - 1) * gap;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + layerH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (horizontal)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const x = pad + i * (layerW + gap);

    // Layer column
    svg.rect(x, contentTop, layerW, layerH, {
      fill: d.surface,
      stroke: d.borderWidth > 0 ? d.border : 'none',
      'stroke-width': d.borderWidth,
      rx: d.borderRadius,
      ...d.cardAttrs(),
    });

    // Top color accent
    svg.rect(x + 4, contentTop, layerW - 8, 6, { fill: color, rx: 3 });

    // Label
    const cx = x + layerW / 2;
    const labelFit = fitText(layer.label, layerW - 20, 2, d.labelSize);
    let ly = contentTop + 32;
    for (const line of labelFit.lines) {
      svg.text(cx, ly, line, {
        'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      ly += Math.round(labelFit.fontSize * 1.4);
    }

    // Components as stacked tags
    if (layer.components && layer.components.length > 0) {
      let ty = ly + 12;
      for (let j = 0; j < layer.components.length && ty < contentTop + layerH - 40; j++) {
        const comp = layer.components[j]!;
        const compW = Math.min(estimateWidth(comp, d.captionSize - 1) + 16, layerW - 20);

        svg.rect(cx - compW / 2, ty - 10, compW, 22, {
          fill: color, opacity: 0.12, rx: 4,
        });
        svg.rect(cx - compW / 2, ty - 10, compW, 22, {
          fill: 'none', stroke: color, 'stroke-width': 0.5, rx: 4, opacity: 0.4,
        });
        svg.text(cx, ty + 4, comp, {
          'text-anchor': 'middle', 'font-size': d.captionSize - 1, fill: d.text,
        });
        ty += 30;
      }
    }

    // Description at bottom
    if (layer.description) {
      const descFit = fitText(layer.description, layerW - 20, 2, d.captionSize - 1);
      let dy = contentTop + layerH - 20;
      for (let k = descFit.lines.length - 1; k >= 0; k--) {
        svg.text(cx, dy, descFit.lines[k]!, {
          'text-anchor': 'middle', 'font-size': descFit.fontSize, fill: d.textSecondary,
        });
        dy -= Math.round(descFit.fontSize * 1.3);
      }
    }
  }

  return svg.build();
}
