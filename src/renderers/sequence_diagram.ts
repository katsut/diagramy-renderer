// Sequence diagram renderer — UML-style actor lifelines with message arrows

import { getDesign, jitterRect, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import { escapeXml } from '../shared/svg.js';
import {
  createDiagramSvg, drawBackground, drawTitle, ensureTitleFits,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
} from '../shared/render-utils.js';

interface SequenceMessage {
  from: number;
  to: number;
  label: string;
}

interface SequenceDiagramData {
  actors: string[];
  messages: SequenceMessage[];
}

function actorColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

// --- Shared layout helpers ---

interface SeqLayout {
  pad: number;
  titleH: number;
  actorW: number;
  actorH: number;
  spacing: number;
  msgGap: number;
  selfLoopW: number;
  width: number;
  height: number;
  actorXs: number[];
}

function computeLayout(
  data: SequenceDiagramData, hasTitle: boolean, d: DesignPreset,
  padOverride?: number, actorWOverride?: number,
): SeqLayout {
  const pad = padOverride ?? 48;
  const titleH = hasTitle ? 44 : 0;
  const actorH = 36;
  const msgGap = 48;
  const selfLoopW = 40;

  const actorCount = data.actors.length;
  // Compute actor box width adaptively
  const maxActorLabel = Math.max(...data.actors.map(a => estimateWidth(a, d.labelSize)), 60);
  const actorW = actorWOverride ?? Math.min(Math.max(maxActorLabel + 24, 100), 180);

  // Spacing between actor centers
  const minSpacing = actorW + 40;
  // Check message labels for width
  const maxMsgLabel = data.messages.length > 0
    ? Math.max(...data.messages.map(m => estimateWidth(m.label, d.captionSize)))
    : 60;
  const spacing = Math.max(minSpacing, maxMsgLabel + 40);

  const contentW = (actorCount - 1) * spacing + actorW;
  const width = Math.max(pad * 2 + contentW, 300);
  const lifelineTop = pad + titleH + actorH + 16;
  const height = lifelineTop + data.messages.length * msgGap + 40;

  // Actor center X positions
  const startX = pad + actorW / 2;
  const actorXs = data.actors.map((_, i) => startX + i * spacing);

  return { pad, titleH, actorW, actorH, spacing, msgGap, selfLoopW, width, height, actorXs };
}

function drawActorBoxes(
  svg: any, d: DesignPreset, data: SequenceDiagramData, lay: SeqLayout,
  boxAttrs: (i: number) => Record<string, string | number>,
  textAttrs: () => Record<string, string | number>,
): void {
  const { pad, titleH, actorW, actorH, actorXs } = lay;
  const y = pad + titleH;

  for (let i = 0; i < data.actors.length; i++) {
    const cx = actorXs[i]!;
    const x = cx - actorW / 2;
    svg.beginItem(`actors[${i}]`);
    svg.rect(x, y, actorW, actorH, boxAttrs(i));
    const fit = fitText(data.actors[i]!, actorW - 12, actorH, d.labelSize);
    svg.text(cx, y + actorH / 2 + fit.fontSize * 0.35, fit.lines[0] ?? '', {
      'text-anchor': 'middle',
      'font-size': fit.fontSize,
      'font-weight': d.fontWeight,
      'data-field': `actors[${i}]`,
      ...textAttrs(),
    });
    svg.endItem();
  }
}

function drawLifelines(
  svg: any, d: DesignPreset, data: SequenceDiagramData, lay: SeqLayout,
  strokeColor: string, strokeAttrs?: Record<string, string | number>,
): void {
  const { pad, titleH, actorH, actorXs, msgGap, height } = lay;
  const top = pad + titleH + actorH + 16;
  const bottom = height - 16;

  for (let i = 0; i < data.actors.length; i++) {
    const cx = actorXs[i]!;
    svg.line(cx, top - 8, cx, bottom, {
      stroke: strokeColor,
      'stroke-width': 1,
      'stroke-dasharray': '6,4',
      opacity: 0.5,
      ...strokeAttrs,
    });
  }
}

function drawMessages(
  svg: any, d: DesignPreset, data: SequenceDiagramData, lay: SeqLayout,
  arrowColor: (i: number) => string,
  labelColor: string,
  arrowAttrs?: Record<string, string | number>,
): void {
  const { pad, titleH, actorH, actorXs, msgGap, selfLoopW } = lay;
  const startY = pad + titleH + actorH + 16;

  for (let mi = 0; mi < data.messages.length; mi++) {
    const msg = data.messages[mi]!;
    const fromIdx = Math.min(msg.from, data.actors.length - 1);
    const toIdx = Math.min(msg.to, data.actors.length - 1);
    const y = startY + mi * msgGap + msgGap / 2;
    const color = arrowColor(mi);

    svg.beginItem(`messages[${mi}]`);

    if (fromIdx === toIdx) {
      // Self-message: loop on the right side
      const cx = actorXs[fromIdx]!;
      const loopR = selfLoopW;
      svg.path(
        `M ${cx} ${y} C ${cx + loopR} ${y} ${cx + loopR} ${y + 24} ${cx} ${y + 24}`,
        {
          fill: 'none',
          stroke: color,
          'stroke-width': 2,
          ...arrowAttrs,
        },
      );
      // Arrowhead at end
      drawArrowhead(svg, cx + 4, y + 24, cx, y + 24, color);
      // Label
      svg.text(cx + loopR + 6, y + 14, msg.label, {
        'font-size': d.captionSize,
        fill: labelColor,
        'dominant-baseline': 'middle',
      });
    } else {
      const x1 = actorXs[fromIdx]!;
      const x2 = actorXs[toIdx]!;
      // Arrow line
      svg.line(x1, y, x2, y, {
        stroke: color,
        'stroke-width': 2,
        ...arrowAttrs,
      });
      // Arrowhead
      drawArrowhead(svg, x1, y, x2, y, color);
      // Label above the arrow
      const midX = (x1 + x2) / 2;
      svg.text(midX, y - 8, msg.label, {
        'text-anchor': 'middle',
        'font-size': d.captionSize,
        fill: labelColor,
      });
    }

    svg.endItem();
  }
}

function drawArrowhead(svg: any, fromX: number, fromY: number, toX: number, toY: number, color: string): void {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const headLen = 8;
  const x1 = toX - headLen * Math.cos(angle - Math.PI / 6);
  const y1 = toY - headLen * Math.sin(angle - Math.PI / 6);
  const x2 = toX - headLen * Math.cos(angle + Math.PI / 6);
  const y2 = toY - headLen * Math.sin(angle + Math.PI / 6);
  svg.polygon(`${toX},${toY} ${x1},${y1} ${x2},${y2}`, { fill: color });
}

// ========== CLEAN ==========

function renderClean(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram',
    buildColorGradients(d, data.actors.length, 'sq'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.border);

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: `url(#sq${i})`,
      rx: Math.min(d.borderRadius, 8),
      ...d.cardAttrs(),
    }),
    () => ({ fill: '#fff' }),
  );

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    d.text,
  );

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.text, { 'stroke-dasharray': '8,6', opacity: 0.35 });

  // Draw sketch-style actor boxes manually
  const actorY = pad + titleH;
  for (let i = 0; i < data.actors.length; i++) {
    const cx = actorXs[i]!;
    const bx = cx - actorW / 2;
    svg.path(jitterRect(bx, actorY, actorW, actorH, i * 19), {
      fill: d.surface,
      stroke: actorColor(d, i),
      'stroke-width': 2,
      'stroke-dasharray': d.strokeDasharray || '',
    });
    const fit = fitText(data.actors[i]!, actorW - 12, actorH, d.labelSize);
    svg.text(cx, actorY + actorH / 2 + fit.fontSize * 0.35, fit.lines[0] ?? '', {
      'text-anchor': 'middle',
      'font-size': fit.fontSize,
      'font-weight': d.fontWeight,
      fill: d.text,
    });
  }

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    d.text,
    { 'stroke-dasharray': d.strokeDasharray || '' },
  );

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.border, { 'stroke-dasharray': '4,4' });

  // Draw pixel borders for actor boxes
  const actorY = pad + titleH;
  for (let i = 0; i < data.actors.length; i++) {
    const cx = actorXs[i]!;
    const x = cx - actorW / 2;
    svg.raw(pixelBorder(x, actorY, actorW, actorH, actorColor(d, i), 3));
    svg.rect(x + 3, actorY + 3, actorW - 6, actorH - 6, {
      fill: d.surface, 'shape-rendering': 'crispEdges',
    });
    const fit = fitText(data.actors[i]!, actorW - 12, actorH, d.labelSize);
    svg.text(cx, actorY + actorH / 2 + fit.fontSize * 0.35, fit.lines[0] ?? '', {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: '#fff',
    });
  }

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    d.text,
  );

  return svg.build();
}

// ========== BOLD ==========

function renderBold(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram',
    buildColorGradients(d, data.actors.length, 'sq'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.text, { 'stroke-width': 2, opacity: 0.3 });

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: `url(#sq${i})`,
      rx: d.borderRadius,
      filter: 'url(#shadow)',
    }),
    () => ({ fill: '#fff', 'font-weight': 700 }),
  );

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    d.text,
    { 'stroke-width': 3 },
  );

  return svg.build();
}

// ========== MINIMAL ==========

function renderFlat(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.border, { opacity: 0.25 });

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: d.surface,
      stroke: d.border,
      'stroke-width': 1,
      rx: 4,
    }),
    () => ({ fill: d.text }),
  );

  drawMessages(svg, d, data, lay,
    () => d.primary,
    d.textSecondary,
  );

  return svg.build();
}

// ========== GLASS ==========

function renderGlass(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram',
    buildColorGradients(d, data.actors.length, 'sq'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, 'rgba(255,255,255,0.15)');

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: actorColor(d, i),
      'fill-opacity': 0.25,
      stroke: actorColor(d, i),
      'stroke-opacity': 0.5,
      rx: d.borderRadius,
      filter: 'url(#shadow)',
    }),
    () => ({ fill: '#fff' }),
  );

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    'rgba(255,255,255,0.9)',
  );

  return svg.build();
}

// ========== NEON ==========

function renderNeon(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const glowDefs = data.actors.map((_, i) => {
    const c = actorColor(d, i);
    return `<filter id="glow${i}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="4" result="blur"/><feFlood flood-color="${c}" flood-opacity="0.6" result="color"/><feComposite in="color" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
  }).join('');

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram', glowDefs);
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, 'rgba(255,255,255,0.12)');

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: 'none',
      stroke: actorColor(d, i),
      'stroke-width': 2,
      rx: 4,
      filter: `url(#glow${i})`,
    }),
    () => ({ fill: '#fff' }),
  );

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    'rgba(255,255,255,0.85)',
  );

  return svg.build();
}

// ========== WATERCOLOR ==========

function renderWatercolor(data: SequenceDiagramData, title: string | undefined, d: DesignPreset): string {
  const lay = computeLayout(data, !!title, d);
  const { pad, titleH, actorW, actorH, width, height, actorXs } = lay;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Sequence diagram',
    buildColorGradients(d, data.actors.length, 'sq'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawLifelines(svg, d, data, lay, d.textSecondary, { opacity: 0.2 });

  drawActorBoxes(svg, d, data, lay,
    (i) => ({
      fill: `url(#sq${i})`,
      rx: d.borderRadius,
      opacity: 0.7,
      filter: d.extraDefs ? 'url(#wc-blur)' : '',
    }),
    () => ({ fill: d.text }),
  );

  drawMessages(svg, d, data, lay,
    (i) => actorColor(d, i % d.colors.length),
    d.text,
    { opacity: 0.75, 'stroke-width': 2 },
  );

  return svg.build();
}

// ========== EXPORT ==========

export function renderSequenceDiagram(data: SequenceDiagramData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
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
