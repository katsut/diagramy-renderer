// Text measurement and wrapping — port of Rust text.rs with same heuristics

function charWidth(c: string): number {
  const code = c.charCodeAt(0);
  // ASCII
  if (code < 128) {
    if ('il1|!.,:;\' '.includes(c)) return 4.0;
    if ('mwMW@'.includes(c)) return 9.5;
    return 7.0;
  }
  // CJK fullwidth
  if (
    (code >= 0x4E00 && code <= 0x9FFF) || // CJK Unified
    (code >= 0x3400 && code <= 0x4DBF) || // CJK Extension A
    (code >= 0x3040 && code <= 0x309F) || // Hiragana
    (code >= 0x30A0 && code <= 0x30FF) || // Katakana
    (code >= 0xFF01 && code <= 0xFF60) || // Fullwidth forms
    (code >= 0xF900 && code <= 0xFAFF)    // CJK Compatibility
  ) {
    return 12.0;
  }
  // JP narrow punctuation
  if ('。、「」（）'.includes(c)) return 6.0;
  // Half-width katakana
  if (code >= 0xFF61 && code <= 0xFF9F) return 6.0;
  return 7.0;
}

export function estimateWidth(text: string, fontSize: number): number {
  const scale = fontSize / 12;
  let w = 0;
  for (const c of text) w += charWidth(c);
  return Math.round(w * scale);
}

export interface FitResult {
  lines: string[];
  fontSize: number;
}

export function fitText(text: string, maxWidth: number, maxLines: number, baseFontSize: number): FitResult {
  if (!text) return { lines: [''], fontSize: baseFontSize };

  // Try as-is
  if (estimateWidth(text, baseFontSize) <= maxWidth) {
    return { lines: [text], fontSize: baseFontSize };
  }

  // Try wrapping
  const wrapped = wrapText(text, maxWidth, baseFontSize);
  if (wrapped.length <= maxLines) {
    return { lines: wrapped, fontSize: baseFontSize };
  }

  // Try shrinking
  for (let fs = baseFontSize - 1; fs >= Math.max(baseFontSize - 4, 8); fs--) {
    if (estimateWidth(text, fs) <= maxWidth) {
      return { lines: [text], fontSize: fs };
    }
    const w2 = wrapText(text, maxWidth, fs);
    if (w2.length <= maxLines) {
      return { lines: w2, fontSize: fs };
    }
  }

  // Truncate
  const fs = Math.max(baseFontSize - 4, 8);
  const truncated = truncateText(text, maxWidth, fs);
  return { lines: [truncated], fontSize: fs };
}

function isCjk(code: number): boolean {
  return (
    (code >= 0x3000 && code <= 0x9FFF) || // CJK, Hiragana, Katakana, Punctuation
    (code >= 0xF900 && code <= 0xFAFF) || // CJK Compatibility
    (code >= 0xFF01 && code <= 0xFF60) || // Fullwidth forms
    (code >= 0xFF61 && code <= 0xFF9F)    // Half-width katakana
  );
}

function hasCjk(text: string): boolean {
  for (const c of text) {
    if (isCjk(c.charCodeAt(0))) return true;
  }
  return false;
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  // For CJK-containing text, wrap at character level
  if (hasCjk(text)) {
    return wrapCjk(text, maxWidth, fontSize);
  }

  // Latin: wrap at word boundaries
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (estimateWidth(test, fontSize) <= maxWidth) {
      current = test;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

// Characters that must not start a line (closing punctuation, periods, etc.)
const NO_START = new Set('、。，．）」』】〉》〕｝!?！？‥…ー～っゃゅょぁぃぅぇぉ');
// Characters that must not end a line (opening brackets)
const NO_END = new Set('（「『【〈《〔｛');
// Particles — good break points AFTER these
const PARTICLES = new Set('のはがをにでともやへかられよりまで');

function wrapCjk(text: string, maxWidth: number, fontSize: number): string[] {
  const chars = [...text];
  const lines: string[] = [];
  let current = '';

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]!;
    const test = current + ch;

    if (estimateWidth(test, fontSize) <= maxWidth) {
      current = test;
      continue;
    }

    // Need to break — find the best break point
    if (current.length === 0) {
      // Single char too wide, force it
      current = ch;
      continue;
    }

    // Try to find a better break point by scanning backward
    const bestPos = findBreakPoint(current, chars, i);
    if (bestPos > 0 && bestPos < current.length) {
      lines.push(current.slice(0, bestPos));
      // Remaining chars go back to current + current char
      current = current.slice(bestPos) + ch;
    } else {
      lines.push(current);
      current = ch;
    }
  }
  if (current) lines.push(current);
  return lines.length ? lines : [''];
}

function findBreakPoint(current: string, allChars: string[], nextIdx: number): number {
  const chars = [...current];
  const nextChar = allChars[nextIdx];

  // Scan backward from end to find a good break point
  for (let pos = chars.length; pos > Math.max(1, chars.length - 8); pos--) {
    const beforeBreak = chars[pos - 1];
    const afterBreak = pos < chars.length ? chars[pos] : nextChar;

    if (!beforeBreak) continue;

    // Skip if next line would start with no-start char
    if (afterBreak && NO_START.has(afterBreak)) continue;

    // Skip if this line would end with no-end char
    if (NO_END.has(beforeBreak)) continue;

    // Prefer breaking after particles
    if (PARTICLES.has(beforeBreak)) return pos;

    // Prefer breaking after punctuation
    if ('、。，．！？'.includes(beforeBreak)) return pos;

    // Prefer breaking at CJK/Latin boundary
    if (beforeBreak && afterBreak) {
      const prevIsCjk = isCjk(beforeBreak.charCodeAt(0));
      const nextIsCjk = isCjk(afterBreak.charCodeAt(0));
      if (prevIsCjk !== nextIsCjk) return pos;
    }
  }

  // Fallback: break at end (respecting no-start rule)
  if (nextChar && NO_START.has(nextChar)) {
    return chars.length - 1;
  }
  return chars.length;
}

function truncateText(text: string, maxWidth: number, fontSize: number): string {
  for (let i = text.length - 1; i > 0; i--) {
    const t = text.slice(0, i) + '…';
    if (estimateWidth(t, fontSize) <= maxWidth) return t;
  }
  return '…';
}
