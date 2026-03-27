// Hierarchy renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface HierarchyNode {
  label: string;
  children?: HierarchyNode[];
}

interface HierarchyData {
  root: HierarchyNode;
}

function stepColor(d: DesignPreset, depth: number): string {
  return d.colors[depth % d.colors.length]!;
}

export function renderHierarchy(data: HierarchyData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  switch (style) {
    case 'horizontal': return renderHorizontal(data, title, d);
    case 'radial': return renderRadial(data, title, d);
    case 'bracket': return renderBracket(data, title, d);
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

// --- Layout engine ---

interface LayoutNode {
  label: string;
  x: number;
  y: number;
  w: number;
  children: LayoutNode[];
}

const NODE_H = 36;
const H_GAP = 16;
const V_GAP = 50;

function nodeWidth(label: string, fontSize: number): number {
  return Math.min(220, Math.max(100, estimateWidth(label, fontSize) + 28));
}

function layoutTree(node: HierarchyNode, depth: number, xOff: { v: number }): LayoutNode {
  const fs = depth === 0 ? 15 : 13;
  const w = nodeWidth(node.label, fs);

  if (!node.children || node.children.length === 0) {
    const x = xOff.v;
    xOff.v += w + H_GAP;
    return { label: node.label, x, y: depth * (NODE_H + V_GAP), w, children: [] };
  }

  const children = node.children.map(c => layoutTree(c, depth + 1, xOff));
  const firstCx = children[0]!.x + children[0]!.w / 2;
  const lastCx = children[children.length - 1]!.x + children[children.length - 1]!.w / 2;
  const x = (firstCx + lastCx) / 2 - w / 2;

  return { label: node.label, x, y: depth * (NODE_H + V_GAP), w, children };
}

function treeWidth(node: LayoutNode): number {
  const self = node.x + node.w;
  if (node.children.length === 0) return self;
  return Math.max(self, ...node.children.map(treeWidth));
}

function treeDepth(node: HierarchyNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return 1 + Math.max(...node.children.map(treeDepth));
}

function offsetTree(node: LayoutNode, dx: number, dy: number): LayoutNode {
  return {
    ...node,
    x: node.x + dx,
    y: node.y + dy,
    children: node.children.map(c => offsetTree(c, dx, dy)),
  };
}

// --- Shared: draw connections ---

function drawConnector(svg: SvgBuilder, px: number, py: number, cx: number, cy: number, stroke: string, width: number): void {
  const midY = (py + cy) / 2;
  svg.path(`M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`, {
    fill: 'none', stroke, 'stroke-width': width,
  });
}

// ========== CLEAN ==========

function renderClean(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawCleanNode(svg, d, root, 0);
  return svg.build();
}

function drawCleanNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const textFill = isRoot ? 'white' : d.text;
  const fs = isRoot ? 15 : 13;

  if (isRoot) {
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: `url(#hg${depth})`, stroke: color, 'stroke-width': d.borderWidth,
      rx: d.borderRadius > 8 ? 10 : d.borderRadius, ...d.cardAttrs(),
    });
  } else {
    drawPresetCard(svg, d, node.x, node.y, node.w, NODE_H, color);
  }

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isRoot ? 700 : d.fontWeight, fill: textFill,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    drawConnector(svg, parentCx, parentBottom, child.x + child.w / 2, child.y, d.border, 1.5);
    drawCleanNode(svg, d, child, depth + 1);
  }
}

// ========== SKETCH ==========

function renderSketch(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawSketchNode(svg, d, root, 0);
  return svg.build();
}

function drawSketchNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  svg.path(jitterRect(node.x, node.y, node.w, NODE_H, depth * 7 + node.x), {
    fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
  });

  const fit = fitText(node.label, node.w - 16, 1, depth === 0 ? 15 : 13);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    drawConnector(svg, parentCx, parentBottom, child.x + child.w / 2, child.y, d.border, 1.5);
    drawSketchNode(svg, d, child, depth + 1);
  }
}

// ========== PIXEL ==========

function renderPixel(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawPixelNode(svg, d, root, 0);
  return svg.build();
}

function drawPixelNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const px = 3;

  svg.raw(pixelBorder(node.x, node.y, node.w, NODE_H, color, px));
  svg.rect(node.x + px, node.y + px, node.w - px * 2, NODE_H - px * 2, {
    fill: d.surface, 'shape-rendering': 'crispEdges',
  });

  const fit = fitText(node.label, node.w - 16, 1, depth === 0 ? 15 : 13);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    drawConnector(svg, parentCx, parentBottom, child.x + child.w / 2, child.y, color, 2);
    drawPixelNode(svg, d, child, depth + 1);
  }
}

// ========== BOLD ==========
// Pop style: colored root, white child nodes, thick connectors, offset shadow

function renderBold(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 56 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (bold)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawBoldNode(svg, d, root, 0);
  return svg.build();
}

function drawBoldNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;

  if (isRoot) {
    // Colored root with offset shadow
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: color, rx: d.borderRadius, filter: 'url(#bold-offset)',
    });
    const fit = fitText(node.label, node.w - 16, 1, fs);
    svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
    });
  } else {
    // White child node with thick border + offset shadow
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: '#FFFFFF', stroke: color, 'stroke-width': 2.5, rx: d.borderRadius,
      filter: 'url(#bold-offset)',
    });
    const fit = fitText(node.label, node.w - 16, 1, fs);
    svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    });
  }

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    const childColor = stepColor(d, depth + 1);
    drawConnector(svg, parentCx, parentBottom, child.x + child.w / 2, child.y, childColor, 3);
    drawBoldNode(svg, d, child, depth + 1);
  }
}

// ========== FLAT ==========
// Vertical indented list, no borders, left color strip per depth

function renderFlat(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 36;
  const titleH = title ? 44 : 0;
  const cardW = 400;
  const rowH = 40;
  const gap = 4;

  // Count total nodes for height
  function countNodes(n: HierarchyNode): number {
    let c = 1;
    if (n.children) for (const ch of n.children) c += countNodes(ch);
    return c;
  }
  const total = countNodes(data.root);
  const width = pad * 2 + cardW;
  const height = pad * 2 + titleH + total * (rowH + gap);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const yRef = { v: pad + titleH };
  drawFlatNode(svg, d, data.root, 0, pad, cardW, rowH, gap, yRef);
  return svg.build();
}

function drawFlatNode(svg: SvgBuilder, d: DesignPreset, node: HierarchyNode, depth: number, pad: number, cardW: number, rowH: number, gap: number, yRef: { v: number }): void {
  const color = stepColor(d, depth);
  const indent = depth * 28;
  const x = pad + indent;
  const w = cardW - indent;
  const y = yRef.v;
  yRef.v += rowH + gap;

  // Flat row — no shadow, no border
  svg.rect(x, y, w, rowH, { fill: d.surface, rx: d.borderRadius });
  // Left color strip
  svg.rect(x, y + 4, 4, rowH - 8, { fill: color, rx: 2 });

  const fs = depth === 0 ? 14 : 12;
  const fit = fitText(node.label, w - 28, 1, fs);
  svg.text(x + 18, y + rowH / 2 + 4, fit.lines[0]!, {
    'text-anchor': 'start', 'font-size': fit.fontSize, 'font-weight': depth === 0 ? 700 : d.fontWeight, fill: d.text,
  });

  if (node.children) {
    for (const child of node.children) {
      drawFlatNode(svg, d, child, depth + 1, pad, cardW, rowH, gap, yRef);
    }
  }
}

// ========== GLASS ==========
// Dark bg, frosted glass nodes, glow connectors

function renderGlass(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (glass)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawGlassNode(svg, d, root, 0);
  return svg.build();
}

function drawGlassNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;

  // Glow behind node
  svg.rect(node.x + 3, node.y + 3, node.w - 6, NODE_H - 6, {
    fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
  });
  // Frosted glass node
  svg.rect(node.x, node.y, node.w, NODE_H, {
    fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
    ...d.cardAttrs(),
  });
  // Top glow line
  svg.rect(node.x + 12, node.y + 1, node.w - 24, 1, { fill: color, opacity: 0.4, rx: 0.5 });

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isRoot ? 700 : d.fontWeight, fill: d.text,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    const childColor = stepColor(d, depth + 1);
    // Glow connector
    const midY = (parentBottom + child.y) / 2;
    const cx = child.x + child.w / 2;
    svg.path(`M ${parentCx} ${parentBottom} L ${parentCx} ${midY} L ${cx} ${midY} L ${cx} ${child.y}`, {
      fill: 'none', stroke: childColor, 'stroke-width': 2, opacity: 0.5,
      filter: 'url(#shadow)',
    });
    svg.circle(cx, child.y, 3, { fill: childColor, opacity: 0.7 });
    drawGlassNode(svg, d, child, depth + 1);
  }
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon border nodes, glow connectors

function renderNeon(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawNeonNode(svg, d, root, 0);
  return svg.build();
}

function drawNeonNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;

  // Dark node with neon border
  svg.rect(node.x, node.y, node.w, NODE_H, {
    fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
  });
  // Glow border
  svg.rect(node.x, node.y, node.w, NODE_H, {
    fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
    opacity: 0.3, filter: 'url(#neon-glow)',
  });

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isRoot ? 700 : d.fontWeight, fill: color,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    const childColor = stepColor(d, depth + 1);
    // Neon glow connector
    const midY = (parentBottom + child.y) / 2;
    const cx = child.x + child.w / 2;
    svg.path(`M ${parentCx} ${parentBottom} L ${parentCx} ${midY} L ${cx} ${midY} L ${cx} ${child.y}`, {
      fill: 'none', stroke: childColor, 'stroke-width': 2, filter: 'url(#neon-glow)',
    });
    drawNeonNode(svg, d, child, depth + 1);
  }
}

// ========== WATERCOLOR ==========
// Organic: watercolor wash background, soft nodes, organic connectors

function renderWatercolor(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutTree(data.root, 0, xOff);
  const tw = treeWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (watercolor)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetTree(layout, pad, pad + titleH);
  drawWatercolorNode(svg, d, root, 0);
  return svg.build();
}

function drawWatercolorNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;

  // Watercolor wash blob behind node
  svg.ellipse(node.x + node.w / 2, node.y + NODE_H / 2, node.w / 2 + 8, NODE_H / 2 + 6, {
    fill: color, opacity: 0.12, filter: 'url(#watercolor)',
  });
  // Soft node
  svg.rect(node.x, node.y, node.w, NODE_H, {
    fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
  });

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isRoot ? 700 : d.fontWeight, fill: d.text,
  });

  const parentCx = node.x + node.w / 2;
  const parentBottom = node.y + NODE_H;

  for (const child of node.children) {
    const childColor = stepColor(d, depth + 1);
    // Soft organic connector
    const midY = (parentBottom + child.y) / 2;
    const cx = child.x + child.w / 2;
    svg.path(`M ${parentCx} ${parentBottom} C ${parentCx} ${midY - 6}, ${cx} ${midY + 6}, ${cx} ${child.y}`, {
      fill: 'none', stroke: childColor, 'stroke-width': 2, opacity: 0.5,
      filter: 'url(#watercolor)',
    });
    svg.circle(cx, child.y, 4, { fill: childColor, opacity: 0.6, filter: 'url(#watercolor)' });
    drawWatercolorNode(svg, d, child, depth + 1);
  }
}

// ========== HORIZONTAL ==========
// Horizontal tree: root on the left, children expand to the right

interface HLayoutNode {
  label: string;
  x: number;
  y: number;
  w: number;
  children: HLayoutNode[];
}

const H_NODE_W = 130;
const H_V_GAP_H = 12;
const H_H_GAP = 60;

function hNodeHeight(label: string, fontSize: number): number {
  return NODE_H;
}

function layoutHorizontalTree(node: HierarchyNode, depth: number, yOff: { v: number }): HLayoutNode {
  const fs = depth === 0 ? 15 : 13;
  const w = nodeWidth(node.label, fs);

  if (!node.children || node.children.length === 0) {
    const y = yOff.v;
    yOff.v += NODE_H + H_V_GAP_H;
    return { label: node.label, x: depth * (H_NODE_W + H_H_GAP), y, w, children: [] };
  }

  const children = node.children.map(c => layoutHorizontalTree(c, depth + 1, yOff));
  const firstCy = children[0]!.y + NODE_H / 2;
  const lastCy = children[children.length - 1]!.y + NODE_H / 2;
  const y = (firstCy + lastCy) / 2 - NODE_H / 2;

  return { label: node.label, x: depth * (H_NODE_W + H_H_GAP), y, w, children };
}

function hTreeMaxX(node: HLayoutNode): number {
  const self = node.x + node.w;
  if (node.children.length === 0) return self;
  return Math.max(self, ...node.children.map(hTreeMaxX));
}

function hTreeMaxY(node: HLayoutNode): number {
  const self = node.y + NODE_H;
  if (node.children.length === 0) return self;
  return Math.max(self, ...node.children.map(hTreeMaxY));
}

function offsetHTree(node: HLayoutNode, dx: number, dy: number): HLayoutNode {
  return {
    ...node,
    x: node.x + dx,
    y: node.y + dy,
    children: node.children.map(c => offsetHTree(c, dx, dy)),
  };
}

function drawHConnector(svg: SvgBuilder, px: number, py: number, cx: number, cy: number, stroke: string, width: number): void {
  const midX = (px + cx) / 2;
  svg.path(`M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`, {
    fill: 'none', stroke, 'stroke-width': width,
  });
}

function renderHorizontal(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const yOff = { v: 0 };
  const layout = layoutHorizontalTree(data.root, 0, yOff);
  const maxX = hTreeMaxX(layout) + H_GAP;
  const maxY = hTreeMaxY(layout);
  const width = maxX + pad * 2;
  const height = maxY + pad * 2 + titleH;
  const depth = treeDepth(data.root);

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (horizontal)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetHTree(layout, pad, pad + titleH);
  drawHorizontalNode(svg, d, root, 0);
  return svg.build();
}

function drawHorizontalNode(svg: SvgBuilder, d: DesignPreset, node: HLayoutNode, depth: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;
  const textFill = isRoot ? 'white' : d.text;

  if (isRoot) {
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: `url(#hg${depth})`, stroke: color, 'stroke-width': d.borderWidth,
      rx: d.borderRadius > 8 ? 10 : d.borderRadius, ...d.cardAttrs(),
    });
  } else {
    drawPresetCard(svg, d, node.x, node.y, node.w, NODE_H, color);
  }

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(node.x + node.w / 2, node.y + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': isRoot ? 700 : d.fontWeight, fill: textFill,
  });

  const parentRight = node.x + node.w;
  const parentCy = node.y + NODE_H / 2;

  for (const child of node.children) {
    drawHConnector(svg, parentRight, parentCy, child.x, child.y + NODE_H / 2, d.border, 1.5);
    drawHorizontalNode(svg, d, child, depth + 1);
  }
}

// ========== RADIAL ==========
// Radial tree: root at center, children radiate outward in concentric rings

function countLeaves(node: HierarchyNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + countLeaves(c), 0);
}

interface RadialPos {
  x: number;
  y: number;
  angle: number;
}

function layoutRadialChildren(
  node: HierarchyNode, cx: number, cy: number,
  startAngle: number, endAngle: number, depth: number,
  ringGap: number, positions: Map<HierarchyNode, RadialPos>,
): void {
  if (!node.children || node.children.length === 0) return;

  const totalLeaves = node.children.reduce((sum, c) => sum + countLeaves(c), 0);
  const radius = (depth + 1) * ringGap;
  let currentAngle = startAngle;

  for (const child of node.children) {
    const leaves = countLeaves(child);
    const span = (leaves / totalLeaves) * (endAngle - startAngle);
    const midAngle = currentAngle + span / 2;

    positions.set(child, {
      x: cx + radius * Math.cos(midAngle),
      y: cy + radius * Math.sin(midAngle),
      angle: midAngle,
    });

    layoutRadialChildren(child, cx, cy, currentAngle, currentAngle + span, depth + 1, ringGap, positions);
    currentAngle += span;
  }
}

function renderRadial(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 48 : 0;
  const depth = treeDepth(data.root);
  const ringGap = 130;
  const totalR = depth * ringGap + 100;
  const size = totalR * 2;
  const width = pad * 2 + size;
  const height = pad * 2 + titleH + size;
  const cx = width / 2;
  const cy = pad + titleH + size / 2;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (radial)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  // Concentric ring guides
  for (let ring = 1; ring < depth; ring++) {
    svg.circle(cx, cy, ring * ringGap, {
      fill: 'none', stroke: d.border, 'stroke-width': 0.5, 'stroke-dasharray': '4,8', opacity: 0.1,
    });
  }

  // Layout all nodes
  const positions = new Map<HierarchyNode, RadialPos>();
  positions.set(data.root, { x: cx, y: cy, angle: 0 });
  layoutRadialChildren(data.root, cx, cy, -Math.PI / 2, 3 * Math.PI / 2, 0, ringGap, positions);

  // Draw connections and nodes (depth-first)
  drawRadialNode(svg, d, data.root, positions, 0);

  return svg.build();
}

function drawRadialNode(
  svg: SvgBuilder, d: DesignPreset, node: HierarchyNode,
  positions: Map<HierarchyNode, RadialPos>, depth: number,
): void {
  const pos = positions.get(node)!;
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  // Root node is larger; adapt radius to label length
  const rootLabelW = isRoot ? estimateWidth(node.label, 12) : 0;
  const nodeR = isRoot ? Math.max(36, rootLabelW / 2 + 12) : 18;

  // Draw connections to children first
  if (node.children) {
    for (const child of node.children) {
      const childPos = positions.get(child)!;
      svg.path(`M ${pos.x.toFixed(1)} ${pos.y.toFixed(1)} Q ${((pos.x + childPos.x) / 2).toFixed(1)} ${((pos.y + childPos.y) / 2).toFixed(1)} ${childPos.x.toFixed(1)} ${childPos.y.toFixed(1)}`, {
        fill: 'none', stroke: d.border, 'stroke-width': 1.5, opacity: 0.3,
      });
      drawRadialNode(svg, d, child, positions, depth + 1);
    }
  }

  // Node circle
  if (isRoot) {
    svg.circle(pos.x, pos.y, nodeR, { fill: color, stroke: d.border, 'stroke-width': 1.5 });
    // Root label inside circle — allow more lines for large text
    const fit = fitText(node.label, nodeR * 2 - 12, 3, 12);
    const lh = Math.round(12 * 1.3);
    const totalTextH = fit.lines.length * lh;
    let textY = pos.y - totalTextH / 2 + lh - 2;
    for (const line of fit.lines) {
      svg.text(pos.x, textY, line, {
        'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: '#FFFFFF',
      });
      textY += lh;
    }
  } else {
    svg.circle(pos.x, pos.y, nodeR, { fill: d.surface, stroke: color, 'stroke-width': 1.5, ...d.cardAttrs() });
    // Depth number inside node
    svg.circle(pos.x, pos.y, nodeR - 2, { fill: color, opacity: 0.12 });
    // Label OUTSIDE node — positioned radially
    const labelR = nodeR + 10;
    const labelX = pos.x + labelR * Math.cos(pos.angle);
    const labelY = pos.y + labelR * Math.sin(pos.angle);
    const anchor = Math.abs(pos.angle) < Math.PI / 2 ? 'start' : 'end';
    const adjustedX = Math.abs(pos.angle) < Math.PI / 2 ? labelX : labelX;
    const fit = fitText(node.label, 100, 2, 11);
    const lh = Math.round(11 * 1.3);
    let textY = labelY - (fit.lines.length - 1) * lh / 2;
    for (const line of fit.lines) {
      svg.text(adjustedX, textY, line, {
        'text-anchor': anchor, 'font-size': fit.fontSize, 'font-weight': d.fontWeight, fill: d.text,
      });
      textY += lh;
    }
  }
}

// ========== BRACKET ==========
// Tournament bracket layout: root on left, branches expand to the right with right-angle lines

function bracketLeafCount(node: HierarchyNode): number {
  if (!node.children || node.children.length === 0) return 1;
  return node.children.reduce((sum, c) => sum + bracketLeafCount(c), 0);
}

interface BracketNode {
  label: string;
  x: number;
  y: number;
  w: number;
  children: BracketNode[];
}

function layoutBracket(node: HierarchyNode, depth: number, yOff: { v: number }, colW: number, rowH: number): BracketNode {
  const fs = depth === 0 ? 15 : 13;
  const w = nodeWidth(node.label, fs);

  if (!node.children || node.children.length === 0) {
    const y = yOff.v;
    yOff.v += rowH;
    return { label: node.label, x: depth * colW, y, w, children: [] };
  }

  const children = node.children.map(c => layoutBracket(c, depth + 1, yOff, colW, rowH));
  const firstY = children[0]!.y;
  const lastY = children[children.length - 1]!.y;
  const y = (firstY + lastY) / 2;

  return { label: node.label, x: depth * colW, y, w, children };
}

function renderBracket(data: HierarchyData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 44 : 0;
  const colW = 180;
  const rowH = 48;
  const depth = treeDepth(data.root);
  const leafCount = bracketLeafCount(data.root);
  const yOff = { v: 0 };
  const layout = layoutBracket(data.root, 0, yOff, colW, rowH);

  const width = pad * 2 + depth * colW;
  const height = pad * 2 + titleH + leafCount * rowH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Hierarchy diagram (bracket)',
    buildColorGradients(d, depth, 'hg'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  drawBracketNode(svg, d, layout, 0, pad, pad + titleH);
  return svg.build();
}

function drawBracketNode(svg: SvgBuilder, d: DesignPreset, node: BracketNode, depth: number, ox: number, oy: number): void {
  const color = stepColor(d, depth);
  const isRoot = depth === 0;
  const fs = isRoot ? 15 : 13;
  const nx = ox + node.x;
  const ny = oy + node.y;

  // Draw node box
  if (isRoot) {
    svg.rect(nx, ny, node.w, NODE_H, {
      fill: `url(#hg${depth})`, stroke: color, 'stroke-width': d.borderWidth,
      rx: d.borderRadius > 8 ? 10 : d.borderRadius, ...d.cardAttrs(),
    });
  } else {
    drawPresetCard(svg, d, nx, ny, node.w, NODE_H, color);
  }

  const fit = fitText(node.label, node.w - 16, 1, fs);
  svg.text(nx + node.w / 2, ny + NODE_H / 2 + 5, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': isRoot ? 700 : d.fontWeight, fill: isRoot ? 'white' : d.text,
  });

  // Draw right-angle connectors to children
  const parentRight = nx + node.w;
  const parentCy = ny + NODE_H / 2;

  if (node.children.length > 0) {
    const bridgeX = parentRight + 16;

    // Horizontal stub from parent
    svg.line(parentRight, parentCy, bridgeX, parentCy, {
      stroke: d.border, 'stroke-width': 1.5,
    });

    // Vertical bracket line
    const firstChildY = oy + node.children[0]!.y + NODE_H / 2;
    const lastChildY = oy + node.children[node.children.length - 1]!.y + NODE_H / 2;
    svg.line(bridgeX, firstChildY, bridgeX, lastChildY, {
      stroke: d.border, 'stroke-width': 1.5,
    });

    for (const child of node.children) {
      const childY = oy + child.y + NODE_H / 2;
      const childX = ox + child.x;
      // Horizontal line from bracket to child
      svg.line(bridgeX, childY, childX, childY, {
        stroke: d.border, 'stroke-width': 1.5,
      });
      drawBracketNode(svg, d, child, depth + 1, ox, oy);
    }
  }
}
