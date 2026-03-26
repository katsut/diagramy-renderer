// Mind map renderer — radial layout with center node and branches

import { radialGradient } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText } from '../shared/text.js';
import { icon } from '../shared/icons.js';
import {
  createDiagramSvg, drawBackground, drawTitle, drawLabelBlock,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard, drawIconNode,
} from '../shared/render-utils.js';
import { adaptiveRadialRadius, radialLabelPlacement } from '../shared/layout-planner.js';
import type { SvgBuilder } from '../shared/svg.js';

interface MindMapBranch {
  label: string;
  children?: string[];
}

interface MindMapData {
  center: string;
  branches: MindMapBranch[];
}

const BRANCH_ICONS = ['lightbulb', 'zap', 'target', 'layers', 'settings', 'eye', 'users', 'trending-up'];

export function renderMindMap(data: MindMapData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'horizontal') return renderHorizontal(data, title, d);
  if (style === 'org_chart') return renderOrgChart(data, title, d);
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

function branchColor(d: DesignPreset, i: number): string {
  return d.colors[i % d.colors.length]!;
}

function branchIcon(i: number): string {
  return BRANCH_ICONS[i % BRANCH_ICONS.length]!;
}

function computeLayout(branchCount: number, hasTitle: boolean, maxChildren: number) {
  const pad = 48;
  const titleH = hasTitle ? 44 : 0;
  const centerR = 50;
  const { branchR, childR } = adaptiveRadialRadius(branchCount, maxChildren);
  const maxChildCount = branchCount <= 4 ? 5 : branchCount <= 6 ? 4 : 3;

  const totalR = branchR + childR + 50;
  const width = Math.max(pad * 2 + totalR * 2, 600);
  const height = pad * 2 + titleH + totalR * 2;
  const cx = width / 2;
  const cy = pad + titleH + totalR;

  return { pad, titleH, centerR, branchR, childR, width, height, cx, cy, maxChildCount };
}

function branchAngle(i: number, total: number): number {
  return (i / total) * Math.PI * 2 - Math.PI / 2;
}

// ========== CLEAN ==========

function renderClean(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const gradientDefs = buildColorGradients(d, n, 'mg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map diagram', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  // Draw branches first (connections behind center)
  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    drawCleanConnection(svg, d, lay.cx, lay.cy, bx, by, color);
    drawCleanBranch(svg, d, bx, by, color, branch, i);
    drawCleanChildren(svg, d, bx, by, angle, color, branch, lay);
  }

  // Center node on top
  drawCleanCenter(svg, d, lay.cx, lay.cy, lay.centerR, data.center);

  return svg.build();
}

function drawCleanConnection(svg: SvgBuilder, _d: DesignPreset, x1: number, y1: number, x2: number, y2: number, color: string): void {
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const cx1 = x1 + (mx - x1) * 0.6;
  const cy1 = y1;
  const cx2 = x2 - (x2 - mx) * 0.6;
  const cy2 = y2;
  svg.path(`M ${x1} ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2} ${y2}`, {
    fill: 'none', stroke: color, 'stroke-width': 2.5, opacity: 0.4, 'stroke-linecap': 'round',
  });
}

function drawCleanCenter(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, r: number, label: string): void {
  svg.circle(cx, cy, r + 4, { fill: d.colors[0]!, opacity: 0.08 });
  svg.circle(cx, cy, r, {
    fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth, ...d.cardAttrs(),
  });
  svg.circle(cx, cy, r - 4, { fill: d.colors[0]!, opacity: 0.06 });
  drawLabelBlock(svg, d, label, undefined, cx, cy - 6, r * 1.4);
}

function drawCleanBranch(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, color: string, branch: MindMapBranch, i: number): void {
  drawIconNode(svg, d, bx, by, 22, color, `mg${i}`, branchIcon(i), 18);
  drawLabelBlock(svg, d, branch.label, undefined, bx, by + 44, 120);
}

function drawCleanChildren(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, angle: number, color: string, branch: MindMapBranch, lay: ReturnType<typeof computeLayout>): void {
  const children = branch.children ?? [];
  const count = Math.min(children.length, lay.maxChildCount);
  if (count === 0) return;

  const spread = Math.PI * 0.5;
  const startAngle = angle - spread / 2;

  for (let j = 0; j < count; j++) {
    const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
    const cx = bx + Math.cos(childAngle) * lay.childR;
    const cy = by + Math.sin(childAngle) * lay.childR;

    svg.line(bx, by, cx, cy, { stroke: color, 'stroke-width': 1.5, opacity: 0.3 });
    svg.circle(cx, cy, 4, { fill: color, opacity: 0.7 });
    drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + 12, 90);
  }
}

// ========== BOLD ==========
// Pop style: colored circle nodes with white inner, thick borders, offset shadow

function renderBold(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const gradientDefs = buildColorGradients(d, n, 'mg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map (bold)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    // Thick curved connection
    drawCleanConnection(svg, d, lay.cx, lay.cy, bx, by, color);

    // Bold branch node: colored outer ring + white inner
    svg.circle(bx, by, 30, {
      fill: color, stroke: d.border, 'stroke-width': 3, filter: 'url(#bold-offset)',
    });
    svg.circle(bx, by, 20, { fill: '#FFFFFF' });
    svg.text(bx, by + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 18, 'font-weight': 900, fill: color,
    });
    drawLabelBlock(svg, d, branch.label, undefined, bx, by + 46, 120);

    // Children
    drawCleanChildren(svg, d, bx, by, angle, color, branch, lay);
  }

  // Center: bold large node
  svg.circle(lay.cx, lay.cy, lay.centerR + 6, {
    fill: d.colors[0]!, stroke: d.border, 'stroke-width': 3, filter: 'url(#bold-offset)',
  });
  svg.circle(lay.cx, lay.cy, lay.centerR - 4, { fill: '#FFFFFF' });
  drawLabelBlock(svg, d, data.center, undefined, lay.cx, lay.cy - 6, lay.centerR * 1.2);

  return svg.build();
}

// ========== FLAT ==========
// Material: flat colored circles, no shadows, clean lines

function renderFlat(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map (flat)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    // Straight thin connection
    svg.line(lay.cx, lay.cy, bx, by, { stroke: color, 'stroke-width': 2, opacity: 0.3 });

    // Flat filled circle — no border, no shadow
    svg.circle(bx, by, 24, { fill: color });
    svg.text(bx, by + 5, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, fill: '#FFFFFF',
    });
    drawLabelBlock(svg, d, branch.label, undefined, bx, by + 38, 120);

    // Flat children
    const children = branch.children ?? [];
    const count = Math.min(children.length, lay.maxChildCount);
    const spread = Math.PI * 0.5;
    const startAngle = angle - spread / 2;
    for (let j = 0; j < count; j++) {
      const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
      const cx = bx + Math.cos(childAngle) * lay.childR;
      const cy = by + Math.sin(childAngle) * lay.childR;
      svg.line(bx, by, cx, cy, { stroke: color, 'stroke-width': 1, opacity: 0.2 });
      svg.circle(cx, cy, 6, { fill: color, opacity: 0.6 });
      drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + 14, 90);
    }
  }

  // Center: flat primary circle
  svg.circle(lay.cx, lay.cy, lay.centerR, { fill: d.primary });
  drawLabelBlock(svg, d, data.center, undefined, lay.cx, lay.cy - 6, lay.centerR * 1.4);

  return svg.build();
}

// ========== GLASS ==========
// Dark bg, frosted glass nodes with glow

function renderGlass(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const gradientDefs = buildColorGradients(d, n, 'mg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map (glass)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    // Curved connection with glow
    drawCleanConnection(svg, d, lay.cx, lay.cy, bx, by, color);

    // Glow behind node
    svg.circle(bx, by, 32, { fill: color, opacity: 0.08, filter: 'url(#shadow)' });
    // Glass node
    svg.circle(bx, by, 26, {
      fill: d.surface, stroke: 'rgba(255,255,255,0.15)', 'stroke-width': 1,
      ...d.cardAttrs(),
    });
    // Color accent ring
    svg.circle(bx, by, 20, { fill: color, opacity: 0.15 });
    svg.raw(icon(branchIcon(i), bx, by, 18, color));
    drawLabelBlock(svg, d, branch.label, undefined, bx, by + 44, 120);

    // Glass children
    drawCleanChildren(svg, d, bx, by, angle, color, branch, lay);
  }

  // Glass center
  svg.circle(lay.cx, lay.cy, lay.centerR + 8, { fill: d.colors[0]!, opacity: 0.06, filter: 'url(#shadow)' });
  svg.circle(lay.cx, lay.cy, lay.centerR, {
    fill: d.surface, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1,
    ...d.cardAttrs(),
  });
  svg.circle(lay.cx, lay.cy, lay.centerR - 8, { fill: d.colors[0]!, opacity: 0.08 });
  drawLabelBlock(svg, d, data.center, undefined, lay.cx, lay.cy - 6, lay.centerR * 1.4);

  return svg.build();
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outline nodes, glow

function renderNeon(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map (neon)');
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);
    const lp = radialLabelPlacement(angle, 26);

    // Neon connection line
    svg.line(lay.cx, lay.cy, bx, by, { stroke: color, 'stroke-width': 1, opacity: 0.4 });
    svg.line(lay.cx, lay.cy, bx, by, {
      stroke: color, 'stroke-width': 1.5, opacity: 0.2, filter: 'url(#neon-glow)',
    });

    // Neon outline node
    svg.circle(bx, by, 22, { fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1.5 });
    svg.circle(bx, by, 22, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.3, filter: 'url(#neon-glow)',
    });
    svg.raw(icon(branchIcon(i), bx, by, 16, color));
    drawLabelBlock(svg, d, branch.label, undefined, bx, by + lp.yOffset, 110, lp.anchor);

    // Neon children
    const children = branch.children ?? [];
    const count = Math.min(children.length, lay.maxChildCount);
    const spread = Math.PI * 0.5;
    const startAngle = angle - spread / 2;
    for (let j = 0; j < count; j++) {
      const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
      const cx = bx + Math.cos(childAngle) * lay.childR;
      const cy = by + Math.sin(childAngle) * lay.childR;
      const clp = radialLabelPlacement(childAngle, 5);
      svg.line(bx, by, cx, cy, { stroke: color, 'stroke-width': 1, opacity: 0.2 });
      svg.circle(cx, cy, 4, { fill: 'none', stroke: color, 'stroke-width': 1.5, filter: 'url(#neon-glow)' });
      drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + clp.yOffset, 80, clp.anchor);
    }
  }

  // Neon center
  svg.circle(lay.cx, lay.cy, lay.centerR, {
    fill: 'rgba(0,0,0,0.4)', stroke: d.colors[0]!, 'stroke-width': 2,
  });
  svg.circle(lay.cx, lay.cy, lay.centerR, {
    fill: 'none', stroke: d.colors[0]!, 'stroke-width': 2.5, opacity: 0.3, filter: 'url(#neon-glow)',
  });
  drawLabelBlock(svg, d, data.center, undefined, lay.cx, lay.cy - 6, lay.centerR * 1.4);

  return svg.build();
}

// ========== WATERCOLOR ==========
// Organic: watercolor-filtered nodes, soft connections

function renderWatercolor(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const gradientDefs = buildColorGradients(d, n, 'mg');
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map (watercolor)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, lay.width, lay.height);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    // Soft curved connection
    drawCleanConnection(svg, d, lay.cx, lay.cy, bx, by, color);

    // Watercolor wash blob behind node
    svg.ellipse(bx, by, 36, 34, { fill: color, opacity: 0.12, filter: 'url(#watercolor)' });
    // Watercolor node
    svg.circle(bx, by, 26, { fill: color, opacity: 0.7, filter: 'url(#watercolor)' });
    svg.text(bx, by + 6, `${i + 1}`, {
      'text-anchor': 'middle', 'font-size': 16, 'font-weight': 600, fill: d.text,
    });
    drawLabelBlock(svg, d, branch.label, undefined, bx, by + 44, 120);

    // Watercolor children
    const children = branch.children ?? [];
    const count = Math.min(children.length, lay.maxChildCount);
    const spread = Math.PI * 0.5;
    const startAngle = angle - spread / 2;
    for (let j = 0; j < count; j++) {
      const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
      const cx = bx + Math.cos(childAngle) * lay.childR;
      const cy = by + Math.sin(childAngle) * lay.childR;
      svg.line(bx, by, cx, cy, { stroke: color, 'stroke-width': 1.5, opacity: 0.3 });
      svg.circle(cx, cy, 6, { fill: color, opacity: 0.6, filter: 'url(#watercolor)' });
      drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + 14, 90);
    }
  }

  // Watercolor center
  svg.ellipse(lay.cx, lay.cy, lay.centerR + 10, lay.centerR + 8, {
    fill: d.colors[0]!, opacity: 0.1, filter: 'url(#watercolor)',
  });
  svg.circle(lay.cx, lay.cy, lay.centerR, {
    fill: d.surface, opacity: 0.85, filter: 'url(#watercolor)',
  });
  drawLabelBlock(svg, d, data.center, undefined, lay.cx, lay.cy - 6, lay.centerR * 1.4);

  return svg.build();
}

// ========== SKETCH ==========

function renderSketch(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map diagram (sketch)');
  svg.defs(defs);

  drawSketchBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;

    drawSketchLine(svg, d, lay.cx, lay.cy, bx, by, i);
    drawSketchBranch(svg, d, bx, by, branch, i);
    drawSketchChildren(svg, d, bx, by, angle, branch, lay, i);
  }

  drawSketchCenter(svg, d, lay.cx, lay.cy, lay.centerR, data.center);

  return svg.build();
}

function drawSketchLine(svg: SvgBuilder, d: DesignPreset, x1: number, y1: number, x2: number, y2: number, seed: number): void {
  svg.path(jitterLine(x1, y1, x2, y2, seed * 17), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });
}

function drawSketchCenter(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, r: number, label: string): void {
  svg.circle(cx, cy, r, { fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth });
  svg.circle(cx, cy, r - 8, { fill: 'none', stroke: d.border, 'stroke-width': 1 });
  drawLabelBlock(svg, d, label, undefined, cx, cy - 6, r * 1.4);
}

function drawSketchBranch(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, branch: MindMapBranch, i: number): void {
  svg.circle(bx, by, 24, { fill: 'none', stroke: d.border, 'stroke-width': 1.5 });
  svg.text(bx, by + 4, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 14, 'font-weight': 400, fill: d.text,
  });
  drawLabelBlock(svg, d, branch.label, undefined, bx, by + 36, 120);
}

function drawSketchChildren(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, angle: number, branch: MindMapBranch, lay: ReturnType<typeof computeLayout>, branchIdx: number): void {
  const children = branch.children ?? [];
  const count = Math.min(children.length, lay.maxChildCount);
  if (count === 0) return;

  const spread = Math.PI * 0.5;
  const startAngle = angle - spread / 2;

  for (let j = 0; j < count; j++) {
    const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
    const cx = bx + Math.cos(childAngle) * lay.childR;
    const cy = by + Math.sin(childAngle) * lay.childR;

    svg.path(jitterLine(bx, by, cx, cy, branchIdx * 100 + j * 13), {
      fill: 'none', stroke: d.border, 'stroke-width': 1,
    });
    svg.circle(cx, cy, 3, { fill: 'none', stroke: d.border, 'stroke-width': 1 });
    drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + 10, 90);
  }
}

// ========== PIXEL ==========

function renderPixel(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const px = 3;
  const n = data.branches.length;
  const maxCh = Math.max(...data.branches.map(b => b.children?.length ?? 0), 0);
  const lay = computeLayout(n, !!title, maxCh);
  const { svg, defs } = createDiagramSvg(d, lay.width, lay.height, title, 'Mind map diagram (pixel)');
  svg.defs(defs);

  drawPixelBackground(svg, lay.width, lay.height, d.bg);
  if (title) drawTitle(svg, d, title, lay.width, lay.pad);

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const angle = branchAngle(i, n);
    const bx = lay.cx + Math.cos(angle) * lay.branchR;
    const by = lay.cy + Math.sin(angle) * lay.branchR;
    const color = branchColor(d, i);

    drawPixelConnection(svg, lay.cx, lay.cy, bx, by, color, px);
    drawPixelBranch(svg, d, bx, by, color, branch, px, i);
    drawPixelChildren(svg, d, bx, by, angle, color, branch, lay, px, i);
  }

  drawPixelCenter(svg, d, lay.cx, lay.cy, data.center, px);

  return svg.build();
}

function drawPixelConnection(svg: SvgBuilder, x1: number, y1: number, x2: number, y2: number, color: string, px: number): void {
  const steps = Math.floor(Math.hypot(x2 - x1, y2 - y1) / px);
  const dx = (x2 - x1) / steps;
  const dy = (y2 - y1) / steps;

  for (let s = 0; s < steps; s += 2) {
    const sx = Math.round(x1 + dx * s);
    const sy = Math.round(y1 + dy * s);
    svg.rect(sx, sy, px, px, { fill: color, opacity: 0.5, 'shape-rendering': 'crispEdges' });
  }
}

function drawPixelCenter(svg: SvgBuilder, d: DesignPreset, cx: number, cy: number, label: string, px: number): void {
  const size = 80;
  const x = cx - size / 2;
  const y = cy - size / 2;
  svg.raw(pixelBorder(x, y, size, size, d.colors[0]!, px));
  svg.rect(x + px, y + px, size - px * 2, size - px * 2, {
    fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
  });
  drawLabelBlock(svg, d, label, undefined, cx, cy - 4, size - 16);
}

function drawPixelBranch(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, color: string, branch: MindMapBranch, px: number, i: number): void {
  const size = 48;
  const x = bx - size / 2;
  const y = by - size / 2;
  svg.raw(pixelBorder(x, y, size, size, color, px));
  svg.rect(x + px, y + px, size - px * 2, size - px * 2, {
    fill: d.surface, opacity: 0.9, 'shape-rendering': 'crispEdges',
  });
  svg.rect(x + px, y + px, px * 6, px * 5, { fill: color, 'shape-rendering': 'crispEdges' });
  svg.text(x + px * 3 + 1, y + px * 4, `${i + 1}`, {
    'text-anchor': 'middle', 'font-size': 10, 'font-weight': 700, fill: d.bg,
  });
  drawLabelBlock(svg, d, branch.label, undefined, bx, by + size / 2 + 14, 100);
}

function drawPixelChildren(svg: SvgBuilder, d: DesignPreset, bx: number, by: number, angle: number, color: string, branch: MindMapBranch, lay: ReturnType<typeof computeLayout>, px: number, branchIdx: number): void {
  const children = branch.children ?? [];
  const count = Math.min(children.length, lay.maxChildCount);
  if (count === 0) return;

  const spread = Math.PI * 0.5;
  const startAngle = angle - spread / 2;

  for (let j = 0; j < count; j++) {
    const childAngle = count === 1 ? angle : startAngle + (j / (count - 1)) * spread;
    const cx = bx + Math.cos(childAngle) * lay.childR;
    const cy = by + Math.sin(childAngle) * lay.childR;

    drawPixelConnection(svg, bx, by, cx, cy, color, px);
    svg.rect(cx - px * 2, cy - px * 2, px * 4, px * 4, {
      fill: color, 'shape-rendering': 'crispEdges',
    });
    drawLabelBlock(svg, d, children[j]!, undefined, cx, cy + px * 4, 80);
  }
}

// ========== HORIZONTAL (style) ==========
// Center node on the left, branches spread horizontally to the right in a tree layout

function renderHorizontal(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const n = data.branches.length;
  const pad = 40;
  const titleH = title ? 44 : 0;
  const centerW = 120;
  const branchW = 140;
  const childW = 110;
  const colGap = 60;
  const rowH = 56;
  const childRowH = 24;

  // Compute total height needed
  let totalRows = 0;
  for (const branch of data.branches) {
    const childCount = Math.min((branch.children ?? []).length, 4);
    totalRows += Math.max(childCount, 1);
  }
  const branchesH = n * rowH + (totalRows - n) * childRowH;
  const height = pad * 2 + titleH + Math.max(branchesH, 200);
  const width = pad * 2 + centerW + colGap + branchW + colGap + childW;

  const gradientDefs = buildColorGradients(d, n, 'mg');
  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Mind map (horizontal)', gradientDefs);
  svg.defs(defs);

  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const centerX = pad + centerW / 2;
  const centerY = contentTop + (height - pad * 2 - titleH) / 2;

  // Center node
  svg.circle(centerX, centerY, 40, {
    fill: d.surface, stroke: d.border, 'stroke-width': d.borderWidth, ...d.cardAttrs(),
  });
  svg.circle(centerX, centerY, 36, { fill: d.colors[0]!, opacity: 0.06 });
  drawLabelBlock(svg, d, data.center, undefined, centerX, centerY - 4, 70);

  // Branches
  let curY = contentTop + 16;
  const branchX = pad + centerW + colGap;

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const color = branchColor(d, i);
    const children = (branch.children ?? []).slice(0, 4);
    const blockH = rowH + (children.length > 0 ? (children.length - 1) * childRowH : 0);
    const by = curY + rowH / 2;

    // Line from center to branch
    svg.path(`M ${centerX + 40} ${centerY} C ${branchX - 20} ${centerY}, ${centerX + 40} ${by}, ${branchX} ${by}`, {
      fill: 'none', stroke: color, 'stroke-width': 2, opacity: 0.4, 'stroke-linecap': 'round',
    });

    // Branch node
    drawPresetCard(svg, d, branchX, by - 18, branchW, 36, color);
    const fit = fitText(branch.label, branchW - 16, 1, d.labelSize);
    svg.text(branchX + branchW / 2, by + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Children
    const childX = branchX + branchW + colGap;
    for (let j = 0; j < children.length; j++) {
      const cy = curY + j * childRowH + rowH / 2;
      svg.line(branchX + branchW, by, childX, cy, {
        stroke: color, 'stroke-width': 1.5, opacity: 0.3,
      });
      svg.circle(childX, cy, 4, { fill: color, opacity: 0.7 });
      const cFit = fitText(children[j]!, childW - 16, 1, d.captionSize);
      svg.text(childX + 10, cy + 4, cFit.lines[0]!, {
        'text-anchor': 'start', 'font-size': cFit.fontSize, fill: d.textSecondary,
      });
    }

    curY += blockH + 8;
  }

  return svg.build();
}

// ========== ORG CHART ==========
// Top-down org chart: center at top, branches in row below, children below each branch

function renderOrgChart(data: MindMapData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const boxW = 140;
  const boxH = 40;
  const colGap = 20;
  const rowGap = 50;
  const n = data.branches.length;

  // Calculate max children per branch for height
  const maxCh = Math.max(...data.branches.map(b => (b.children ?? []).length), 0);
  const clampedCh = Math.min(maxCh, 4);

  // Width: widest row is branches or their children
  const branchRowW = n * boxW + (n - 1) * colGap;

  // Each branch may have children spread below it
  let totalChildW = 0;
  for (const branch of data.branches) {
    const cc = Math.min((branch.children ?? []).length, 4);
    const w = cc > 0 ? cc * (boxW * 0.8 + 8) - 8 : boxW;
    totalChildW += w + colGap;
  }
  totalChildW = Math.max(totalChildW - colGap, 0);

  const contentW = Math.max(branchRowW, totalChildW, boxW);
  const width = pad * 2 + contentW;
  const rows = 2 + (clampedCh > 0 ? 1 : 0);
  const height = pad * 2 + titleH + rows * (boxH + rowGap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Mind map (org chart)',
    buildColorGradients(d, n, 'mg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const contentTop = pad + titleH;
  const centerX = width / 2;

  // Center node (top)
  const centerY = contentTop + 8;
  drawPresetCard(svg, d, centerX - boxW / 2, centerY, boxW, boxH, d.colors[0]!);
  const cfit = fitText(data.center, boxW - 16, 1, d.labelSize);
  svg.text(centerX, centerY + boxH / 2 + 4, cfit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': cfit.fontSize, 'font-weight': 700, fill: d.text,
  });

  // Branch row
  const branchY = centerY + boxH + rowGap;
  const branchStartX = centerX - branchRowW / 2;

  for (let i = 0; i < n; i++) {
    const branch = data.branches[i]!;
    const color = branchColor(d, i);
    const bx = branchStartX + i * (boxW + colGap);
    const bCenterX = bx + boxW / 2;

    // Connector from center to branch
    svg.line(centerX, centerY + boxH, bCenterX, branchY, {
      stroke: d.border, 'stroke-width': 1.5, opacity: 0.4,
    });

    drawPresetCard(svg, d, bx, branchY, boxW, boxH, color);
    const fit = fitText(branch.label, boxW - 16, 1, d.labelSize);
    svg.text(bCenterX, branchY + boxH / 2 + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
    });

    // Children below branch
    const children = (branch.children ?? []).slice(0, 4);
    if (children.length > 0) {
      const childW = boxW * 0.8;
      const childGap = 8;
      const childRowW = children.length * childW + (children.length - 1) * childGap;
      const childStartX = bCenterX - childRowW / 2;
      const childY = branchY + boxH + rowGap;

      for (let j = 0; j < children.length; j++) {
        const cx = childStartX + j * (childW + childGap);
        const cCenterX = cx + childW / 2;

        svg.line(bCenterX, branchY + boxH, cCenterX, childY, {
          stroke: color, 'stroke-width': 1, opacity: 0.3,
        });

        svg.rect(cx, childY, childW, boxH - 4, {
          fill: d.surface, stroke: color, 'stroke-width': 1,
          rx: d.borderRadius, ...d.cardAttrs(),
        });
        const chFit = fitText(children[j]!, childW - 12, 1, d.captionSize);
        svg.text(cCenterX, childY + (boxH - 4) / 2 + 4, chFit.lines[0]!, {
          'text-anchor': 'middle', 'font-size': chFit.fontSize, fill: d.textSecondary,
        });
      }
    }
  }

  return svg.build();
}
