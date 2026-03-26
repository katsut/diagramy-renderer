// Roadmap renderer — phased horizontal lanes with milestones

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface RoadmapPhase {
  label: string;
  items: string[];
}

interface RoadmapData {
  phases: RoadmapPhase[];
}

export function renderRoadmap(data: RoadmapData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'vertical') return renderVerticalStyle(data, title, d);
  if (style === 'timeline_cards') return renderTimelineCards(data, title, d);
  switch (d.id) {
    case 'sketch': return renderSketch(data, title, d);
    case 'pixel': return renderPixel(data, title, d);
    case 'bold': return renderBold(data, title, d);
    case 'flat': return renderFlat(data, title, d);
    case 'glass': return renderGlass(data, title, d);
    case 'neon': return renderNeon(data, title, d);
    case 'watercolor': return renderWatercolor(data, title, d);
    default: return renderClean(data, title, d);
  }
}

function phaseColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// --- Layout ---

interface RoadmapLayout {
  width: number;
  height: number;
  contentTop: number;
  pad: number;
  phaseW: number;
  phaseGap: number;
  laneH: number;
  count: number;
}

function computeLayout(data: RoadmapData, hasTitle: boolean, phaseW: number, phaseGap: number, pad: number): RoadmapLayout {
  const titleH = hasTitle ? 44 : 0;
  const contentTop = pad + titleH;
  const count = data.phases.length;
  const maxItems = Math.max(...data.phases.map(p => p.items.length), 1);
  const laneH = 60 + maxItems * 22;
  const width = pad * 2 + count * phaseW + (count - 1) * phaseGap;
  const height = contentTop + laneH + pad;
  return { width, height, contentTop, pad, phaseW, phaseGap, laneH, count };
}

// ========== CLEAN ==========

function renderClean(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 200, 16, 40);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap',
    buildColorGradients(d, lay.count, 'rg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Connector line
  const lineY = lay.contentTop + 24;
  svg.line(lay.pad + 20, lineY, lay.width - lay.pad - 20, lineY, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.4,
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Phase card
    drawPresetCard(svg, d, x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, color);

    // Milestone dot on connector
    svg.circle(cx, lineY, 8, { fill: `url(#rg${i})`, stroke: d.bg, 'stroke-width': 2 });
    svg.text(cx, lineY + 3, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: 'white',
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 62, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 82 + j * 22;
      svg.circle(x + 20, itemY, 3, { fill: color, opacity: 0.6 });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 40, 1, d.captionSize);
      svg.text(x + 28, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: colored cards, offset shadow, large phase numbers

function renderBold(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 220, 20, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (bold)',
    buildColorGradients(d, lay.count, 'rg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Connector line (thick)
  const lineY = lay.contentTop + 28;
  svg.line(lay.pad + 24, lineY, lay.width - lay.pad - 24, lineY, {
    stroke: d.border, 'stroke-width': 4, opacity: 0.3,
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Colored card with offset shadow
    svg.rect(x, lay.contentTop + 48, lay.phaseW, lay.laneH - 52, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    // White inner area
    svg.rect(x + 4, lay.contentTop + 88, lay.phaseW - 8, lay.laneH - 96, {
      fill: '#FFFFFF', rx: d.borderRadius - 2,
    });

    // Large milestone number on connector
    svg.circle(cx, lineY, 16, { fill: color, filter: 'url(#bold-offset)' });
    svg.text(cx, lineY + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Phase label in colored area
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize + 2);
    svg.text(cx, lay.contentTop + 74, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Items in white area
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 104 + j * 22;
      svg.rect(x + 14, itemY - 2, 6, 6, { fill: color, rx: 1 });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 44, 1, d.captionSize);
      svg.text(x + 26, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: vertical card stack with left color strips, no shadows

function renderFlat(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const count = data.phases.length;
  const cardW = 420;
  const maxItems = Math.max(...data.phases.map(p => p.items.length), 1);
  const cardH = 40 + maxItems * 20;
  const gap = 8;
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + count * (cardH + gap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Roadmap (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;

  for (let i = 0; i < count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const y = contentTop + i * (cardH + gap);

    // Flat card
    svg.rect(pad, y, cardW, cardH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, cardH - 8, { fill: color, rx: 2 });
    // Phase number circle
    svg.circle(pad + 28, y + 22, 12, { fill: color });
    svg.text(pad + 28, y + 26, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: '#FFFFFF',
    });
    // Phase label
    const fit = fitText(phase.label, 160, 1, d.labelSize);
    svg.text(pad + 48, y + 26, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });
    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = y + 44 + j * 20;
      svg.rect(pad + 48, itemY, 4, 4, { fill: color, opacity: 0.4, rx: 1 });
      const itemFit = fitText(phase.items[j]!, cardW - 80, 1, d.captionSize);
      svg.text(pad + 60, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass cards, glow connector

function renderGlass(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 220, 24, 48);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (glass)',
    buildColorGradients(d, lay.count, 'rg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Connector line with glow
  const lineY = lay.contentTop + 24;
  svg.line(lay.pad + 24, lineY, lay.width - lay.pad - 24, lineY, {
    stroke: d.primary, 'stroke-width': 2, opacity: 0.15, filter: 'url(#shadow)',
  });
  svg.line(lay.pad + 24, lineY, lay.width - lay.pad - 24, lineY, {
    stroke: d.border, 'stroke-width': 1, opacity: 0.3,
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Glow behind card
    svg.rect(x + 4, lay.contentTop + 44, lay.phaseW - 8, lay.laneH - 48, {
      fill: color, opacity: 0.06, rx: d.borderRadius, filter: 'url(#shadow)',
    });
    // Frosted glass card
    svg.rect(x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(x + 20, lay.contentTop + 41, lay.phaseW - 40, 1, { fill: color, opacity: 0.4, rx: 0.5 });

    // Milestone dot with glow
    svg.circle(cx, lineY, 10, { fill: color, opacity: 0.1 });
    svg.circle(cx, lineY, 6, { fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1 });
    svg.text(cx, lineY + 3, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 8, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 62, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      'letter-spacing': '0.3',
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 82 + j * 22;
      svg.circle(x + 20, itemY, 2, { fill: color, opacity: 0.5 });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 40, 1, d.captionSize);
      svg.text(x + 28, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outlines, glow connector

function renderNeon(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 210, 20, 44);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Neon connector line
  const lineY = lay.contentTop + 24;
  svg.line(lay.pad + 20, lineY, lay.width - lay.pad - 20, lineY, {
    stroke: d.primary, 'stroke-width': 1, opacity: 0.4,
  });
  svg.line(lay.pad + 20, lineY, lay.width - lay.pad - 20, lineY, {
    stroke: d.primary, 'stroke-width': 2, opacity: 0.15, filter: 'url(#neon-glow)',
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Dark card with neon border
    svg.rect(x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    // Glow border
    svg.rect(x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });

    // Neon milestone dot
    svg.circle(cx, lineY, 8, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.text(cx, lineY + 3, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, 'font-weight': 700, fill: color,
    });

    // Phase number tag
    svg.text(cx + lay.phaseW / 2 - 18, lay.contentTop + 52, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 68, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 88 + j * 22;
      svg.rect(x + 16, itemY, 4, 1, { fill: color, opacity: 0.5 });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 40, 1, d.captionSize);
      svg.text(x + 24, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 210, 28, 48);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (watercolor)',
    buildColorGradients(d, lay.count, 'rg'));
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Watercolor connector line
  const lineY = lay.contentTop + 24;
  svg.line(lay.pad + 20, lineY, lay.width - lay.pad - 20, lineY, {
    stroke: d.border, 'stroke-width': 2, opacity: 0.3, filter: 'url(#watercolor)',
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Watercolor wash blob behind card
    svg.ellipse(cx, lay.contentTop + 40 + (lay.laneH - 44) / 2, lay.phaseW / 2 + 10, (lay.laneH - 44) / 2 + 8, {
      fill: color, opacity: 0.12, filter: 'url(#watercolor)',
    });
    // Soft card
    svg.rect(x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });

    // Watercolor milestone dot
    svg.circle(cx, lineY, 10, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(cx, lineY + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: d.text,
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 62, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 82 + j * 22;
      svg.circle(x + 20, itemY, 3, { fill: color, opacity: 0.5, filter: 'url(#watercolor)' });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 40, 1, d.captionSize);
      svg.text(x + 28, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, 190, 20, 40);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Connector line (hand-drawn)
  const lineY = lay.contentTop + 24;
  svg.path(jitterLine(lay.pad + 20, lineY, lay.width - lay.pad - 20, lineY, 77), {
    fill: 'none', stroke: d.border, 'stroke-width': 1.5,
  });

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Phase card (hand-drawn)
    svg.path(jitterRect(x, lay.contentTop + 40, lay.phaseW, lay.laneH - 44, i * 9), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });

    // Milestone dot
    svg.circle(cx, lineY, 6, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(cx, lineY + 3, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, fill: d.text,
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 24, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 60, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Items with dash markers
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 80 + j * 22;
      svg.text(x + 16, itemY + 4, '-', {
        'text-anchor': 'middle', 'font-size': d.captionSize, fill: d.text,
      });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 36, 1, d.captionSize);
      svg.text(x + 24, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const lay = computeLayout(data, !!title, 170, 12, 36);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Roadmap (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Connector line (pixel)
  const lineY = lay.contentTop + 24;
  for (let lx = lay.pad + 16; lx < lay.width - lay.pad - 16; lx += px) {
    svg.rect(lx, lineY - 1, px, px, { fill: d.border, opacity: 0.5, 'shape-rendering': 'crispEdges' });
  }

  for (let i = 0; i < lay.count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const x = lay.pad + i * (lay.phaseW + lay.phaseGap);
    const cx = x + lay.phaseW / 2;

    // Phase card (pixel border)
    const cardY = lay.contentTop + 38;
    const cardH = lay.laneH - 42;
    svg.raw(pixelBorder(x, cardY, lay.phaseW, cardH, color, px));
    svg.rect(x + px, cardY + px, lay.phaseW - px * 2, cardH - px * 2, {
      fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
    });

    // Color header strip
    svg.rect(x + px, cardY + px, lay.phaseW - px * 2, px * 2, {
      fill: color, 'shape-rendering': 'crispEdges',
    });

    // Milestone dot (pixel square)
    svg.rect(cx - px * 2, lineY - px * 2, px * 4, px * 4, {
      fill: color, 'shape-rendering': 'crispEdges',
    });

    // Phase label
    const fit = fitText(phase.label, lay.phaseW - 20, 1, d.labelSize);
    svg.text(cx, lay.contentTop + 60, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = lay.contentTop + 78 + j * 22;
      svg.rect(x + px * 4, itemY, px * 2, px * 2, {
        fill: color, 'shape-rendering': 'crispEdges',
      });
      const itemFit = fitText(phase.items[j]!, lay.phaseW - 32, 1, d.captionSize);
      svg.text(x + px * 4 + 10, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== VERTICAL (style) ==========
// Phases stacked top to bottom, each with a colored header bar and items below

function renderVerticalStyle(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const count = data.phases.length;
  const cardW = 420;
  const headerH = 40;
  const itemH = 22;
  const phaseGap = 16;
  const arrowH = 20;

  const phaseHeights = data.phases.map(p => headerH + Math.max(p.items.length, 1) * itemH + 12);
  const totalH = phaseHeights.reduce((s, h) => s + h, 0) + (count - 1) * (phaseGap + arrowH);
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + totalH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Roadmap (vertical)',
    buildColorGradients(d, count, 'rg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const cx = pad + cardW / 2;
  let curY = contentTop;

  for (let i = 0; i < count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const phaseH = phaseHeights[i]!;

    // Phase card
    drawPresetCard(svg, d, pad, curY, cardW, phaseH, color);

    // Colored header bar
    svg.rect(pad + 1, curY + 1, cardW - 2, headerH, {
      fill: `url(#rg${i})`, rx: d.borderRadius > 4 ? 4 : d.borderRadius,
    });

    // Phase number
    svg.circle(pad + 28, curY + headerH / 2, 12, { fill: 'rgba(255,255,255,0.3)' });
    svg.text(pad + 28, curY + headerH / 2 + 4, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 11, 'font-weight': 700, fill: 'white',
    });

    // Phase label
    const fit = fitText(phase.label, cardW - 80, 1, d.labelSize);
    svg.text(pad + 48, curY + headerH / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': 700, fill: 'white',
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = curY + headerH + 8 + j * itemH;
      svg.circle(pad + 24, itemY + 4, 3, { fill: color, opacity: 0.6 });
      const itemFit = fitText(phase.items[j]!, cardW - 56, 1, d.captionSize);
      svg.text(pad + 34, itemY + 8, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }

    // Down arrow between phases
    if (i < count - 1) {
      const ay1 = curY + phaseH + 4;
      const ay2 = ay1 + arrowH - 4;
      svg.path(`M ${cx} ${ay1} L ${cx} ${ay2}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 2, opacity: 0.4,
      });
      svg.path(`M ${cx - 5} ${ay2 - 5} L ${cx} ${ay2} L ${cx + 5} ${ay2 - 5}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 2, opacity: 0.4,
      });
    }

    curY += phaseH + phaseGap + arrowH;
  }

  return svg.build();
}

// ========== TIMELINE CARDS ==========
// Cards on a horizontal timeline bar, alternating above/below the line

function renderTimelineCards(data: RoadmapData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.phases.length;
  const cardW = 160;
  const cardGap = 20;
  const maxItems = Math.max(...data.phases.map(p => p.items.length), 1);
  const cardH = 36 + maxItems * 18;
  const lineY = pad + titleH + cardH + 40;
  const totalW = count * (cardW + cardGap) - cardGap;
  const width = pad * 2 + totalW;
  const height = lineY + cardH + 60;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Roadmap (timeline cards)',
    buildColorGradients(d, count, 'rg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Timeline bar
  svg.line(pad + 10, lineY, width - pad - 10, lineY, {
    stroke: d.border, 'stroke-width': 3, opacity: 0.3, 'stroke-linecap': 'round',
  });

  for (let i = 0; i < count; i++) {
    const phase = data.phases[i]!;
    const color = phaseColor(d, i);
    const cx = pad + i * (cardW + cardGap) + cardW / 2;
    const isAbove = i % 2 === 0;

    // Dot on timeline
    svg.circle(cx, lineY, 7, { fill: `url(#rg${i})`, stroke: d.bg, 'stroke-width': 2 });

    // Connector line from dot to card
    const connLen = 28;
    const cardY = isAbove ? lineY - connLen - cardH : lineY + connLen;
    const connEnd = isAbove ? cardY + cardH : cardY;

    svg.line(cx, lineY + (isAbove ? -8 : 8), cx, connEnd, {
      stroke: color, 'stroke-width': 1.5, opacity: 0.4, 'stroke-dasharray': '4,3',
    });

    // Card
    drawPresetCard(svg, d, cx - cardW / 2, cardY, cardW, cardH, color);

    // Phase label
    const fit = fitText(phase.label, cardW - 20, 1, d.labelSize);
    svg.text(cx, cardY + 22, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: color,
    });

    // Items
    for (let j = 0; j < phase.items.length; j++) {
      const itemY = cardY + 36 + j * 18;
      svg.circle(cx - cardW / 2 + 16, itemY, 2, { fill: color, opacity: 0.5 });
      const itemFit = fitText(phase.items[j]!, cardW - 36, 1, d.captionSize);
      svg.text(cx - cardW / 2 + 24, itemY + 4, itemFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': itemFit.fontSize, fill: d.textSecondary,
      });
    }
  }

  return svg.build();
}
