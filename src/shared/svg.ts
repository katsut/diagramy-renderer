// SVG builder utility — fluent API for constructing SVG strings

import { iconDefs } from './icons.js';

export function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class SvgBuilder {
  private parts: string[] = [];
  // footerConfig kept for API compatibility but no longer rendered
  // Branding is handled by the Rust API layer instead
  setFooter(_textColor: string, _opacity: number): void {}

  constructor(
    public readonly width: number,
    public readonly height: number,
    private ariaLabel: string = 'Diagram',
    fontFamily?: string,
    fontImport?: string,
    bgColor?: string,
  ) {
    const font = fontFamily || "'Noto Sans JP', system-ui, sans-serif";
    const bg = bgColor || '#FFFFFF';
    this.parts.push(
      `<svg xmlns="http://www.w3.org/2000/svg" xml:lang="ja" viewBox="0 0 ${width} ${height}" ` +
      `width="${width}" height="${height}" role="img" aria-label="${escapeXml(ariaLabel)}" ` +
      `font-family="${font}" style="background:${bg}">`,
    );
    if (fontImport) {
      const escaped = fontImport.replace(/&/g, '&amp;');
      this.parts.push(`<style>@import url('${escaped}');</style>`);
    }
  }

  raw(s: string): this {
    this.parts.push(s);
    return this;
  }

  title(text: string): this {
    this.parts.push(`<title>${escapeXml(text)}</title>`);
    return this;
  }

  desc(text: string): this {
    this.parts.push(`<desc>${escapeXml(text)}</desc>`);
    return this;
  }

  private defsContent = '';

  defs(content: string): this {
    this.defsContent += content;
    return this;
  }

  rect(x: number, y: number, w: number, h: number, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" ${a}/>`);
    return this;
  }

  circle(cx: number, cy: number, r: number, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<circle cx="${cx}" cy="${cy}" r="${r}" ${a}/>`);
    return this;
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" ${a}/>`);
    return this;
  }

  line(x1: number, y1: number, x2: number, y2: number, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${a}/>`);
    return this;
  }

  path(d: string, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<path d="${d}" ${a}/>`);
    return this;
  }

  text(x: number, y: number, content: string, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<text x="${x}" y="${y}" ${a}>${escapeXml(content)}</text>`);
    return this;
  }

  group(attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<g ${a}>`);
    return this;
  }

  groupEnd(): this {
    this.parts.push('</g>');
    return this;
  }

  beginItem(path: string): this {
    this.parts.push(`<g data-item="${escapeXml(path)}">`);
    return this;
  }

  endItem(): this {
    this.parts.push('</g>');
    return this;
  }

  polygon(points: string, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<polygon points="${points}" ${a}/>`);
    return this;
  }

  use(href: string, x: number, y: number, attrs: Record<string, string | number> = {}): this {
    const a = Object.entries(attrs).map(([k, v]) => `${k}="${v}"`).join(' ');
    this.parts.push(`<use href="#${href}" x="${x}" y="${y}" ${a}/>`);
    return this;
  }

  build(): string {
    // Insert defs (including lazily-collected icon symbols) after opening tags
    const allDefs = this.defsContent + iconDefs();
    if (allDefs) {
      // Find insertion point: after <title>, <desc>, <style> (before first drawing element)
      const insertIdx = this.findDefsInsertIndex();
      this.parts.splice(insertIdx, 0, `<defs>${allDefs}</defs>`);
    }
    this.parts.push('</svg>');
    return this.parts.join('');
  }

  private findDefsInsertIndex(): number {
    // Insert after last metadata element (title, desc, style)
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      if (p.startsWith('<title>') || p.startsWith('<desc>') || p.startsWith('<style>')) {
        return i + 1;
      }
    }
    return 1; // after opening svg tag
  }
}

// --- Shadow / filter presets ---

export const FILTER_SHADOW =
  `<filter id="shadow" x="-4%" y="-4%" width="108%" height="112%">` +
  `<feDropShadow dx="0" dy="2" stdDeviation="6" flood-color="#000" flood-opacity="0.08"/>` +
  `</filter>`;

export const FILTER_CARD_SHADOW =
  `<filter id="card-shadow" x="-4%" y="-4%" width="108%" height="112%">` +
  `<feDropShadow dx="0" dy="3" stdDeviation="6" flood-color="#000" flood-opacity="0.06"/>` +
  `</filter>`;

export const FILTER_GLOW =
  `<filter id="glow" x="-30%" y="-30%" width="160%" height="160%">` +
  `<feGaussianBlur stdDeviation="6" result="blur"/>` +
  `<feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>` +
  `</filter>`;

export function radialGradient(id: string, color: string, highlight = 'white'): string {
  return `<radialGradient id="${id}" cx="35%" cy="30%" r="65%">` +
    `<stop offset="0%" stop-color="${highlight}" stop-opacity="0.35"/>` +
    `<stop offset="100%" stop-color="${color}" stop-opacity="1"/>` +
    `</radialGradient>`;
}

export function linearGradient(id: string, color1: string, color2: string, angle = 135): string {
  const rad = (angle * Math.PI) / 180;
  const x1 = Math.round(50 - 50 * Math.cos(rad));
  const y1 = Math.round(50 - 50 * Math.sin(rad));
  const x2 = Math.round(50 + 50 * Math.cos(rad));
  const y2 = Math.round(50 + 50 * Math.sin(rad));
  return `<linearGradient id="${id}" x1="${x1}%" y1="${y1}%" x2="${x2}%" y2="${y2}%">` +
    `<stop offset="0%" stop-color="${color1}"/>` +
    `<stop offset="100%" stop-color="${color2}"/>` +
    `</linearGradient>`;
}
