// Swimlane renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface SwimlaneStep {
  label: string;
  description?: string;
}

interface SwimlaneLane {
  actor: string;
  steps: SwimlaneStep[];
}

interface SwimlaneData {
  lanes: SwimlaneLane[];
}

function laneColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderSwimlane(data: SwimlaneData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'vertical') return renderVerticalStyle(data, title, d);
  if (style === 'kanban') return renderKanban(data, title, d);
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

function renderClean(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const laneH = 72;
  const laneGap = 4;
  const actorW = 120;
  const stepW = 110;
  const stepGap = 12;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram',
    buildColorGradients(d, data.lanes.length, 'sl'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Lane background
    svg.rect(pad, y, contentW, laneH, {
      fill: color, opacity: 0.04, rx: d.borderRadius > 8 ? 8 : d.borderRadius,
    });

    // Actor label
    svg.rect(pad, y, actorW, laneH, {
      fill: `url(#sl${li})`, rx: d.borderRadius > 8 ? 8 : d.borderRadius,
      ...d.cardAttrs(),
    });
    const aFit = fitText(lane.actor, actorW - 16, 2, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 4, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: 'white',
    });

    // Separator line
    svg.line(pad + actorW + 8, y + laneH / 2, pad + contentW - 8, y + laneH / 2, {
      stroke: d.border, 'stroke-width': 1, opacity: 0.2, 'stroke-dasharray': '4,4',
    });

    // Steps
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 12 + si * (stepW + stepGap);
      const sy = y + (laneH - 40) / 2;
      drawPresetCard(svg, d, sx, sy, stepW, 40, color);
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 24, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      // Arrow between steps
      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 2;
        svg.path(`M ${ax} ${sy + 20} l 8 0`, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.4,
        });
      }
    }
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const laneH = 68;
  const laneGap = 6;
  const actorW = 110;
  const stepW = 100;
  const stepGap = 14;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const y = pad + titleH + li * (laneH + laneGap);

    // Lane border
    svg.path(jitterRect(pad, y, contentW, laneH, li * 31), {
      fill: 'none', stroke: d.border, 'stroke-width': 1, opacity: 0.2,
    });

    // Actor
    svg.path(jitterRect(pad, y, actorW, laneH, li * 31 + 5), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
    const aFit = fitText(lane.actor, actorW - 16, 1, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 4, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, fill: d.text,
    });

    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 12 + si * (stepW + stepGap);
      const sy = y + (laneH - 36) / 2;
      svg.path(jitterRect(sx, sy, stepW, 36, li * 31 + si * 7), {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5,
      });
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 22, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const laneH = 60;
  const laneGap = 4;
  const actorW = 100;
  const stepW = 90;
  const stepGap = 10;
  const px = 3;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Actor box
    svg.raw(pixelBorder(pad, y, actorW, laneH, color, px));
    svg.rect(pad + px, y + px, actorW - px * 2, laneH - px * 2, {
      fill: color, opacity: 0.3, 'shape-rendering': 'crispEdges',
    });
    const aFit = fitText(lane.actor, actorW - 14, 1, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 4, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: d.text,
    });

    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 10 + si * (stepW + stepGap);
      const sy = y + (laneH - 36) / 2;
      svg.raw(pixelBorder(sx, sy, stepW, 36, d.border, px));
      svg.rect(sx + px, sy + px, stepW - px * 2, 36 - px * 2, {
        fill: d.surface, 'shape-rendering': 'crispEdges',
      });
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize);
      svg.text(sx + stepW / 2, sy + 22, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      });
    }
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: colored actor badges, thick borders, offset shadow on steps

function renderBold(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const laneH = 84;
  const laneGap = 8;
  const actorW = 130;
  const stepW = 120;
  const stepGap = 16;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (bold)',
    buildColorGradients(d, data.lanes.length, 'sl'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Bold actor badge with offset shadow
    svg.rect(pad, y, actorW, laneH, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
      stroke: d.text, 'stroke-width': 2,
    });
    const aFit = fitText(lane.actor, actorW - 20, 2, d.labelSize + 1);
    svg.text(pad + actorW / 2, y + laneH / 2 + 5, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });

    // Steps with thick border
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 16 + si * (stepW + stepGap);
      const sy = y + (laneH - 48) / 2;
      svg.rect(sx, sy, stepW, 48, {
        fill: '#FFFFFF', rx: d.borderRadius,
        stroke: color, 'stroke-width': 3, filter: 'url(#bold-offset)',
      });
      // Step number
      svg.circle(sx + 16, sy + 14, 10, { fill: color });
      svg.text(sx + 16, sy + 18, `${si + 1}`, {
        'text-anchor': 'middle', 'font-size': 10, 'font-weight': 900, fill: '#FFFFFF',
      });
      const fit = fitText(step.label, stepW - 16, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 36, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
      });

      // Arrow
      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 2;
        svg.path(`M ${ax} ${sy + 24} l 10 0 l -4 -4 M ${ax + 10} ${sy + 24} l -4 4`, {
          fill: 'none', stroke: color, 'stroke-width': 2,
        });
      }
    }
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: vertical card layout per lane, no shadows

function renderFlat(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const laneH = 60;
  const laneGap = 4;
  const actorW = 110;
  const stepW = 100;
  const stepGap = 8;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Full row background
    svg.rect(pad, y, contentW, laneH, { fill: d.surface, rx: d.borderRadius });
    // Left color strip
    svg.rect(pad, y + 4, 4, laneH - 8, { fill: color, rx: 2 });

    // Actor circle + label
    svg.circle(pad + 24, y + laneH / 2, 14, { fill: color });
    svg.text(pad + 24, y + laneH / 2 + 5, lane.actor.charAt(0).toUpperCase(), {
      'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, fill: '#FFFFFF',
    });
    const aFit = fitText(lane.actor, actorW - 52, 1, d.labelSize);
    svg.text(pad + 44, y + laneH / 2 + 4, aFit.lines[0]!, {
      'text-anchor': 'start', 'font-size': aFit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Flat steps (no shadow, no border)
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 8 + si * (stepW + stepGap);
      const sy = y + (laneH - 36) / 2;
      svg.rect(sx, sy, stepW, 36, { fill: color, opacity: 0.12, rx: d.borderRadius });
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 22, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 1;
        svg.path(`M ${ax} ${sy + 18} l 5 0`, {
          fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.4,
        });
      }
    }
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass lanes, glow effects

function renderGlass(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const laneH = 80;
  const laneGap = 8;
  const actorW = 130;
  const stepW = 120;
  const stepGap = 16;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (glass)',
    buildColorGradients(d, data.lanes.length, 'sl'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Frosted glass lane background
    svg.rect(pad, y, contentW, laneH, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(pad + 16, y + 1, contentW - 32, 1, { fill: color, opacity: 0.3, rx: 0.5 });

    // Actor with glow
    svg.circle(pad + actorW / 2, y + laneH / 2, 24, { fill: color, opacity: 0.1 });
    svg.circle(pad + actorW / 2, y + laneH / 2, 18, {
      fill: color, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
    });
    const aFit = fitText(lane.actor, actorW - 20, 1, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 5, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
    });

    // Glass steps
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 12 + si * (stepW + stepGap);
      const sy = y + (laneH - 44) / 2;
      svg.rect(sx, sy, stepW, 44, {
        fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: 6,
        ...d.cardAttrs(),
      });
      svg.rect(sx + 8, sy + 1, stepW - 16, 1, { fill: color, opacity: 0.3, rx: 0.5 });
      const fit = fitText(step.label, stepW - 16, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 26, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 2;
        svg.path(`M ${ax} ${sy + 22} l 10 0`, {
          fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3,
        });
      }
    }
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outlines, glow effects

function renderNeon(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const laneH = 76;
  const laneGap = 6;
  const actorW = 120;
  const stepW = 110;
  const stepGap = 14;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Neon lane border
    svg.rect(pad, y, contentW, laneH, {
      fill: 'rgba(0,0,0,0.3)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    svg.rect(pad, y, contentW, laneH, {
      fill: 'none', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
      opacity: 0.2, filter: 'url(#neon-glow)',
    });

    // Actor with neon outline
    svg.circle(pad + actorW / 2, y + laneH / 2, 20, {
      fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)',
    });
    const aFit = fitText(lane.actor, actorW - 24, 1, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 4, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: color,
    });

    // Neon step boxes
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 12 + si * (stepW + stepGap);
      const sy = y + (laneH - 40) / 2;
      svg.rect(sx, sy, stepW, 40, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: 4,
      });
      svg.rect(sx, sy, stepW, 40, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 4,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 24, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 2;
        svg.path(`M ${ax} ${sy + 20} l 8 0`, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.6,
          filter: 'url(#neon-glow)',
        });
      }
    }
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const laneH = 78;
  const laneGap = 10;
  const actorW = 130;
  const stepW = 110;
  const stepGap = 16;
  const maxSteps = Math.max(...data.lanes.map(l => l.steps.length), 1);
  const contentW = actorW + maxSteps * (stepW + stepGap);
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + data.lanes.length * (laneH + laneGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (watercolor)',
    buildColorGradients(d, data.lanes.length, 'sl'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  for (let li = 0; li < data.lanes.length; li++) {
    const lane = data.lanes[li]!;
    const color = laneColor(d, li);
    const y = pad + titleH + li * (laneH + laneGap);

    // Watercolor wash behind lane
    svg.ellipse(pad + contentW / 2, y + laneH / 2, contentW / 2 + 10, laneH / 2 + 4, {
      fill: color, opacity: 0.06, filter: 'url(#watercolor)',
    });

    // Soft lane background
    svg.rect(pad, y, contentW, laneH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });

    // Actor watercolor circle
    svg.circle(pad + actorW / 2, y + laneH / 2, 22, {
      fill: color, opacity: 0.7, filter: 'url(#watercolor)',
    });
    const aFit = fitText(lane.actor, actorW - 20, 1, d.labelSize);
    svg.text(pad + actorW / 2, y + laneH / 2 + 5, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 600, fill: d.text,
    });

    // Watercolor steps
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sx = pad + actorW + 12 + si * (stepW + stepGap);
      const sy = y + (laneH - 40) / 2;
      svg.ellipse(sx + stepW / 2, sy + 20, stepW / 2 + 4, 24, {
        fill: color, opacity: 0.12, filter: 'url(#watercolor)',
      });
      svg.rect(sx, sy, stepW, 40, {
        fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
      });
      const fit = fitText(step.label, stepW - 12, 1, d.captionSize + 1);
      svg.text(sx + stepW / 2, sy + 24, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      if (si < lane.steps.length - 1) {
        const ax = sx + stepW + 2;
        svg.path(`M ${ax} ${sy + 20} l 10 0`, {
          fill: 'none', stroke: color, 'stroke-width': 1, opacity: 0.3,
        });
      }
    }
  }

  return svg.build();
}

// ========== VERTICAL (style) ==========
// Actors as column headers, steps flow top to bottom within each column

function renderVerticalStyle(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const headerH = 48;
  const colW = 150;
  const colGap = 12;
  const stepH = 44;
  const stepGap = 10;
  const lanes = data.lanes;
  const maxSteps = Math.max(...lanes.map(l => l.steps.length), 1);
  const contentW = lanes.length * colW + (lanes.length - 1) * colGap;
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + headerH + maxSteps * (stepH + stepGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane diagram (vertical)',
    buildColorGradients(d, lanes.length, 'sl'));
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

  for (let li = 0; li < lanes.length; li++) {
    const lane = lanes[li]!;
    const color = laneColor(d, li);
    const x = pad + li * (colW + colGap);
    const cx = x + colW / 2;

    // Column header
    svg.rect(x, contentTop, colW, headerH, {
      fill: `url(#sl${li})`, rx: d.borderRadius > 8 ? 8 : d.borderRadius,
      ...d.cardAttrs(),
    });
    const aFit = fitText(lane.actor, colW - 16, 1, d.labelSize);
    svg.text(cx, contentTop + headerH / 2 + 5, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: 'white',
    });

    // Column background stripe
    svg.rect(x, contentTop + headerH, colW, maxSteps * (stepH + stepGap), {
      fill: color, opacity: 0.03, rx: d.borderRadius > 8 ? 8 : d.borderRadius,
    });

    // Steps flowing downward
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sy = contentTop + headerH + 8 + si * (stepH + stepGap);
      drawPresetCard(svg, d, x + 8, sy, colW - 16, stepH, color);
      const fit = fitText(step.label, colW - 32, 1, d.captionSize + 1);
      svg.text(cx, sy + stepH / 2 + 4, fit.lines[0]!, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });

      // Down arrow between steps
      if (si < lane.steps.length - 1) {
        const ay = sy + stepH + 2;
        svg.path(`M ${cx} ${ay} l 0 ${stepGap - 4}`, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.4,
        });
        svg.path(`M ${cx - 4} ${ay + stepGap - 8} l 4 4 l 4 -4`, {
          fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.4,
        });
      }
    }
  }

  return svg.build();
}

// ========== KANBAN ==========
// Kanban board: actors as column headers, action cards stacked vertically in each column

function renderKanban(data: SwimlaneData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const headerH = 44;
  const colW = 180;
  const colGap = 10;
  const cardH = 48;
  const cardGap = 8;
  const lanes = data.lanes;
  const maxSteps = Math.max(...lanes.map(l => l.steps.length), 1);
  const contentW = lanes.length * colW + (lanes.length - 1) * colGap;
  const bodyH = maxSteps * (cardH + cardGap) + 16;
  const width = pad * 2 + contentW;
  const height = pad * 2 + titleH + headerH + bodyH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Swimlane (kanban)',
    buildColorGradients(d, lanes.length, 'sl'));
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

  for (let li = 0; li < lanes.length; li++) {
    const lane = lanes[li]!;
    const color = laneColor(d, li);
    const x = pad + li * (colW + colGap);
    const cx = x + colW / 2;

    // Column background
    svg.rect(x, contentTop, colW, headerH + bodyH, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.5,
    });
    svg.rect(x, contentTop, colW, headerH + bodyH, {
      fill: 'none', stroke: d.border, 'stroke-width': 1, rx: d.borderRadius, opacity: 0.3,
    });

    // Header
    svg.rect(x + 1, contentTop + 1, colW - 2, headerH - 1, {
      fill: `url(#sl${li})`, rx: d.borderRadius > 4 ? 4 : d.borderRadius,
    });
    const aFit = fitText(lane.actor, colW - 40, 1, d.labelSize);
    svg.text(cx, contentTop + headerH / 2 + 5, aFit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': aFit.fontSize, 'font-weight': 700, fill: 'white',
    });
    // Count badge
    svg.text(x + colW - 14, contentTop + headerH / 2 + 4, `${lane.steps.length}`, {
      'text-anchor': 'middle', 'font-size': 10, fill: 'rgba(255,255,255,0.7)',
    });

    // Cards
    for (let si = 0; si < lane.steps.length; si++) {
      const step = lane.steps[si]!;
      const sy = contentTop + headerH + 8 + si * (cardH + cardGap);
      drawPresetCard(svg, d, x + 8, sy, colW - 16, cardH, color);
      // Color dot
      svg.circle(x + 20, sy + 14, 4, { fill: color, opacity: 0.6 });
      const fit = fitText(step.label, colW - 44, 1, d.captionSize + 1);
      svg.text(x + 30, sy + 18, fit.lines[0]!, {
        'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      if (step.description) {
        const dfit = fitText(step.description, colW - 36, 1, d.captionSize);
        svg.text(x + 20, sy + 36, dfit.lines[0]!, {
          'text-anchor': 'start', 'font-size': dfit.fontSize, fill: d.textSecondary,
        });
      }
    }
  }

  return svg.build();
}
