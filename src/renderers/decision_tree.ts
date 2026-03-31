// Decision tree renderer — design-system aware

import type { SvgBuilder } from '../shared/svg.js';
import { getDesign, jitterRect, jitterLine, pixelBorder, type DesignPreset } from '../shared/design.js';
import { fitText, estimateWidth } from '../shared/text.js';
import {
  createDiagramSvg, drawBackground, drawTitle,
  buildColorGradients, drawSketchBackground, drawPixelBackground,
  drawPresetCard,
} from '../shared/render-utils.js';

interface DecisionNode {
  label: string;
  yes?: DecisionNode;
  no?: DecisionNode;
}

interface DecisionTreeData {
  root: DecisionNode;
}

function depthColor(d: DesignPreset, depth: number): string {
  return d.colors[depth % d.colors.length]!;
}

export function renderDecisionTree(data: DecisionTreeData, title?: string, design?: DesignPreset, style?: string): string {
  const d = design ?? getDesign();
  if (style === 'horizontal') return renderHorizontal(data, title, d);
  if (style === 'flowchart') return renderFlowchart(data, title, d);
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

// --- Layout ---

interface LayoutNode { label: string; x: number; y: number; w: number; isLeaf: boolean; yes?: LayoutNode; no?: LayoutNode; dataPath: string; }

const NODE_W = 130;
const NODE_H = 40;
const H_GAP = 20;
const V_GAP = 56;

function treeDepth(node: DecisionNode): number {
  if (!node.yes && !node.no) return 1;
  return 1 + Math.max(node.yes ? treeDepth(node.yes) : 0, node.no ? treeDepth(node.no) : 0);
}

function leafCount(node: DecisionNode): number {
  if (!node.yes && !node.no) return 1;
  return (node.yes ? leafCount(node.yes) : 0) + (node.no ? leafCount(node.no) : 0);
}

function layoutNode(node: DecisionNode, depth: number, xOff: { v: number }, dataPath = 'root'): LayoutNode {
  const isLeaf = !node.yes && !node.no;
  const w = NODE_W;

  if (isLeaf) {
    const x = xOff.v;
    xOff.v += w + H_GAP;
    return { label: node.label, x, y: depth * (NODE_H + V_GAP), w, isLeaf: true, dataPath };
  }

  const yesLayout = node.yes ? layoutNode(node.yes, depth + 1, xOff, `${dataPath}.yes`) : undefined;
  const noLayout = node.no ? layoutNode(node.no, depth + 1, xOff, `${dataPath}.no`) : undefined;

  const children = [yesLayout, noLayout].filter(Boolean) as LayoutNode[];
  const minX = Math.min(...children.map(c => c.x));
  const maxX = Math.max(...children.map(c => c.x + c.w));
  const x = (minX + maxX) / 2 - w / 2;

  return { label: node.label, x, y: depth * (NODE_H + V_GAP), w, isLeaf: false, yes: yesLayout, no: noLayout, dataPath };
}

function offsetLayout(node: LayoutNode, dx: number, dy: number): LayoutNode {
  return {
    ...node, x: node.x + dx, y: node.y + dy,
    yes: node.yes ? offsetLayout(node.yes, dx, dy) : undefined,
    no: node.no ? offsetLayout(node.no, dx, dy) : undefined,
  };
}

function layoutWidth(node: LayoutNode): number {
  const self = node.x + node.w;
  const children = [node.yes, node.no].filter(Boolean) as LayoutNode[];
  if (children.length === 0) return self;
  return Math.max(self, ...children.map(layoutWidth));
}

function drawConnector(svg: SvgBuilder, px: number, py: number, cx: number, cy: number, stroke: string, width: number, labelText?: string): void {
  const midY = (py + cy) / 2;
  svg.path(`M ${px} ${py} L ${px} ${midY} L ${cx} ${midY} L ${cx} ${cy}`, {
    fill: 'none', stroke, 'stroke-width': width,
  });
  if (labelText) {
    svg.text((px + cx) / 2, midY - 4, labelText, {
      'text-anchor': 'middle', 'font-size': 10, fill: stroke, opacity: 0.7,
    });
  }
}

// ========== CLEAN ==========

function renderClean(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawCleanNode(svg, d, root, 0);
  return svg.build();
}

function drawCleanNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (node.isLeaf) {
    // Leaf: rounded rectangle
    drawPresetCard(svg, d, node.x, node.y, node.w, NODE_H, color);
  } else {
    // Decision: diamond shape
    const hw = node.w / 2;
    const hh = NODE_H / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: `url(#dt${depth})`, stroke: 'white', 'stroke-width': 2,
    });
  }

  const fit = fitText(node.label, node.w - 20, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': node.isLeaf ? d.fontWeight : 700,
    fill: node.isLeaf ? d.text : 'white',
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, depthColor(d, depth), 1.5, 'Yes');
    drawCleanNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, depthColor(d, depth), 1.5, 'No');
    drawCleanNode(svg, d, node.no, depth + 1);
  }
}

// ========== SKETCH ==========

function renderSketch(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 48 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (sketch)');
  svg.defs(defs);
  drawSketchBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawSketchNode(svg, d, root, 0);
  return svg.build();
}

function drawSketchNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (node.isLeaf) {
    svg.path(jitterRect(node.x, node.y, node.w, NODE_H, depth * 11 + node.x), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else {
    const hw = node.w / 2;
    const hh = NODE_H / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  }

  const fit = fitText(node.label, node.w - 24, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, fill: d.text,
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, d.border, 1.5, 'Yes');
    drawSketchNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, d.border, 1.5, 'No');
    drawSketchNode(svg, d, node.no, depth + 1);
  }
}

// ========== PIXEL ==========

function renderPixel(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 40 : 0;
  const px = 3;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (pixel)');
  svg.defs(defs);
  drawPixelBackground(svg, width, height, d.bg);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawPixelNode(svg, d, root, 0, px);
  return svg.build();
}

function drawPixelNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number, px: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  svg.raw(pixelBorder(Math.round(node.x), Math.round(node.y), node.w, NODE_H, color, px));
  svg.rect(Math.round(node.x) + px, Math.round(node.y) + px, node.w - px * 2, NODE_H - px * 2, {
    fill: node.isLeaf ? d.surface : color, opacity: node.isLeaf ? 1 : 0.5, 'shape-rendering': 'crispEdges',
  });

  const fit = fitText(node.label, node.w - 16, 1, 12);
  svg.text(Math.round(cx), Math.round(cy) + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: d.text,
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, Math.round(cx), bottom, Math.round(node.yes.x + node.yes.w / 2), node.yes.y, color, 2, 'Y');
    drawPixelNode(svg, d, node.yes, depth + 1, px);
  }
  if (node.no) {
    drawConnector(svg, Math.round(cx), bottom, Math.round(node.no.x + node.no.w / 2), node.no.y, color, 2, 'N');
    drawPixelNode(svg, d, node.no, depth + 1, px);
  }
}

// ========== BOLD ==========
// Pop style: colored fills, offset shadow, thick borders

function renderBold(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 52;
  const titleH = title ? 56 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (bold)',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawBoldNode(svg, d, root, 0);
  return svg.build();
}

function drawBoldNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (node.isLeaf) {
    // Leaf: white card with colored border + offset shadow
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: '#FFFFFF', rx: d.borderRadius,
      stroke: color, 'stroke-width': 3, filter: 'url(#bold-offset)',
    });
  } else {
    // Decision: colored diamond with shadow
    const hw = node.w / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: color, stroke: d.text, 'stroke-width': 2, filter: 'url(#bold-offset)',
    });
  }

  const fit = fitText(node.label, node.w - 24, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': 800,
    fill: node.isLeaf ? d.text : '#FFFFFF',
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, color, 2.5, 'Yes');
    drawBoldNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, color, 2.5, 'No');
    drawBoldNode(svg, d, node.no, depth + 1);
  }
}

// ========== FLAT ==========
// Material design: minimal, no shadow, subtle color fills

function renderFlat(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 40;
  const titleH = title ? 44 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (flat)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawFlatNode(svg, d, root, 0);
  return svg.build();
}

function drawFlatNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (node.isLeaf) {
    // Flat leaf: surface fill, left color strip
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: d.surface, rx: d.borderRadius,
    });
    svg.rect(node.x, node.y + 4, 4, NODE_H - 8, { fill: color, rx: 2 });
  } else {
    // Flat decision: colored fill, no border
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: color, rx: d.borderRadius,
    });
  }

  const fit = fitText(node.label, node.w - 20, 1, 12);
  svg.text(node.isLeaf ? node.x + 12 : cx, cy + 4, fit.lines[0]!, {
    'text-anchor': node.isLeaf ? 'start' : 'middle', 'font-size': fit.fontSize,
    'font-weight': d.fontWeight,
    fill: node.isLeaf ? d.text : '#FFFFFF',
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, color, 1, 'Yes');
    drawFlatNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, color, 1, 'No');
    drawFlatNode(svg, d, node.no, depth + 1);
  }
}

// ========== GLASS ==========
// Dark bg, frosted glass nodes, glow effects

function renderGlass(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (glass)',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawGlassNode(svg, d, root, 0);
  return svg.build();
}

function drawGlassNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  // Glow behind
  svg.rect(node.x + 2, node.y + 2, node.w - 4, NODE_H - 4, {
    fill: color, opacity: 0.08, rx: d.borderRadius, filter: 'url(#shadow)',
  });

  if (node.isLeaf) {
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1, rx: d.borderRadius,
      ...d.cardAttrs(),
    });
    // Top glow line
    svg.rect(node.x + 12, node.y + 1, node.w - 24, 1, { fill: color, opacity: 0.4, rx: 0.5 });
  } else {
    const hw = node.w / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: d.surface, stroke: d.border, 'stroke-width': 1,
      ...d.cardAttrs(),
    });
  }

  const fit = fitText(node.label, node.w - 24, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': d.fontWeight, fill: d.text,
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, color, 1.5, 'Yes');
    drawGlassNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, color, 1.5, 'No');
    drawGlassNode(svg, d, node.no, depth + 1);
  }
}

// ========== NEON ==========
// Cyberpunk: dark bg, neon outlines, glow effects

function renderNeon(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 44;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (neon)');
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawNeonNode(svg, d, root, 0);
  return svg.build();
}

function drawNeonNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (node.isLeaf) {
    // Neon outlined rectangle
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
  } else {
    // Neon diamond
    const hw = node.w / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1,
    });
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: 'none', stroke: color, 'stroke-width': 1.5,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
  }

  const fit = fitText(node.label, node.w - 24, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': d.fontWeight, fill: d.text,
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, color, 1.5, 'Yes');
    drawNeonNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, color, 1.5, 'No');
    drawNeonNode(svg, d, node.no, depth + 1);
  }
}

// ========== WATERCOLOR ==========
// Organic soft layout, muted colors, paper feel

function renderWatercolor(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 52 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (watercolor)',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  drawBackground(svg, d, width, height);
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawWatercolorNode(svg, d, root, 0);
  return svg.build();
}

function drawWatercolorNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  // Watercolor wash behind node
  svg.ellipse(cx, cy, node.w / 2 + 8, NODE_H / 2 + 6, {
    fill: color, opacity: 0.1, filter: 'url(#watercolor)',
  });

  if (node.isLeaf) {
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: d.surface, rx: d.borderRadius, opacity: 0.85, filter: 'url(#watercolor)',
    });
  } else {
    // Watercolor diamond
    const hw = node.w / 2;
    svg.path(`M ${cx} ${node.y} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H} L ${cx - hw} ${cy} Z`, {
      fill: color, opacity: 0.7, filter: 'url(#watercolor)',
    });
  }

  const fit = fitText(node.label, node.w - 24, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': 600,
    fill: node.isLeaf ? d.text : d.text,
    'data-field': `${node.dataPath}.label`,
  });

  const bottom = node.y + NODE_H;
  if (node.yes) {
    drawConnector(svg, cx, bottom, node.yes.x + node.yes.w / 2, node.yes.y, color, 1.5, 'Yes');
    drawWatercolorNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    drawConnector(svg, cx, bottom, node.no.x + node.no.w / 2, node.no.y, color, 1.5, 'No');
    drawWatercolorNode(svg, d, node.no, depth + 1);
  }
}

// ========== HORIZONTAL ==========
// Horizontal tree: root on left, branches extend right. Yes=up, No=down.

interface HLayoutNode {
  label: string;
  x: number;
  y: number;
  w: number;
  isLeaf: boolean;
  yes?: HLayoutNode;
  no?: HLayoutNode;
}

const H_NODE_W = 130;
const H_H_GAP = 50;
const H_V_GAP = 12;

function layoutHNode(node: DecisionNode, depth: number, yOff: { v: number }): HLayoutNode {
  const isLeaf = !node.yes && !node.no;
  const w = H_NODE_W;

  if (isLeaf) {
    const y = yOff.v;
    yOff.v += NODE_H + H_V_GAP;
    return { label: node.label, x: depth * (w + H_H_GAP), y, w, isLeaf: true };
  }

  const yesLayout = node.yes ? layoutHNode(node.yes, depth + 1, yOff) : undefined;
  const noLayout = node.no ? layoutHNode(node.no, depth + 1, yOff) : undefined;

  const children = [yesLayout, noLayout].filter(Boolean) as HLayoutNode[];
  const minY = Math.min(...children.map(c => c.y));
  const maxY = Math.max(...children.map(c => c.y + NODE_H));
  const y = (minY + maxY) / 2 - NODE_H / 2;

  return { label: node.label, x: depth * (w + H_H_GAP), y, w, isLeaf: false, yes: yesLayout, no: noLayout };
}

function hMaxX(node: HLayoutNode): number {
  const self = node.x + node.w;
  const children = [node.yes, node.no].filter(Boolean) as HLayoutNode[];
  if (children.length === 0) return self;
  return Math.max(self, ...children.map(hMaxX));
}

function hMaxY(node: HLayoutNode): number {
  const self = node.y + NODE_H;
  const children = [node.yes, node.no].filter(Boolean) as HLayoutNode[];
  if (children.length === 0) return self;
  return Math.max(self, ...children.map(hMaxY));
}

function offsetHLayout(node: HLayoutNode, dx: number, dy: number): HLayoutNode {
  return {
    ...node, x: node.x + dx, y: node.y + dy,
    yes: node.yes ? offsetHLayout(node.yes, dx, dy) : undefined,
    no: node.no ? offsetHLayout(node.no, dx, dy) : undefined,
  };
}

function drawHConnector(svg: SvgBuilder, px: number, py: number, cx: number, cy: number, stroke: string, width: number, labelText?: string): void {
  const midX = (px + cx) / 2;
  svg.path(`M ${px} ${py} L ${midX} ${py} L ${midX} ${cy} L ${cx} ${cy}`, {
    fill: 'none', stroke, 'stroke-width': width,
  });
  if (labelText) {
    svg.text(midX + 4, Math.min(py, cy) - 4, labelText, {
      'text-anchor': 'start', 'font-size': 10, fill: stroke, opacity: 0.7,
    });
  }
}

function renderHorizontal(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const yOff = { v: 0 };
  const layout = layoutHNode(data.root, 0, yOff);
  const tw = hMaxX(layout) + H_GAP;
  const th = hMaxY(layout);
  const depth = treeDepth(data.root);
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (horizontal)',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetHLayout(layout, pad, pad + titleH);
  drawHNode(svg, d, root, 0);
  return svg.build();
}

function drawHNode(svg: SvgBuilder, d: DesignPreset, node: HLayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  if (d.lineJitter) {
    // Sketch: jittered rect for all nodes
    svg.path(jitterRect(node.x, node.y, node.w, NODE_H, depth * 11 + node.x), {
      fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
    });
  } else if (d.id === 'neon') {
    // Neon: dark fill + neon stroke
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: d.borderRadius,
    });
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: 'none', stroke: color, 'stroke-width': 1.5, rx: d.borderRadius,
      opacity: 0.3, filter: 'url(#neon-glow)',
    });
  } else if (node.isLeaf) {
    drawPresetCard(svg, d, node.x, node.y, node.w, NODE_H, color);
  } else {
    svg.rect(node.x, node.y, node.w, NODE_H, {
      fill: `url(#dt${depth})`, rx: d.borderRadius > 8 ? 6 : d.borderRadius,
      stroke: 'white', 'stroke-width': 1.5,
    });
  }

  const fit = fitText(node.label, node.w - 20, 1, 12);
  svg.text(cx, cy + 4, fit.lines[0]!, {
    'text-anchor': 'middle', 'font-size': fit.fontSize,
    'font-weight': node.isLeaf ? d.fontWeight : 700,
    fill: d.id === 'neon' ? color : (node.isLeaf ? d.text : 'white'),
  });

  const right = node.x + node.w;
  if (node.yes) {
    if (d.lineJitter) {
      svg.path(jitterLine(right, cy, node.yes.x, node.yes.y + NODE_H / 2, depth * 31), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.text((right + node.yes.x) / 2 + 4, Math.min(cy, node.yes.y + NODE_H / 2) - 4, 'Yes', {
        'text-anchor': 'start', 'font-size': 10, fill: d.text, opacity: 0.7,
      });
    } else if (d.id === 'neon') {
      drawHConnector(svg, right, cy, node.yes.x, node.yes.y + NODE_H / 2, color, 2, 'Yes');
    } else {
      drawHConnector(svg, right, cy, node.yes.x, node.yes.y + NODE_H / 2, depthColor(d, depth), 1.5, 'Yes');
    }
    drawHNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    if (d.lineJitter) {
      svg.path(jitterLine(right, cy, node.no.x, node.no.y + NODE_H / 2, depth * 37), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.text((right + node.no.x) / 2 + 4, Math.min(cy, node.no.y + NODE_H / 2) - 4, 'No', {
        'text-anchor': 'start', 'font-size': 10, fill: d.text, opacity: 0.7,
      });
    } else if (d.id === 'neon') {
      drawHConnector(svg, right, cy, node.no.x, node.no.y + NODE_H / 2, color, 2, 'No');
    } else {
      drawHConnector(svg, right, cy, node.no.x, node.no.y + NODE_H / 2, depthColor(d, depth), 1.5, 'No');
    }
    drawHNode(svg, d, node.no, depth + 1);
  }
}

// ========== FLOWCHART ==========
// Diamond decision nodes, rectangular outcome nodes, Yes/No on edges

function renderFlowchart(data: DecisionTreeData, title: string | undefined, d: DesignPreset): string {
  const pad = 48;
  const titleH = title ? 44 : 0;
  const xOff = { v: 0 };
  const layout = layoutNode(data.root, 0, xOff);
  const tw = layoutWidth(layout) + H_GAP;
  const depth = treeDepth(data.root);
  const th = depth * (NODE_H + V_GAP) - V_GAP + NODE_H;
  const width = tw + pad * 2;
  const height = th + pad * 2 + titleH;

  const { svg, defs } = createDiagramSvg(d, width, height, title, 'Decision tree (flowchart)',
    buildColorGradients(d, depth, 'dt'));
  svg.defs(defs);
  if (d.lineJitter) {
    drawSketchBackground(svg, width, height, d.bg);
  } else if (d.shapeRendering === 'crispEdges') {
    drawPixelBackground(svg, width, height, d.bg);
  } else {
    drawBackground(svg, d, width, height);
  }
  if (title) drawTitle(svg, d, title, width, pad);

  const root = offsetLayout(layout, pad, pad + titleH);
  drawFlowchartNode(svg, d, root, 0);
  return svg.build();
}

function drawFlowchartNode(svg: SvgBuilder, d: DesignPreset, node: LayoutNode, depth: number): void {
  const color = depthColor(d, depth);
  const cx = node.x + node.w / 2;
  const cy = node.y + NODE_H / 2;

  const yesColor = d.id === 'neon' ? '#00E676' : '#4CAF50';
  const noColor = d.id === 'neon' ? '#FF5252' : '#F44336';

  if (node.isLeaf) {
    if (d.lineJitter) {
      svg.path(jitterRect(node.x, node.y, node.w, NODE_H, depth * 11 + node.x), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.rect(node.x, node.y, node.w, NODE_H, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1, rx: 6,
      });
      svg.rect(node.x, node.y, node.w, NODE_H, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, rx: 6,
        opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      // Rectangular outcome node with rounded corners
      svg.rect(node.x + 2, node.y + 2, node.w, NODE_H, {
        fill: '#000', opacity: 0.05, rx: 6,
      });
      svg.rect(node.x, node.y, node.w, NODE_H, {
        fill: d.surface, stroke: color, 'stroke-width': 2, rx: 6,
      });
    }
    const fit = fitText(node.label, node.w - 16, 1, 12);
    svg.text(cx, cy + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': d.fontWeight,
      fill: d.id === 'neon' ? color : d.text,
      'data-field': `${node.dataPath}.label`,
    });
  } else {
    // Diamond decision node
    const hw = node.w / 2 + 8;
    if (d.lineJitter) {
      // Sketch diamond (no jitter helper for diamond, use regular path)
      svg.path(`M ${cx} ${node.y - 4} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H + 4} L ${cx - hw} ${cy} Z`, {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.path(`M ${cx} ${node.y - 4} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H + 4} L ${cx - hw} ${cy} Z`, {
        fill: 'rgba(0,0,0,0.4)', stroke: color, 'stroke-width': 1,
      });
      svg.path(`M ${cx} ${node.y - 4} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H + 4} L ${cx - hw} ${cy} Z`, {
        fill: 'none', stroke: color, 'stroke-width': 1.5, opacity: 0.3, filter: 'url(#neon-glow)',
      });
    } else {
      // Shadow
      svg.path(`M ${cx + 2} ${node.y + 2} L ${cx + hw + 2} ${cy + 2} L ${cx + 2} ${node.y + NODE_H + 6} L ${cx - hw + 2} ${cy + 2} Z`, {
        fill: '#000', opacity: 0.05,
      });
      // Diamond
      svg.path(`M ${cx} ${node.y - 4} L ${cx + hw} ${cy} L ${cx} ${node.y + NODE_H + 4} L ${cx - hw} ${cy} Z`, {
        fill: color, opacity: 0.15, stroke: color, 'stroke-width': 2,
      });
    }
    const fit = fitText(node.label, node.w - 16, 1, 12);
    svg.text(cx, cy + 4, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 700, fill: color,
      'data-field': `${node.dataPath}.label`,
    });
  }

  const bottom = node.y + NODE_H;
  if (node.yes) {
    const childCx = node.yes.x + node.yes.w / 2;
    const midY = (bottom + node.yes.y) / 2;
    if (d.lineJitter) {
      svg.path(jitterLine(cx, bottom + 4, cx, midY, depth * 31), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(cx, midY, childCx, midY, depth * 37), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(childCx, midY, childCx, node.yes.y, depth * 43), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.path(`M ${cx} ${bottom + 4} L ${cx} ${midY} L ${childCx} ${midY} L ${childCx} ${node.yes.y}`, {
        fill: 'none', stroke: yesColor, 'stroke-width': 2, filter: 'url(#neon-glow)',
      });
    } else {
      svg.path(`M ${cx} ${bottom + 4} L ${cx} ${midY} L ${childCx} ${midY} L ${childCx} ${node.yes.y}`, {
        fill: 'none', stroke: yesColor, 'stroke-width': 2,
      });
    }
    svg.text((cx + childCx) / 2, midY - 5, 'Yes', {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: yesColor,
    });
    drawFlowchartNode(svg, d, node.yes, depth + 1);
  }
  if (node.no) {
    const childCx = node.no.x + node.no.w / 2;
    const midY = (bottom + node.no.y) / 2;
    if (d.lineJitter) {
      svg.path(jitterLine(cx, bottom + 4, cx, midY, depth * 47), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(cx, midY, childCx, midY, depth * 53), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
      svg.path(jitterLine(childCx, midY, childCx, node.no.y, depth * 59), {
        fill: 'none', stroke: d.border, 'stroke-width': d.borderWidth,
      });
    } else if (d.id === 'neon') {
      svg.path(`M ${cx} ${bottom + 4} L ${cx} ${midY} L ${childCx} ${midY} L ${childCx} ${node.no.y}`, {
        fill: 'none', stroke: noColor, 'stroke-width': 2, filter: 'url(#neon-glow)',
      });
    } else {
      svg.path(`M ${cx} ${bottom + 4} L ${cx} ${midY} L ${childCx} ${midY} L ${childCx} ${node.no.y}`, {
        fill: 'none', stroke: noColor, 'stroke-width': 2,
      });
    }
    svg.text((cx + childCx) / 2, midY - 5, 'No', {
      'text-anchor': 'middle', 'font-size': 10, 'font-weight': 600, fill: noColor,
    });
    drawFlowchartNode(svg, d, node.no, depth + 1);
  }
}
