// Cycle renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, type DesignPreset } from '../shared/design.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawIconNode,
} from '../shared/render-utils.js';

interface CycleStep {
  label: string;
  description?: string;
}

interface CycleData {
  steps: CycleStep[];
}

function stepColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

export function renderCycle(data: CycleData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'flywheel': return renderFlywheel(data, title, d);
    case 'gear': return renderGear(data, title, d);
    default:
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
}

// --- Shared: compute positions on circle ---

function circlePositions(count: number, cx: number, cy: number, radius: number): Array<{ x: number; y: number; angle: number }> {
  return Array.from({ length: count }, (_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle), angle };
  });
}

function drawCurvedArrow(svg: SvgBuilder, x1: number, y1: number, x2: number, y2: number, nodeR: number, cx: number, cy: number, stroke: string, opacity: number): void {
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const sx = x1 + nodeR * Math.cos(angle);
  const sy = y1 + nodeR * Math.sin(angle);
  const ex = x2 - (nodeR + 6) * Math.cos(angle);
  const ey = y2 - (nodeR + 6) * Math.sin(angle);
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  // Push control point AWAY from center (outward curve)
  const off = 24;
  const dx = mx - cx;
  const dy = my - cy;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const qx = mx + (dx / dist) * off;
  const qy = my + (dy / dist) * off;

  svg.path(`M ${sx.toFixed(0)} ${sy.toFixed(0)} Q ${qx.toFixed(0)} ${qy.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`, {
    fill: 'none', stroke, 'stroke-width': 2, opacity, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)',
  });
}

// ========== CLEAN ==========

function renderClean(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.steps.length;
  const nodeR = 36;
  const ringR = 120;
  const size = (ringR + nodeR + 110) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram',
    buildColorGradients(d, count, 'cg'));
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Decorative ring
  svg.circle(cx, cy, ringR, { fill: 'none', stroke: d.colors[0]!, 'stroke-width': 2, 'stroke-dasharray': '6,8', opacity: 0.1 });

  const positions = circlePositions(count, cx, cy, ringR);

  // Arrows
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    drawCurvedArrow(svg, cur.x, cur.y, next.x, next.y, nodeR, cx, cy, stepColor(d, i), 0.35);
  }

  // Nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    drawIconNode(svg, d, x, y, nodeR, color, `cg${i}`, '', 0);
    svg.text(x, y + 6, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 800, fill: 'white' });

    // Place label radially outward from center
    const { angle } = positions[i]!;
    const labelDist = nodeR + 20;
    const lx = x + labelDist * Math.cos(angle);
    const ly = y + labelDist * Math.sin(angle);
    drawLabelBlock(svg, d, step.label, step.description, lx, ly, 120);
  }

  return svg.build();
}

// ========== BOLD ==========
// Pop style: large colored nodes, thick arrows, offset shadow

function renderBold(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const count = data.steps.length;
  const nodeR = 42;
  const ringR = 130;
  const size = (ringR + nodeR + 90) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (bold)',
    buildColorGradients(d, count, 'cg'));
  const arrowDef = `<marker id="arr" markerWidth="10" markerHeight="8" refX="10" refY="4" orient="auto"><polygon points="0,0 10,4 0,8" fill="${d.border}"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circlePositions(count, cx, cy, ringR);

  // Thick arrows
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    const color = stepColor(d, i);
    const angle = Math.atan2(next.y - cur.y, next.x - cur.x);
    const sx = cur.x + nodeR * Math.cos(angle);
    const sy = cur.y + nodeR * Math.sin(angle);
    const ex = next.x - (nodeR + 8) * Math.cos(angle);
    const ey = next.y - (nodeR + 8) * Math.sin(angle);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const off = 22;
    const qx = mx + (cx - mx) / Math.max(Math.abs(cx - mx), 1) * off * Math.sign(cx - mx) || mx;
    const qy = my + (cy - my) / Math.max(Math.abs(cy - my), 1) * off * Math.sign(cy - my) || my;

    svg.path(`M ${sx.toFixed(0)} ${sy.toFixed(0)} Q ${qx.toFixed(0)} ${qy.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`, {
      fill: 'none', stroke: color, 'stroke-width': 4, opacity: 0.6, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)',
    });
  }

  // Nodes with offset shadow
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    // Offset shadow
    svg.circle(x + 3, y + 3, nodeR, { fill: '#333333', opacity: 0.25 });
    // Colored fill node
    svg.circle(x, y, nodeR, { fill: color, stroke: d.border, 'stroke-width': 3 });
    svg.text(x, y + 7, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 22, 'font-weight': 900, fill: '#FFFFFF' });

    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 18, 130);
  }

  return svg.build();
}

// ========== FLAT ==========
// Material design: flat circles, thin connections, no shadows

function renderFlat(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const count = data.steps.length;
  const nodeR = 32;
  const ringR = 115;
  const size = (ringR + nodeR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (flat)');
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Subtle dashed ring
  svg.circle(cx, cy, ringR, { fill: 'none', stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '4,6', opacity: 0.15 });

  const positions = circlePositions(count, cx, cy, ringR);

  // Thin arrows
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    drawCurvedArrow(svg, cur.x, cur.y, next.x, next.y, nodeR, cx, cy, d.border, 0.2);
  }

  // Flat circle nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    svg.circle(x, y, nodeR, { fill: color });
    svg.text(x, y + 5, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 15, 'font-weight': 700, fill: '#FFFFFF' });

    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 14, 110);
  }

  return svg.build();
}

// ========== GLASS ==========
// Dark background, glow nodes, glow arrows

function renderGlass(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.steps.length;
  const nodeR = 38;
  const ringR = 125;
  const size = (ringR + nodeR + 85) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (glass)',
    buildColorGradients(d, count, 'cg'));
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.text}"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Faint ring
  svg.circle(cx, cy, ringR, { fill: 'none', stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '6,10', opacity: 0.15 });

  const positions = circlePositions(count, cx, cy, ringR);

  // Glow arrows
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    const color = stepColor(d, i);
    const angle = Math.atan2(next.y - cur.y, next.x - cur.x);
    const sx = cur.x + nodeR * Math.cos(angle);
    const sy = cur.y + nodeR * Math.sin(angle);
    const ex = next.x - (nodeR + 6) * Math.cos(angle);
    const ey = next.y - (nodeR + 6) * Math.sin(angle);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const off = 18;
    const qx = mx + (cx - mx) / Math.max(Math.abs(cx - mx), 1) * off * Math.sign(cx - mx) || mx;
    const qy = my + (cy - my) / Math.max(Math.abs(cy - my), 1) * off * Math.sign(cy - my) || my;
    const pathD = `M ${sx.toFixed(0)} ${sy.toFixed(0)} Q ${qx.toFixed(0)} ${qy.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`;

    // Glow layer
    svg.path(pathD, { fill: 'none', stroke: color, 'stroke-width': 4, opacity: 0.15, 'stroke-linecap': 'round', filter: 'url(#shadow)' });
    // Main line
    svg.path(pathD, { fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)' });
  }

  // Glow nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    // Outer glow
    svg.circle(x, y, nodeR + 4, { fill: color, opacity: 0.08, filter: 'url(#shadow)' });
    // Frosted node
    svg.circle(x, y, nodeR, { fill: d.surface, stroke: d.border, 'stroke-width': 1, ...d.cardAttrs() });
    // Top highlight
    svg.circle(x, y - nodeR / 3, nodeR * 0.6, { fill: 'rgba(255,255,255,0.06)' });
    // Color accent ring
    svg.circle(x, y, nodeR, { fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.4 });
    svg.text(x, y + 6, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 700, fill: d.text });

    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 16, 120);
  }

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outline nodes, glow arrows, grid

function renderNeon(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.steps.length;
  const nodeR = 36;
  const ringR = 120;
  const size = (ringR + nodeR + 85) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (neon)');
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.primary}" filter="url(#neon-glow)"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Grid pattern
  for (let gx = 0; gx < width; gx += 40) {
    svg.path(`M ${gx} 0 L ${gx} ${height}`, { stroke: d.border, 'stroke-width': 0.3, opacity: 0.15 });
  }
  for (let gy = 0; gy < height; gy += 40) {
    svg.path(`M 0 ${gy} L ${width} ${gy}`, { stroke: d.border, 'stroke-width': 0.3, opacity: 0.15 });
  }

  // Neon dashed ring
  svg.circle(cx, cy, ringR, { fill: 'none', stroke: d.primary, 'stroke-width': 0.5, 'stroke-dasharray': '2,8', opacity: 0.3, filter: 'url(#neon-glow)' });

  const positions = circlePositions(count, cx, cy, ringR);

  // Neon glow arrows
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    const color = stepColor(d, i);
    const angle = Math.atan2(next.y - cur.y, next.x - cur.x);
    const sx = cur.x + nodeR * Math.cos(angle);
    const sy = cur.y + nodeR * Math.sin(angle);
    const ex = next.x - (nodeR + 6) * Math.cos(angle);
    const ey = next.y - (nodeR + 6) * Math.sin(angle);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const off = 18;
    const qx = mx + (cx - mx) / Math.max(Math.abs(cx - mx), 1) * off * Math.sign(cx - mx) || mx;
    const qy = my + (cy - my) / Math.max(Math.abs(cy - my), 1) * off * Math.sign(cy - my) || my;
    const pathD = `M ${sx.toFixed(0)} ${sy.toFixed(0)} Q ${qx.toFixed(0)} ${qy.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`;

    // Glow layer
    svg.path(pathD, { fill: 'none', stroke: color, 'stroke-width': 3, opacity: 0.3, 'stroke-linecap': 'round', filter: 'url(#neon-glow)' });
    // Main neon line
    svg.path(pathD, { fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.8, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)' });
  }

  // Neon outline nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    // Dark fill circle
    svg.circle(x, y, nodeR, { fill: 'rgba(0,0,0,0.5)' });
    // Neon outline with glow
    svg.circle(x, y, nodeR, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    // Step number index
    svg.text(x + nodeR - 8, y - nodeR + 14, `0${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 9, fill: color, opacity: 0.5, 'letter-spacing': '1',
    });
    svg.text(x, y + 6, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 16, 'font-weight': 400, fill: color, filter: 'url(#neon-glow)' });

    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 16, 115);
  }

  return svg.build();
}

// ========== WATERCOLOR ==========
// Watercolor painted circles + organic curved arrows

function renderWatercolor(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const count = data.steps.length;
  const nodeR = 38;
  const ringR = 125;
  const size = (ringR + nodeR + 85) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (watercolor)',
    buildColorGradients(d, count, 'cg'));
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.border}" opacity="0.6"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Faint watercolor ring
  svg.circle(cx, cy, ringR, { fill: 'none', stroke: d.border, 'stroke-width': 1.5, 'stroke-dasharray': '8,12', opacity: 0.15, filter: 'url(#watercolor)' });

  const positions = circlePositions(count, cx, cy, ringR);

  // Organic curved arrows with watercolor filter
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    const color = stepColor(d, i);
    const angle = Math.atan2(next.y - cur.y, next.x - cur.x);
    const sx = cur.x + nodeR * Math.cos(angle);
    const sy = cur.y + nodeR * Math.sin(angle);
    const ex = next.x - (nodeR + 6) * Math.cos(angle);
    const ey = next.y - (nodeR + 6) * Math.sin(angle);
    const mx = (sx + ex) / 2;
    const my = (sy + ey) / 2;
    const off = 20;
    const qx = mx + (cx - mx) / Math.max(Math.abs(cx - mx), 1) * off * Math.sign(cx - mx) || mx;
    const qy = my + (cy - my) / Math.max(Math.abs(cy - my), 1) * off * Math.sign(cy - my) || my;

    svg.path(`M ${sx.toFixed(0)} ${sy.toFixed(0)} Q ${qx.toFixed(0)} ${qy.toFixed(0)} ${ex.toFixed(0)} ${ey.toFixed(0)}`, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.4, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)', filter: 'url(#watercolor)',
    });
  }

  // Watercolor painted nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    // Wash blob behind node
    svg.circle(x, y, nodeR + 8, { fill: color, opacity: 0.12, filter: 'url(#watercolor)' });
    // Watercolor circle
    svg.circle(x, y, nodeR, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(x, y + 6, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 17, 'font-weight': 600, fill: d.text });

    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 16, 120);
  }

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const count = data.steps.length;
  const ringR = 110;
  const nodeR = 30;
  const size = (ringR + nodeR + 60) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (sketch)');
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>`;
  svg.defs(defs + arrowDef);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circlePositions(count, cx, cy, ringR);

  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    drawCurvedArrow(svg, cur.x, cur.y, next.x, next.y, nodeR, cx, cy, d.border, 0.4);
  }

  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    svg.circle(x, y, nodeR, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
    svg.text(x, y + 5, `${i + 1}`, { 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 400, fill: d.text });
    drawLabelBlock(svg, d, step.label, step.description, x, y + nodeR + 14, 100);
  }

  return svg.build();
}

// ========== PIXEL ==========

function renderPixel(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const count = data.steps.length;
  const ringR = 100;
  const nodeR = 24;
  const px = 3;
  const size = (ringR + nodeR + 50) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circlePositions(count, cx, cy, ringR);

  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);
    const bx = Math.round(x - nodeR);
    const by = Math.round(y - nodeR);
    const bw = nodeR * 2;

    svg.rect(bx, by, bw, bw, { fill: color, opacity: 0.85, 'shape-rendering': 'crispEdges' });
    svg.text(Math.round(x), Math.round(y) + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: d.bg,
    });
    drawLabelBlock(svg, d, step.label, undefined, Math.round(x), Math.round(y) + nodeR + 16, 90);
  }

  return svg.build();
}

// ========== GEAR ==========
// Interlocking gear/cog visualization — each step is a gear node with teeth connecting to neighbors

function renderGear(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const count = data.steps.length;
  const gearR = 36;
  const ringR = count <= 3 ? 90 : 110 + count * 6;
  const size = (ringR + gearR + 100) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (gear)',
    buildColorGradients(d, count, 'cg'));
  svg.defs(baseDefs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const positions = circlePositions(count, cx, cy, ringR);
  const toothCount = 10;
  const toothDepth = 8;
  const innerR = gearR - 4;

  // Draw connecting arcs between gears
  for (let i = 0; i < count; i++) {
    const cur = positions[i]!;
    const next = positions[(i + 1) % count]!;
    const mx = (cur.x + next.x) / 2;
    const my = (cur.y + next.y) / 2;
    svg.circle(mx, my, 3, { fill: d.border, opacity: 0.3 });
  }

  // Draw gear nodes
  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const { x, y } = positions[i]!;
    const color = stepColor(d, i);

    // Gear teeth path
    let gearPath = '';
    for (let t = 0; t < toothCount; t++) {
      const a1 = (2 * Math.PI * t) / toothCount;
      const a2 = (2 * Math.PI * (t + 0.35)) / toothCount;
      const a3 = (2 * Math.PI * (t + 0.5)) / toothCount;
      const a4 = (2 * Math.PI * (t + 0.85)) / toothCount;
      const outerR = gearR + toothDepth;
      const p1 = `${(x + gearR * Math.cos(a1)).toFixed(1)},${(y + gearR * Math.sin(a1)).toFixed(1)}`;
      const p2 = `${(x + outerR * Math.cos(a2)).toFixed(1)},${(y + outerR * Math.sin(a2)).toFixed(1)}`;
      const p3 = `${(x + outerR * Math.cos(a3)).toFixed(1)},${(y + outerR * Math.sin(a3)).toFixed(1)}`;
      const p4 = `${(x + gearR * Math.cos(a4)).toFixed(1)},${(y + gearR * Math.sin(a4)).toFixed(1)}`;
      gearPath += `${t === 0 ? 'M' : 'L'} ${p1} L ${p2} L ${p3} L ${p4} `;
    }
    gearPath += 'Z';

    // Shadow
    svg.path(gearPath, { fill: color, opacity: 0.15, transform: `translate(2, 2)` });
    // Gear body
    svg.path(gearPath, { fill: color, opacity: 0.85, stroke: d.surface, 'stroke-width': 1.5 });
    // Inner circle
    svg.circle(x, y, innerR, { fill: d.surface, opacity: 0.9 });
    svg.circle(x, y, 6, { fill: color, opacity: 0.3 });

    // Step number
    svg.text(x, y + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: color,
    });

    // Label below
    drawLabelBlock(svg, d, step.label, step.description, x, y + gearR + toothDepth + 12, 110);
  }

  return svg.build();
}

// ========== FLYWHEEL ==========
// Concentric spinning wheel: segments around a central hub, emphasizing momentum

function renderFlywheel(data: CycleData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 48 : 0;
  const count = data.steps.length;
  const hubR = 40;
  const innerR = hubR + 20;
  const outerR = innerR + 70;
  const size = (outerR + 80) * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs: baseDefs } = createDiagramSvg(d, width, height, title, 'Cycle diagram (flywheel)',
    buildColorGradients(d, count, 'cg'));
  const arrowDef = `<marker id="arr" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto"><polygon points="0,0 8,3 0,6" fill="${d.border}"/></marker>`;
  svg.defs(baseDefs + arrowDef);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Outer ring with motion lines
  svg.circle(cx, cy, outerR + 8, { fill: 'none', stroke: d.border, 'stroke-width': 1, 'stroke-dasharray': '3,9', opacity: 0.15 });
  svg.circle(cx, cy, outerR + 16, { fill: 'none', stroke: d.border, 'stroke-width': 0.5, 'stroke-dasharray': '2,12', opacity: 0.08 });

  // Segment arcs
  const angleStep = (2 * Math.PI) / count;
  const gapAngle = 0.08;

  for (let i = 0; i < count; i++) {
    const step = data.steps[i]!;
    const color = stepColor(d, i);
    const startAngle = -Math.PI / 2 + i * angleStep + gapAngle;
    const endAngle = -Math.PI / 2 + (i + 1) * angleStep - gapAngle;

    // Arc segment
    const x1i = cx + innerR * Math.cos(startAngle);
    const y1i = cy + innerR * Math.sin(startAngle);
    const x2i = cx + innerR * Math.cos(endAngle);
    const y2i = cy + innerR * Math.sin(endAngle);
    const x1o = cx + outerR * Math.cos(startAngle);
    const y1o = cy + outerR * Math.sin(startAngle);
    const x2o = cx + outerR * Math.cos(endAngle);
    const y2o = cy + outerR * Math.sin(endAngle);
    const largeArc = angleStep - 2 * gapAngle > Math.PI ? 1 : 0;

    svg.path(
      `M ${x1i.toFixed(1)} ${y1i.toFixed(1)} L ${x1o.toFixed(1)} ${y1o.toFixed(1)} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2o.toFixed(1)} ${y2o.toFixed(1)} L ${x2i.toFixed(1)} ${y2i.toFixed(1)} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x1i.toFixed(1)} ${y1i.toFixed(1)}`,
      { fill: color, opacity: 0.75, stroke: d.surface, 'stroke-width': 1.5 },
    );

    // Arrow on outer edge (clockwise direction indicator)
    const midAngle = (startAngle + endAngle) / 2;
    const arrowR = outerR + 4;
    const ax = cx + arrowR * Math.cos(midAngle + 0.15);
    const ay = cy + arrowR * Math.sin(midAngle + 0.15);
    const aex = cx + arrowR * Math.cos(midAngle + 0.35);
    const aey = cy + arrowR * Math.sin(midAngle + 0.35);
    svg.path(`M ${ax.toFixed(1)} ${ay.toFixed(1)} L ${aex.toFixed(1)} ${aey.toFixed(1)}`, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.5, 'stroke-linecap': 'round',
      'marker-end': 'url(#arr)',
    });

    // Label outside
    const labelR = outerR + 36;
    const labelX = cx + labelR * Math.cos(midAngle);
    const labelY = cy + labelR * Math.sin(midAngle);
    drawLabelBlock(svg, d, step.label, step.description, labelX, labelY - 4, 110);

    // Step number inside segment
    const numR = (innerR + outerR) / 2;
    const numX = cx + numR * Math.cos(midAngle);
    const numY = cy + numR * Math.sin(midAngle);
    svg.text(numX, numY + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, fill: '#FFFFFF',
    });
  }

  // Central hub
  svg.circle(cx, cy, hubR + 2, { fill: d.surface, stroke: d.border, 'stroke-width': 1.5, opacity: 0.9 });
  svg.circle(cx, cy, hubR, { fill: d.colors[0]!, opacity: 0.15 });
  // Rotation icon (circular arrow in center)
  const iconR = 14;
  svg.path(
    `M ${cx} ${cy - iconR} A ${iconR} ${iconR} 0 1 1 ${cx - iconR} ${cy}`,
    { fill: 'none', stroke: d.text, 'stroke-width': 2, opacity: 0.5, 'stroke-linecap': 'round', 'marker-end': 'url(#arr)' },
  );

  return svg.build();
}
