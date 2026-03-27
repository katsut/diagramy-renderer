// Design system — cross-cutting visual style that applies to ALL diagram types
// Each design preset controls: colors, shadows, borders, corners, line style, text style

export interface DesignPreset {
  id: string;
  label: string;

  // Colors
  primary: string;
  bg: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  colors: string[];

  // Shape
  borderRadius: number;      // base corner radius
  borderWidth: number;
  strokeDasharray?: string;   // for sketch style

  // Shadows & filters
  shadow: string;            // filter defs
  cardShadow: string;
  extraDefs: string;         // additional SVG defs (e.g. turbulence for watercolor)

  // Text
  fontFamily: string;        // CSS font-family string
  fontImport?: string;       // Google Fonts @import URL (embedded in SVG <style>)
  fontWeight: number;
  titleSize: number;
  labelSize: number;
  captionSize: number;

  // Line rendering
  shapeRendering?: string;   // e.g. "crispEdges" for pixel
  lineJitter?: boolean;      // sketch: add randomness to paths

  // Helpers
  nodeAttrs: (color: string) => Record<string, string | number>;
  cardAttrs: () => Record<string, string | number>;
}

// ---------- CLEAN ----------
const CLEAN: DesignPreset = {
  id: 'clean',
  label: 'Clean',
  fontFamily: "'Noto Sans JP', 'Inter', 'Hiragino Sans', 'Helvetica Neue', system-ui, sans-serif",
  fontImport: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&family=Noto+Sans+JP:wght@400;600;700&display=swap',
  primary: '#3B82F6',
  bg: '#FFFFFF',
  surface: '#F8FAFC',
  text: '#1E293B',
  textSecondary: '#64748B',
  border: '#E2E8F0',
  colors: ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'],
  borderRadius: 14,
  borderWidth: 1,
  shadow: `<filter id="shadow" x="-4%" y="-4%" width="108%" height="112%"><feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.08"/></filter>`,
  cardShadow: `<filter id="card-shadow" x="-4%" y="-4%" width="108%" height="112%"><feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.06"/></filter>`,
  extraDefs: '',
  fontWeight: 600,
  titleSize: 21,
  labelSize: 14,
  captionSize: 11,
  nodeAttrs: (color) => ({ fill: color, stroke: 'white', 'stroke-width': 2 }),
  cardAttrs: () => ({ filter: 'url(#card-shadow)' }),
};

// ---------- SKETCH ----------
const SKETCH: DesignPreset = {
  id: 'sketch',
  label: 'Sketch',
  fontFamily: "'Yomogi', 'Klee One', 'Segoe Script', 'Comic Sans MS', 'Hiragino Maru Gothic ProN', cursive",
  fontImport: 'https://fonts.googleapis.com/css2?family=Yomogi&family=Klee+One:wght@400;600&display=swap',
  primary: '#2D2D2D',
  bg: '#FFFEF9',
  surface: '#FFFEF9',
  text: '#2D2D2D',
  textSecondary: '#777777',
  border: '#2D2D2D',
  colors: ['#2D2D2D', '#8B4513', '#2E8B57', '#4682B4', '#CD853F', '#708090', '#BC8F8F', '#556B2F', '#8B6914', '#5F9EA0'],
  borderRadius: 3,
  borderWidth: 2,
  strokeDasharray: undefined,
  shadow: '',
  cardShadow: '',
  extraDefs: '',  // rough filter removed — jitter is achieved via path randomization
  fontWeight: 400,
  titleSize: 22,
  labelSize: 14,
  captionSize: 11,
  lineJitter: true,
  nodeAttrs: (color) => ({ fill: 'none', stroke: color, 'stroke-width': 2 }),
  cardAttrs: () => ({}),
};

// ---------- PIXEL ----------
const PIXEL: DesignPreset = {
  id: 'pixel',
  label: 'Pixel',
  fontFamily: "'DotGothic16', 'Courier New', 'MS Gothic', 'Osaka-Mono', monospace",
  fontImport: 'https://fonts.googleapis.com/css2?family=DotGothic16&display=swap',
  primary: '#E94560',
  bg: '#0C0C14',        // darker than neon (#0A0A1A) — pure retro CRT black
  surface: '#141422',
  text: '#E0E0E0',
  textSecondary: '#8888AA',
  border: '#333366',
  colors: ['#E94560', '#0F3460', '#00D2FF', '#FFCC00', '#53D769', '#FF6B6B', '#4ECDC4', '#FFE66D', '#A29BFE', '#FD79A8'],
  borderRadius: 0,
  borderWidth: 2,
  shadow: '',
  cardShadow: '',
  extraDefs: '',
  fontWeight: 700,
  titleSize: 20,
  labelSize: 14,
  captionSize: 11,
  shapeRendering: 'crispEdges',
  nodeAttrs: (color) => ({ fill: color, stroke: '#000000', 'stroke-width': 2 }),
  cardAttrs: () => ({ 'shape-rendering': 'crispEdges' }),
};

// ---------- BOLD ----------
const BOLD: DesignPreset = {
  id: 'bold',
  label: 'Bold',
  fontFamily: "'M PLUS Rounded 1c', 'Rounded Mplus 1c', 'Hiragino Maru Gothic ProN', 'Arial Rounded MT Bold', system-ui, sans-serif",
  fontImport: 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@700;800;900&display=swap',
  primary: '#FF3366',
  bg: '#FFFDF7',           // warm off-white for POP art warmth
  surface: '#FFFFFF',
  text: '#111111',
  textSecondary: '#444444',
  border: '#111111',
  colors: ['#FF3366', '#3366FF', '#33CC66', '#FF9933', '#9933FF', '#FF6633', '#33CCCC', '#CC33FF', '#66CC33', '#3399FF'],
  borderRadius: 14,
  borderWidth: 3,
  shadow: '',
  cardShadow: '',
  extraDefs: `<filter id="bold-offset" x="-5%" y="-5%" width="115%" height="120%"><feFlood flood-color="#222" flood-opacity="0.7" result="flood"/><feComposite in="flood" in2="SourceAlpha" operator="in" result="shadow"/><feOffset dx="4" dy="4" result="offset"/><feGaussianBlur in="offset" stdDeviation="0.5" result="blurred"/><feMerge><feMergeNode in="blurred"/><feMergeNode in="SourceGraphic"/></feMerge></filter><pattern id="halftone" width="6" height="6" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1" fill="#111" opacity="0.06"/></pattern>`,
  fontWeight: 800,
  titleSize: 28,           // larger for poster impact
  labelSize: 16,
  captionSize: 13,
  nodeAttrs: (color) => ({ fill: color, stroke: '#111', 'stroke-width': 3 }),
  cardAttrs: () => ({ filter: 'url(#bold-offset)' }),
};

// ---------- MINIMAL ----------
// Line-only, no fills, generous whitespace, single accent color. Designed to embed anywhere.
const MINIMAL: DesignPreset = {
  id: 'minimal',
  label: 'Minimal',
  fontFamily: "'Inter', 'Noto Sans JP', 'Helvetica Neue', system-ui, sans-serif",
  fontImport: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Noto+Sans+JP:wght@300;400;500&display=swap',
  primary: '#0EA5E9',       // sky-500 — single calm accent
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  text: '#334155',           // slate-700 — softer than black
  textSecondary: '#94A3B8',  // slate-400
  border: '#CBD5E1',         // slate-300
  colors: ['#0EA5E9', '#64748B', '#94A3B8', '#0EA5E9', '#64748B', '#94A3B8', '#0EA5E9', '#64748B', '#94A3B8', '#0EA5E9'],
  borderRadius: 6,
  borderWidth: 1,
  shadow: '',
  cardShadow: '',
  extraDefs: '',
  fontWeight: 400,
  titleSize: 20,
  labelSize: 13,
  captionSize: 11,
  nodeAttrs: (color) => ({ fill: 'none', stroke: color, 'stroke-width': 1.5 }),
  cardAttrs: () => ({ filter: '' }),
};

// ---------- GLASS ----------
const GLASS: DesignPreset = {
  id: 'glass',
  label: 'Glass',
  fontFamily: "'Noto Sans JP', 'SF Pro Display', 'Hiragino Sans', 'Segoe UI', system-ui, sans-serif",
  fontImport: 'https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300;500;700&display=swap',
  primary: '#7C3AED',
  bg: '#0F0A1E',
  surface: 'rgba(255,255,255,0.18)',
  text: '#FFFFFF',
  textSecondary: '#D4C5FD',     // slightly brighter for readability
  border: 'rgba(255,255,255,0.18)',
  colors: ['#7C3AED', '#EC4899', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#14B8A6', '#F97316', '#6366F1'],
  borderRadius: 16,
  borderWidth: 1,
  shadow: `<filter id="shadow" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12" result="blur"/><feComposite in="SourceGraphic" in2="blur"/></filter>`,
  cardShadow: `<filter id="card-shadow" x="-10%" y="-10%" width="120%" height="130%"><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/><feOffset dy="4" result="shifted"/><feFlood flood-color="#7C3AED" flood-opacity="0.15" result="color"/><feComposite in="color" in2="shifted" operator="in" result="shadow"/><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="frosted"/><feMerge><feMergeNode in="shadow"/><feMergeNode in="frosted"/></feMerge></filter>`,
  extraDefs: `<linearGradient id="glass-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#1A0A3E"/><stop offset="50%" stop-color="#0F0A1E"/><stop offset="100%" stop-color="#0A1628"/></linearGradient><linearGradient id="glass-highlight" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="rgba(255,255,255,0.08)"/><stop offset="100%" stop-color="rgba(255,255,255,0)"/></linearGradient>`,
  fontWeight: 500,
  titleSize: 24,
  labelSize: 15,
  captionSize: 12,
  nodeAttrs: (color) => ({ fill: color, stroke: 'rgba(255,255,255,0.2)', 'stroke-width': 1 }),
  cardAttrs: () => ({ filter: 'url(#card-shadow)' }),
};

// ---------- WATERCOLOR ----------
const WATERCOLOR: DesignPreset = {
  id: 'watercolor',
  label: 'Watercolor',
  fontFamily: "'Zen Old Mincho', 'Hiragino Mincho ProN', 'Noto Serif JP', 'Yu Mincho', Georgia, serif",
  fontImport: 'https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;600;700&display=swap',
  primary: '#6B8E9B',
  bg: '#FDF8F0',
  surface: '#FDF8F0',
  text: '#3A3A3A',
  textSecondary: '#757575',
  border: '#C8B8A8',
  colors: ['#7BAAB5', '#E8A87C', '#D4756B', '#8FC0A9', '#C8B8A8', '#B8A9C8', '#A8C8B8', '#C8A8B8', '#B8C8A8', '#A8B8C8'],
  borderRadius: 20,
  borderWidth: 0,
  shadow: '',
  cardShadow: '',
  extraDefs: `<filter id="watercolor" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blurred"/><feTurbulence type="fractalNoise" baseFrequency="0.025" numOctaves="4" seed="1" result="noise"/><feDisplacementMap in="blurred" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="wc-light" x="-4%" y="-4%" width="108%" height="108%"><feGaussianBlur in="SourceGraphic" stdDeviation="0.5" result="blurred"/><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="3" seed="2" result="noise"/><feDisplacementMap in="blurred" in2="noise" scale="1" xChannelSelector="R" yChannelSelector="G"/></filter><filter id="wc-blur" x="-4%" y="-4%" width="108%" height="108%"><feGaussianBlur stdDeviation="1.5"/></filter>`,
  fontWeight: 400,
  titleSize: 23,
  labelSize: 15,
  captionSize: 11,
  nodeAttrs: (color) => ({ fill: color, opacity: 0.85, filter: 'url(#watercolor)' }),
  cardAttrs: () => ({ filter: 'url(#watercolor)', opacity: 0.85 }),
};

// ---------- NEON ----------
const NEON: DesignPreset = {
  id: 'neon',
  label: 'Neon',
  fontFamily: "'Share Tech Mono', 'Noto Sans JP', 'Courier New', 'MS Gothic', monospace",
  fontImport: 'https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Noto+Sans+JP:wght@400;700&display=swap',
  primary: '#00FFFF',
  bg: '#0A0A0F',
  surface: 'rgba(0,255,255,0.04)',
  text: '#F0FFF0',
  textSecondary: '#80FFD0',
  border: 'rgba(0,255,255,0.3)',
  colors: ['#00FFFF', '#FF00FF', '#39FF14', '#FF1493', '#FFD700', '#00BFFF', '#FF4500', '#7FFF00', '#FF69B4', '#00FF7F'],
  borderRadius: 2,
  borderWidth: 1,
  shadow: `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="8" result="blur"/><feFlood flood-color="#00FFFF" flood-opacity="0.15" result="color"/><feComposite in="color" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  cardShadow: `<filter id="card-shadow" x="-15%" y="-15%" width="130%" height="140%"><feGaussianBlur in="SourceAlpha" stdDeviation="6" result="blur"/><feFlood flood-color="#00FFFF" flood-opacity="0.2" result="color"/><feComposite in="color" in2="blur" operator="in" result="glow"/><feMerge><feMergeNode in="glow"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  extraDefs: `<linearGradient id="neon-bg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0A0A1A"/><stop offset="100%" stop-color="#0A0A0F"/></linearGradient><filter id="neon-glow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`,
  fontWeight: 400,
  titleSize: 22,
  labelSize: 14,
  captionSize: 11,
  nodeAttrs: (color) => ({ fill: 'none', stroke: color, 'stroke-width': 2, filter: 'url(#neon-glow)' }),
  cardAttrs: () => ({ filter: 'url(#card-shadow)' }),
};

// ---------- Registry ----------
export const DESIGNS: Record<string, DesignPreset> = {
  clean: CLEAN,
  sketch: SKETCH,
  pixel: PIXEL,
  bold: BOLD,
  minimal: MINIMAL,
  glass: GLASS,
  neon: NEON,
  watercolor: WATERCOLOR,
};

let currentDesign = 'clean';

export function setDesign(id: string): void {
  if (DESIGNS[id]) currentDesign = id;
}

export function getDesign(): DesignPreset {
  return DESIGNS[currentDesign] ?? CLEAN;
}

export function getDesignId(): string {
  return currentDesign;
}

// --- Sketch line jitter utility ---
// Hash-based pseudo-random for deterministic but varied jitter
function hashRand(seed: number, offset: number): number {
  const s = Math.sin((seed + offset) * 127.1 + offset * 311.7) * 43758.5453;
  return (s - Math.floor(s)) - 0.5;
}

// Returns a path 'd' with slight random offsets to simulate hand-drawn lines
export function jitterLine(x1: number, y1: number, x2: number, y2: number, seed = 0): string {
  const j = 2.5;
  const r1 = hashRand(seed, 0) * j;
  const r2 = hashRand(seed, 1) * j;
  const r3 = hashRand(seed, 2) * j * 0.6;
  const r4 = hashRand(seed, 3) * j * 0.4;
  // Two control points for more wobbly curve
  const t1 = 0.33, t2 = 0.66;
  const cx1 = x1 + (x2 - x1) * t1 + r1;
  const cy1 = y1 + (y2 - y1) * t1 + r2;
  const cx2 = x1 + (x2 - x1) * t2 + r3;
  const cy2 = y1 + (y2 - y1) * t2 + r4;
  return `M ${x1 + r3 * 0.3} ${y1 + r1 * 0.2} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${x2 - r3 * 0.3} ${y2 - r2 * 0.2}`;
}

export function jitterRect(x: number, y: number, w: number, h: number, seed = 0): string {
  const j = 2.8;
  const r = (i: number) => hashRand(seed, i) * j;
  // Each edge is a wobbly cubic bezier, corners don't perfectly meet
  const tl = { x: x + r(0), y: y + r(1) };
  const tr = { x: x + w + r(2), y: y + r(3) };
  const br = { x: x + w + r(4), y: y + h + r(5) };
  const bl = { x: x + r(6), y: y + h + r(7) };
  // Midpoint jitter for each edge
  const m = (i: number) => hashRand(seed, i + 10) * j * 0.5;
  return `M ${tl.x} ${tl.y} ` +
    `C ${tl.x + w * 0.33 + m(0)} ${tl.y + m(1)}, ${tl.x + w * 0.66 + m(2)} ${tr.y + m(3)}, ${tr.x} ${tr.y} ` +
    `C ${tr.x + m(4)} ${tr.y + h * 0.33 + m(5)}, ${br.x + m(6)} ${tr.y + h * 0.66 + m(7)}, ${br.x} ${br.y} ` +
    `C ${br.x - w * 0.33 + m(8)} ${br.y + m(9)}, ${br.x - w * 0.66 + m(10)} ${bl.y + m(11)}, ${bl.x} ${bl.y} ` +
    `C ${bl.x + m(12)} ${bl.y - h * 0.33 + m(13)}, ${tl.x + m(14)} ${bl.y - h * 0.66 + m(15)}, ${tl.x} ${tl.y}`;
}

// --- Pixel grid utility ---
// Draws a rectangle as a grid of small squares
export function pixelRect(x: number, y: number, w: number, h: number, color: string, pixelSize = 4): string {
  const cols = Math.floor(w / pixelSize);
  const rows = Math.floor(h / pixelSize);
  let svg = `<g shape-rendering="crispEdges">`;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      svg += `<rect x="${x + c * pixelSize}" y="${y + r * pixelSize}" width="${pixelSize}" height="${pixelSize}" fill="${color}"/>`;
    }
  }
  svg += `</g>`;
  return svg;
}

// Pixel-style border (outline only)
export function pixelBorder(x: number, y: number, w: number, h: number, color: string, px = 3): string {
  let svg = `<g shape-rendering="crispEdges">`;
  // Top
  for (let i = 0; i < Math.floor(w / px); i++) {
    svg += `<rect x="${x + i * px}" y="${y}" width="${px}" height="${px}" fill="${color}"/>`;
  }
  // Bottom
  for (let i = 0; i < Math.floor(w / px); i++) {
    svg += `<rect x="${x + i * px}" y="${y + h - px}" width="${px}" height="${px}" fill="${color}"/>`;
  }
  // Left
  for (let i = 1; i < Math.floor(h / px) - 1; i++) {
    svg += `<rect x="${x}" y="${y + i * px}" width="${px}" height="${px}" fill="${color}"/>`;
  }
  // Right
  for (let i = 1; i < Math.floor(h / px) - 1; i++) {
    svg += `<rect x="${x + w - px}" y="${y + i * px}" width="${px}" height="${px}" fill="${color}"/>`;
  }
  svg += `</g>`;
  return svg;
}
