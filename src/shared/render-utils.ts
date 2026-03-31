// Shared rendering utilities for all diagram types + design presets

import { SvgBuilder, radialGradient } from './svg.js';
import type { DesignPreset } from './design.js';
import { fitText, estimateWidth, type FitResult } from './text.js';
import { icon as iconSvg } from './icons.js';

// Simple hash-based jitter for sketch wobble (-1 to 1 range)
function hashJitter(val: number, offset: number): number {
  const s = Math.sin((val + offset) * 127.1 + offset * 311.7) * 43758.5453;
  return ((s - Math.floor(s)) - 0.5) * 1.6;  // -0.8 to 0.8
}

// --- Width helper: ensure title fits ---

export function ensureTitleFits(contentWidth: number, title: string | undefined, d: DesignPreset, pad: number): number {
  if (!title) return contentWidth;
  const titleW = estimateWidth(title, d.titleSize) + pad * 2 + 16;
  return Math.max(contentWidth, titleW);
}

// --- SVG scaffold ---

export interface DiagramLayout {
  width: number;
  height: number;
  contentTop: number;
  pad: number;
}

export const FOOTER_MARGIN = 24; // Space for branding logo at bottom-right

export function createDiagramSvg(
  d: DesignPreset,
  width: number,
  height: number,
  title: string | undefined,
  desc: string,
  extraDefs = '',
): { svg: SvgBuilder; defs: string } {
  const svg = new SvgBuilder(width, height + FOOTER_MARGIN, title ?? desc, d.fontFamily, d.fontImport, d.bg);
  if (title) svg.title(title);
  svg.desc(desc);

  // Footer branding — subtle "Figney" text at bottom-right
  const isDark = d.id === 'neon' || d.id === 'glass' || d.id === 'pixel';
  svg.setFooter(isDark ? 'rgba(255,255,255,0.25)' : d.textSecondary, isDark ? 1 : 0.3);

  const defs = [d.shadow, d.cardShadow, d.extraDefs, extraDefs]
    .filter(Boolean)
    .join('');

  return { svg, defs };
}

// Actual viewBox height (content height + footer margin)
export function viewBoxHeight(contentHeight: number): number {
  return contentHeight + FOOTER_MARGIN;
}

export function drawBackground(svg: SvgBuilder, d: DesignPreset, width: number, height: number, _includeFooter = true): void {
  // Always draw background to full viewBox height (content + footer margin)
  height = height + FOOTER_MARGIN;
  if (d.id === 'bold') {
    // White bg with halftone pattern overlay + thick dark border frame
    svg.rect(0, 0, width, height, { fill: d.bg, rx: d.borderRadius });
    svg.rect(0, 0, width, height, { fill: 'url(#halftone)', rx: d.borderRadius });
    svg.rect(3, 3, width - 6, height - 6, {
      fill: 'none', stroke: d.border, 'stroke-width': 3, rx: Math.max(0, d.borderRadius - 2),
    });
  } else if (d.id === 'minimal') {
    // Clean flat bg — no border, no shadow
    svg.rect(0, 0, width, height, { fill: d.bg, rx: d.borderRadius });
  } else if (d.id === 'neon') {
    // Cyberpunk: dark bg + grid lines + corner accents
    svg.rect(0, 0, width, height, { fill: 'url(#neon-bg)', rx: d.borderRadius });
    svg.raw(`<defs><pattern id="neon-grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse"><line x1="40" y1="0" x2="40" y2="40" stroke="rgba(0,255,255,0.04)" stroke-width="0.5"/><line x1="0" y1="40" x2="40" y2="40" stroke="rgba(0,255,255,0.04)" stroke-width="0.5"/></pattern></defs>`);
    svg.rect(0, 0, width, height, { fill: 'url(#neon-grid)' });
    // Corner brackets
    const cm = 14;
    svg.path(`M ${cm} 1 L 1 1 L 1 ${cm}`, { fill: 'none', stroke: '#00FFFF', 'stroke-width': 1, opacity: 0.4 });
    svg.path(`M ${width - cm} 1 L ${width - 1} 1 L ${width - 1} ${cm}`, { fill: 'none', stroke: '#FF00FF', 'stroke-width': 1, opacity: 0.4 });
    svg.path(`M 1 ${height - cm} L 1 ${height - 1} L ${cm} ${height - 1}`, { fill: 'none', stroke: '#FF00FF', 'stroke-width': 1, opacity: 0.4 });
    svg.path(`M ${width - 1} ${height - cm} L ${width - 1} ${height - 1} L ${width - cm} ${height - 1}`, { fill: 'none', stroke: '#00FFFF', 'stroke-width': 1, opacity: 0.4 });
  } else if (d.id === 'glass') {
    // Gradient background for glass
    svg.rect(0, 0, width, height, { fill: 'url(#glass-bg)', rx: d.borderRadius });
    // Subtle noise overlay
    svg.rect(0, 0, width, height, { fill: d.bg, rx: d.borderRadius, opacity: 0.3 });
    // Subtle grid pattern (using <pattern> for performance)
    svg.raw(`<defs><pattern id="glass-dots" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse"><circle cx="40" cy="40" r="0.3" fill="rgba(255,255,255,0.03)"/></pattern></defs>`);
    svg.rect(0, 0, width, height, { fill: 'url(#glass-dots)', rx: d.borderRadius });
  } else if (d.id === 'watercolor') {
    svg.rect(0, 0, width, height, { fill: d.bg, rx: d.borderRadius });
    // Soft paper texture via subtle noise
    svg.rect(2, 2, width - 4, height - 4, { fill: '#F0E8D8', rx: d.borderRadius, opacity: 0.15, filter: 'url(#wc-blur)' });
    // Paper fiber texture pattern
    svg.raw(`<defs><pattern id="wc-paper" x="0" y="0" width="80" height="80" patternUnits="userSpaceOnUse">` +
      `<path d="M 8 40 Q 20 35 32 40 T 56 40" stroke="#D4C8B0" stroke-width="0.4" fill="none" opacity="0.06"/>` +
      `<path d="M 0 20 Q 15 18 30 22 T 60 19" stroke="#C8B8A0" stroke-width="0.3" fill="none" opacity="0.05"/>` +
      `<path d="M 10 60 Q 25 57 45 62 T 70 58" stroke="#D4C8B0" stroke-width="0.3" fill="none" opacity="0.05"/>` +
      `<circle cx="50" cy="30" r="8" fill="#D4C8B0" opacity="0.02"/>` +
      `</pattern></defs>`);
    svg.rect(0, 0, width, height, { fill: 'url(#wc-paper)' });
  } else {
    svg.rect(0, 0, width, height, {
      fill: d.bg,
      rx: d.id === 'pixel' ? 0 : 20,
      ...(d.shadow ? { filter: 'url(#shadow)' } : {}),
    });
  }
}

export function drawTitle(svg: SvgBuilder, d: DesignPreset, title: string, width: number, pad: number): void {
  const cx = width / 2;
  const ty = pad + 30;

  if (d.id === 'bold') {
    // Background pill behind title — clamp to viewBox width
    const boldTy = pad + 38;
    const maxBannerW = width - 12;
    const rawTextW = estimateWidth(title, d.titleSize) + 32;
    const bannerW = Math.min(rawTextW, maxBannerW);
    const bannerH = 38;
    svg.rect(cx - bannerW / 2, boldTy - 24, bannerW, bannerH, { fill: d.primary, rx: 6, filter: 'url(#bold-offset)' });
    const fit = fitText(title, bannerW - 24, 1, d.titleSize);
    svg.text(cx, boldTy - 2, fit.lines[0]!, {
      'text-anchor': 'middle', 'font-size': fit.fontSize, 'font-weight': 900, fill: '#FFFFFF',
      'data-field': 'title',
    });
  } else if (d.id === 'neon') {
    svg.text(cx, ty, title, {
      'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 400,
      fill: d.primary, 'letter-spacing': '2', filter: 'url(#neon-glow)',
      'data-field': 'title',
    });
    // Underline with dual-color glow
    const textW = estimateWidth(title, d.titleSize);
    svg.line(cx - textW / 2 - 10, ty + 10, cx + textW / 2 + 10, ty + 10, {
      stroke: '#FF00FF', 'stroke-width': 1, opacity: 0.5,
    });
    svg.line(cx - textW / 2, ty + 12, cx + textW / 2, ty + 12, {
      stroke: '#00FFFF', 'stroke-width': 0.5, opacity: 0.3,
    });
  } else if (d.id === 'glass') {
    svg.text(cx, ty, title, {
      'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 500,
      fill: d.text, 'letter-spacing': '1', 'data-field': 'title',
    });
    // Subtle underline glow
    const textW = estimateWidth(title, d.titleSize);
    svg.line(cx - textW / 2, ty + 8, cx + textW / 2, ty + 8, {
      stroke: d.primary, 'stroke-width': 1, opacity: 0.3,
    });
  } else if (d.id === 'watercolor') {
    // Decorative swash under serif title
    const textW = estimateWidth(title, d.titleSize);
    svg.path(`M ${cx - textW / 2 - 10} ${ty + 10} Q ${cx} ${ty + 18} ${cx + textW / 2 + 10} ${ty + 10}`, {
      fill: 'none', stroke: d.primary, 'stroke-width': 1.5, opacity: 0.3,
    });
    svg.text(cx, ty, title, {
      'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 600, fill: d.text,
      'data-field': 'title',
    });
  } else if (d.id === 'minimal') {
    svg.text(cx, ty, title, {
      'text-anchor': 'middle', 'font-size': d.titleSize, 'font-weight': 700, fill: d.text,
      'data-field': 'title',
    });
    svg.rect(cx - 20, ty + 8, 40, 3, { fill: d.primary, rx: 1.5 });
  } else {
    const attrs: Record<string, string | number> = {
      'text-anchor': 'middle',
      'font-size': d.titleSize,
      'font-weight': 700,
      fill: d.text,
    };
    if (d.id === 'sketch') attrs['text-decoration'] = 'underline';
    attrs['data-field'] = 'title';
    svg.text(cx, ty, title, attrs);
  }
}

// --- Label + description block ---

export function drawLabelBlock(
  svg: SvgBuilder,
  d: DesignPreset,
  label: string,
  description: string | undefined,
  cx: number,
  startY: number,
  maxWidth: number,
  anchor = 'middle',
  dataPath?: string,
): number {
  const fit = fitText(label, maxWidth, 2, d.labelSize);
  const lh = Math.round(fit.fontSize * 1.6);
  let y = startY;

  const labelAttrs: Record<string, string | number> = {
    'text-anchor': anchor,
    'font-size': fit.fontSize,
    'font-weight': d.fontWeight,
    fill: d.text,
  };
  if (d.id === 'glass') labelAttrs['letter-spacing'] = '0.3';
  if (dataPath) labelAttrs['data-field'] = `${dataPath}.label`;

  for (const line of fit.lines) {
    svg.text(cx, y, line, labelAttrs);
    y += lh;
  }

  if (description) {
    const dfit = fitText(description, maxWidth, 2, d.captionSize);
    const dlh = Math.round(dfit.fontSize * 1.3);
    y += 3;
    const descAttrs: Record<string, string | number> = {
      'text-anchor': anchor,
      'font-size': dfit.fontSize,
      fill: d.textSecondary,
    };
    if (dataPath) descAttrs['data-field'] = `${dataPath}.description`;
    for (const line of dfit.lines) {
      svg.text(cx, y, line, descAttrs);
      y += dlh;
    }
  }

  return y;
}

// --- Horizontal step layout ---

export interface StepLayout {
  count: number;
  stepW: number;
  stepH: number;
  arrowW: number;
  pad: number;
  titleH: number;
  width: number;
  height: number;
  contentTop: number;
  cx: (i: number) => number;
  cy: () => number;
}

export function computeHorizontalStepLayout(
  count: number,
  stepW: number,
  stepH: number,
  arrowW: number,
  pad: number,
  hasTitle: boolean,
): StepLayout {
  const titleH = hasTitle ? 44 : 0;
  const totalW = count * stepW + (count - 1) * arrowW;
  const width = pad * 2 + totalW;
  const height = pad * 2 + titleH + stepH;
  const contentTop = pad + titleH;

  return {
    count, stepW, stepH, arrowW, pad, titleH, width, height, contentTop,
    cx: (i) => pad + i * (stepW + arrowW) + stepW / 2,
    cy: () => contentTop + stepH / 2,
  };
}

// --- Color gradients for N items ---

export function buildColorGradients(d: DesignPreset, count: number, prefix = 'cg'): string {
  // Dark presets: use surface color for highlight instead of white
  const isDark = d.id === 'neon' || d.id === 'glass' || d.id === 'pixel';
  const highlight = isDark ? d.surface : 'white';
  let defs = '';
  for (let i = 0; i < count; i++) {
    defs += radialGradient(`${prefix}${i}`, d.colors[i % d.colors.length]!, highlight);
  }
  return defs;
}

// --- Arrow marker ---

export function arrowMarkerDef(d: DesignPreset, id = 'arr'): string {
  return `<marker id="${id}" markerWidth="10" markerHeight="8" refX="9" refY="4" orient="auto">` +
    `<path d="M 0 0 L 10 4 L 0 8 Z" fill="${d.border}" opacity="0.35"/></marker>`;
}

// --- Color-blind friendly patterns ---

const HATCH_PATTERNS = [
  { angle: 45, gap: 6 },   // diagonal right
  { angle: -45, gap: 6 },  // diagonal left
  { angle: 0, gap: 5 },    // horizontal
  { angle: 90, gap: 5 },   // vertical
  { angle: 45, gap: 3 },   // dense diagonal
  { angle: -45, gap: 3 },  // dense diagonal left
  { angle: 30, gap: 7 },   // shallow diagonal
  { angle: 60, gap: 7 },   // steep diagonal
  { angle: 0, gap: 3 },    // dense horizontal
  { angle: 90, gap: 3 },   // dense vertical
];

export function buildHatchPatterns(count: number, prefix = 'hatch'): string {
  let defs = '';
  for (let i = 0; i < count; i++) {
    const p = HATCH_PATTERNS[i % HATCH_PATTERNS.length]!;
    const id = `${prefix}${i}`;
    defs += `<pattern id="${id}" width="${p.gap}" height="${p.gap}" patternUnits="userSpaceOnUse" patternTransform="rotate(${p.angle})">` +
      `<line x1="0" y1="0" x2="0" y2="${p.gap}" stroke="rgba(0,0,0,0.15)" stroke-width="1"/></pattern>`;
  }
  return defs;
}

// --- Preset-aware card drawing ---

export function drawPresetCard(
  svg: SvgBuilder, d: DesignPreset,
  x: number, y: number, w: number, h: number,
  accentColor?: string,
): void {
  svg.rect(x, y, w, h, {
    fill: d.surface,
    stroke: d.borderWidth > 0 ? d.border : 'none',
    'stroke-width': d.borderWidth,
    rx: d.borderRadius,
    ...d.cardAttrs(),
  });

  if (accentColor) {
    if (d.id === 'bold') {
      // Thick color bar at top
      svg.rect(x + 1, y + 1, w - 2, 5, { fill: accentColor, rx: 2 });
    } else if (d.id === 'minimal') {
      // Left edge accent strip
      svg.rect(x, y + 4, 4, h - 8, { fill: accentColor, rx: 2 });
    } else if (d.id === 'watercolor') {
      // No accent bar — let the displacement filter speak
    } else if (d.id === 'neon') {
      // Neon border glow
      svg.rect(x, y, w, h, {
        fill: 'none', stroke: accentColor, 'stroke-width': 1, rx: d.borderRadius,
        opacity: 0.4, filter: 'url(#neon-glow)',
      });
    } else {
      // clean / glass: thin top accent
      svg.rect(x + 12, y + 1, w - 24, 3, { fill: accentColor, rx: 1.5 });
    }
  }
}

// --- Preset-aware icon node (circle with icon) ---

export function drawIconNode(
  svg: SvgBuilder, d: DesignPreset,
  cx: number, cy: number, r: number,
  color: string, gradientId: string,
  iconName: string, iconSize: number,
): void {
  if (d.id === 'sketch') {
    // Slightly wobbly ellipse for hand-drawn feel
    const rx = r + hashJitter(cx, 0) * 2;
    const ry = r + hashJitter(cy, 1) * 2;
    svg.raw(`<ellipse cx="${cx + hashJitter(cx, 2) * 1.5}" cy="${cy + hashJitter(cy, 3) * 1.5}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="2"/>`);
    svg.raw(iconSvg(iconName, cx, cy, iconSize, color));
  } else if (d.id === 'bold') {
    svg.circle(cx, cy, r + 2, { fill: color, stroke: '#111', 'stroke-width': 3 });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, 'white'));
  } else if (d.id === 'minimal') {
    svg.circle(cx, cy, r, { fill: color });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, 'white'));
  } else if (d.id === 'glass') {
    svg.circle(cx, cy, r + 4, { fill: color, opacity: 0.15 });
    svg.circle(cx, cy, r, { fill: color, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1 });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, 'white'));
  } else if (d.id === 'neon') {
    // Neon glow outline circle
    svg.circle(cx, cy, r + 2, { fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' });
    svg.circle(cx, cy, r - 2, { fill: 'rgba(0,0,0,0.3)' });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, color));
  } else if (d.id === 'watercolor') {
    svg.circle(cx, cy, r + 4, { fill: color, opacity: 0.15, filter: 'url(#watercolor)' });
    svg.circle(cx, cy, r, { fill: color, opacity: 0.6, filter: 'url(#watercolor)' });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, d.text));
  } else if (d.id === 'pixel') {
    svg.circle(cx, cy, r, { fill: color, 'shape-rendering': 'crispEdges' });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, d.bg));
  } else {
    // clean default
    svg.circle(cx, cy, r + 6, { fill: color, opacity: 0.08 });
    svg.circle(cx, cy, r, { fill: `url(#${gradientId})`, stroke: 'white', 'stroke-width': 2 });
    svg.raw(iconSvg(iconName, cx, cy, iconSize, 'white'));
  }
}

// --- Sketch background (dot grid) ---

export function drawSketchBackground(svg: SvgBuilder, width: number, height: number, bg: string): void {
  const h = height + FOOTER_MARGIN;
  svg.rect(0, 0, width, h, { fill: bg, rx: 4 });
  svg.raw(`<defs><pattern id="sketch-dots" x="0" y="0" width="28" height="28" patternUnits="userSpaceOnUse"><circle cx="14" cy="14" r="0.5" fill="#CCC" opacity="0.2"/></pattern></defs>`);
  svg.rect(0, 0, width, h, { fill: 'url(#sketch-dots)' });
}

// --- Pixel background (scanlines) ---

export function drawPixelBackground(svg: SvgBuilder, width: number, height: number, bg: string): void {
  const h = height + FOOTER_MARGIN;
  svg.rect(0, 0, width, h, { fill: bg, 'shape-rendering': 'crispEdges' });
  svg.raw(`<defs><pattern id="scanlines" x="0" y="0" width="4" height="4" patternUnits="userSpaceOnUse"><line x1="0" y1="0" x2="4" y2="0" stroke="#000" stroke-width="0.5" opacity="0.2" shape-rendering="crispEdges"/></pattern></defs>`);
  svg.rect(0, 0, width, h, { fill: 'url(#scanlines)', 'shape-rendering': 'crispEdges' });
}
