// Automated test: verify data-field and data-item coverage for all renderers
// Run: pnpm test

import { render } from './index.js';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DESIGNS } from './shared/design.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = JSON.parse(readFileSync(resolve(__dirname, '../test-fixtures/fixtures.json'), 'utf-8'));

const DESIGN_IDS = Object.keys(DESIGNS);

interface TestResult {
  type: string;
  design: string;
  style: string;
  ok: boolean;
  dataFields: number;
  dataItems: number;
  errors: string[];
}

function countAttr(svg: string, attr: string): number {
  const re = new RegExp(`${attr}="`, 'g');
  return (svg.match(re) || []).length;
}

function hasValidSvg(svg: string): boolean {
  return svg.startsWith('<svg') && svg.includes('</svg>');
}

const results: TestResult[] = [];
let passed = 0;
let failed = 0;
let warnings = 0;

const diagramTypes = Object.keys(fixtures);

for (const type of diagramTypes) {
  const fixture = fixtures[type];

  for (const designId of DESIGN_IDS) {
    const errors: string[] = [];
    let svg = '';

    try {
      svg = render({
        diagram_type: type,
        data: fixture.data,
        title: fixture.title,
        design: designId,
      });
    } catch (e) {
      errors.push(`Render error: ${e instanceof Error ? e.message : String(e)}`);
    }

    if (svg && !hasValidSvg(svg)) {
      errors.push('Invalid SVG output');
    }

    const dataFields = countAttr(svg, 'data-field');
    const dataItems = countAttr(svg, 'data-item');

    // decision_tree and hierarchy are recursive — skip data-field check
    const skipDataFieldCheck = type === 'decision_tree' || type === 'hierarchy';

    if (!skipDataFieldCheck && dataFields === 0 && svg) {
      errors.push('No data-field attributes found');
    }

    // Title should always have data-field="title"
    if (fixture.title && svg && !svg.includes('data-field="title"')) {
      errors.push('Missing data-field="title"');
    }

    const ok = errors.length === 0;
    if (ok) passed++;
    else failed++;

    results.push({ type, design: designId, style: 'default', ok, dataFields, dataItems, errors });
  }
}

// Summary
console.log('\n=== Data-field Coverage Test Results ===\n');

const failedResults = results.filter(r => !r.ok);
if (failedResults.length > 0) {
  console.log(`FAILURES (${failedResults.length}):\n`);
  for (const r of failedResults) {
    console.log(`  ✗ ${r.type} [${r.design}] — ${r.errors.join(', ')}`);
  }
  console.log('');
}

// Coverage summary per diagram type
console.log('Coverage per diagram type:\n');
console.log('  Type                    | Fields | Items | Designs OK');
console.log('  ------------------------|--------|-------|----------');
for (const type of diagramTypes) {
  const typeResults = results.filter(r => r.type === type);
  const okCount = typeResults.filter(r => r.ok).length;
  const maxFields = Math.max(...typeResults.map(r => r.dataFields));
  const maxItems = Math.max(...typeResults.map(r => r.dataItems));
  const status = okCount === DESIGN_IDS.length ? '✓ ALL' : `${okCount}/${DESIGN_IDS.length}`;
  console.log(`  ${type.padEnd(24)}| ${String(maxFields).padStart(6)} | ${String(maxItems).padStart(5)} | ${status}`);
}

console.log(`\n  Total: ${passed} passed, ${failed} failed (${diagramTypes.length} types × ${DESIGN_IDS.length} designs = ${results.length} tests)\n`);

if (failed > 0) {
  process.exit(1);
}
