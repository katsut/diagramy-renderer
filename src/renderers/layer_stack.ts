// Layer stack renderer — horizontal layer bands (architecture diagram style)

import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  drawSketchBackground, drawPixelBackground,
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
  if (style === 'horizontal') return renderHorizontal(data, title, d);
  switch (d.id) {
    case 'sketch': return renderSketch(data, title, d);
    case 'pixel': return renderPixel(data, title, d);
    case 'bold': return renderBold(data, title, d);
    case 'neon': return renderNeon(data, title, d);
    case 'glass': return renderGlass(data, title, d);
    case 'watercolor': return renderWatercolor(data, title, d);
    case 'minimal': return renderMinimal(data, title, d);
    default: return renderClean(data, title, d);
  }
}

// ========== CLEAN (default) ==========

function renderClean(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
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

    svg.beginItem(`layers[${i}]`);

    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface,
      stroke: d.borderWidth > 0 ? d.border : 'none',
      'stroke-width': d.borderWidth,
      rx: d.borderRadius,
      ...d.cardAttrs(),
    });

    svg.rect(pad, y + 4, 6, layerH - 8, { fill: color, rx: 3 });

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);

    svg.endItem();
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.layers.length;
  const layerW = 500;
  const layerH = 70;
  const gap = 8;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Jitter outline for hand-drawn feel
    svg.path(jitterRect(pad, y, layerW, layerH, i * 17), {
      fill: d.surface, stroke: d.border, 'stroke-width': 1.5,
    });

    // Left color accent with jitter line
    svg.path(jitterLine(pad + 3, y + 6, pad + 3, y + layerH - 6, i * 31), {
      stroke: color, 'stroke-width': 3, fill: 'none',
    });

    // Hand-drawn separator between layers
    if (i < count - 1) {
      const sepY = y + layerH + gap / 2;
      svg.path(jitterLine(pad + 20, sepY, pad + layerW - 20, sepY, i * 43), {
        stroke: d.border, 'stroke-width': 0.8, fill: 'none', opacity: 0.4,
      });
    }

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 50 : 0;
  const count = data.layers.length;
  const layerW = 500;
  const layerH = 70;
  const gap = 8;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Pixel-style layer band
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    svg.raw(pixelBorder(pad, y, layerW, layerH, color, 3));

    // Left color block
    svg.rect(pad, y, 8, layerH, {
      fill: color, opacity: 0.8, 'shape-rendering': 'crispEdges',
    });

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== BOLD ==========

function renderBold(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 56 : 0;
  const count = data.layers.length;
  const layerW = 520;
  const layerH = 76;
  const gap = 12;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (bold)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  // Halftone overlay
  svg.rect(0, 0, width, height, { fill: 'url(#halftone)' });
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Bold layer with offset shadow and thick border
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface,
      stroke: d.border,
      'stroke-width': 3,
      rx: d.borderRadius,
      filter: 'url(#bold-offset)',
    });

    // Wide left color accent
    svg.rect(pad, y + 4, 10, layerH - 8, { fill: color, rx: 4 });

    drawLayerContent(svg, d, layer, color, pad + 4, y, layerW - 4, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== NEON ==========

function renderNeon(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerW = 500;
  const layerH = 70;
  const gap = 10;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Neon grid lines
  const contentTop = pad + titleH;
  for (let gx = pad; gx <= pad + layerW; gx += 40) {
    svg.rect(gx, contentTop, 1, totalH, { fill: d.primary, opacity: 0.06 });
  }
  for (let gy = contentTop; gy <= contentTop + totalH; gy += 40) {
    svg.rect(pad, gy, layerW, 1, { fill: d.primary, opacity: 0.06 });
  }

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Neon-glow bordered layer
    svg.rect(pad, y, layerW, layerH, {
      fill: 'rgba(0,0,0,0.3)',
      stroke: color,
      'stroke-width': 1,
      rx: d.borderRadius,
    });
    svg.rect(pad, y, layerW, layerH, {
      fill: 'none',
      stroke: color,
      'stroke-width': 1.5,
      rx: d.borderRadius,
      opacity: 0.3,
      filter: 'url(#neon-glow)',
    });

    // Neon accent line on left
    svg.rect(pad + 2, y + 6, 3, layerH - 12, {
      fill: color, filter: 'url(#neon-glow)',
    });

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== GLASS ==========

function renderGlass(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerW = 510;
  const layerH = 72;
  const gap = 10;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (glass)');
  svg.defs(defs);
  // Gradient dark background
  svg.rect(0, 0, width, height + 24, { fill: 'url(#glass-bg)' });
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Frosted glass layer
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface,
      stroke: d.border,
      'stroke-width': 1,
      rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top highlight line
    svg.rect(pad + 16, y + 1, layerW - 32, 1, { fill: color, opacity: 0.3, rx: 0.5 });

    // Left color accent with glow
    svg.rect(pad + 2, y + 8, 4, layerH - 16, {
      fill: color, rx: 2, opacity: 0.8,
    });
    svg.rect(pad + 2, y + 8, 4, layerH - 16, {
      fill: color, rx: 2, opacity: 0.2, filter: 'url(#shadow)',
    });

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== WATERCOLOR ==========

function renderWatercolor(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const count = data.layers.length;
  const layerW = 510;
  const layerH = 74;
  const gap = 12;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (watercolor)');
  svg.defs(defs);
  // Paper texture background
  svg.rect(0, 0, width, height + 24, { fill: d.bg });
  svg.rect(0, 0, width, height + 24, { fill: d.border, opacity: 0.04, filter: 'url(#watercolor)' });
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Watercolor layer band
    svg.rect(pad, y, layerW, layerH, {
      fill: color, opacity: 0.12, rx: d.borderRadius, filter: 'url(#watercolor)',
    });
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface, opacity: 0.5, rx: d.borderRadius, filter: 'url(#wc-light)',
    });

    // Watercolor left accent
    svg.rect(pad - 2, y + 4, 8, layerH - 8, {
      fill: color, opacity: 0.7, rx: 4, filter: 'url(#watercolor)',
    });

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== MINIMAL ==========

function renderMinimal(data: LayerStackData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 48 : 0;
  const count = data.layers.length;
  const layerW = 500;
  const layerH = 64;
  const gap = 6;
  const totalH = count * layerH + (count - 1) * gap;
  const width = pad * 2 + layerW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Layer stack diagram (minimal)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const layer = data.layers[i]!;
    const color = layerColor(d, i);
    const y = contentTop + i * (layerH + gap);

    svg.beginItem(`layers[${i}]`);

    // Flat layer, no shadow
    svg.rect(pad, y, layerW, layerH, {
      fill: d.surface, rx: d.borderRadius,
    });

    // Accent line only (left)
    svg.rect(pad, y + 4, 3, layerH - 8, { fill: color, rx: 1.5 });

    // Bottom separator line
    if (i < count - 1) {
      svg.rect(pad + 12, y + layerH + gap / 2 - 0.5, layerW - 24, 1, {
        fill: d.border, opacity: 0.3,
      });
    }

    drawLayerContent(svg, d, layer, color, pad, y, layerW, layerH, `layers[${i}]`);
    svg.endItem();
  }

  return svg.build();
}

// ========== HORIZONTAL (style variant, uses current design) ==========

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

    svg.beginItem(`layers[${i}]`);

    // Label
    const cx = x + layerW / 2;
    const labelFit = fitText(layer.label, layerW - 20, 2, d.labelSize);
    let ly = contentTop + 32;
    for (const line of labelFit.lines) {
      svg.text(cx, ly, line, {
        'text-anchor': 'middle', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
        'data-field': `layers[${i}].label`,
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
          'data-field': `layers[${i}].components[${j}]`,
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
          'data-field': `layers[${i}].description`,
        });
        dy -= Math.round(descFit.fontSize * 1.3);
      }
    }

    svg.endItem();
  }

  return svg.build();
}

// ========== SHARED: draw layer label, components, description ==========

function drawLayerContent(
  svg: ReturnType<typeof createDiagramSvg>['svg'],
  d: DesignPreset,
  layer: LayerItem,
  color: string,
  pad: number,
  y: number,
  layerW: number,
  layerH: number,
  dataPath?: string,
): void {
  // Label
  const labelFit = fitText(layer.label, 160, 1, d.labelSize);
  svg.text(pad + 24, y + layerH / 2 + 5, labelFit.lines[0] ?? layer.label, {
    'text-anchor': 'start', 'font-size': labelFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    ...(dataPath ? { 'data-field': `${dataPath}.label` } : {}),
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
        ...(dataPath ? { 'data-field': `${dataPath}.components[${j}]` } : {}),
      });
      tx += compW + 8;
    }
  }

  // Description (right side)
  if (layer.description) {
    const descFit = fitText(layer.description, 120, 1, d.captionSize - 1);
    svg.text(pad + layerW - 12, y + layerH / 2 + 4, descFit.lines[0] ?? layer.description, {
      'text-anchor': 'end', 'font-size': descFit.fontSize, fill: d.textSecondary,
      ...(dataPath ? { 'data-field': `${dataPath}.description` } : {}),
    });
  }
}
