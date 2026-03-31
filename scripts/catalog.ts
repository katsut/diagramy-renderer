// Visual catalog generator — renders all diagram type × design × layout combinations
// Run: pnpm catalog
// Output: catalog/index.html (open in browser)

import { render } from '../src/index.ts';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { DESIGNS } from '../src/shared/design.ts';

const fixtures = JSON.parse(readFileSync('test-fixtures/fixtures.json', 'utf-8'));

const LAYOUT_STYLES: Record<string, string[]> = {
  process:            ['', 'chevron', 'vertical', 'serpentine', 'staircase', 'numbered', 'pipeline', 'escalation'],
  timeline:           ['', 'vertical', 'serpentine', 'alternating', 'grouped', 'nested'],
  hierarchy:          ['', 'horizontal', 'radial', 'bracket'],
  block_list:         ['', 'simple', 'inline', 'grid', 'pillars', 'numbered', 'cards', 'timeline', 'warning', 'catalog'],
  cycle:              ['', 'flywheel', 'gear', 'feedback-loop'],
  funnel:             ['', 'horizontal', 'pipeline'],
  comparison_table:   ['', 'cards', 'minimal', 'before-after', 'highlight', 'checklist', 'spec_card', 'matrix', 'pricing', 'scorecard', 'versus', 'feature_matrix', 'timeline_compare'],
  swimlane:           ['', 'vertical', 'kanban'],
  mind_map:           ['', 'horizontal', 'org_chart'],
  roadmap:            ['', 'vertical', 'timeline_cards'],
  bar_chart:          ['', 'horizontal', 'lollipop'],
  pie_chart:          ['', 'donut', 'waffle'],
  stacked_bar:        ['', 'horizontal', 'percentage'],
  ranking:            ['', 'vertical', 'horizontal', 'roi-bar'],
  pyramid:            ['', 'blocks', 'horizontal'],
  decision_tree:      ['', 'horizontal', 'flowchart'],
  quadrant:           ['', 'color_block', 'bubble'],
  network_graph:      ['', 'card_flow', 'arc'],
  business_framework: [''],
  kpi_card:           ['', 'grid', 'dashboard'],
  venn:               ['', 'distinction'],
  sequence_diagram:   [''],
  layer_stack:        ['', 'horizontal'],
  gantt:              [''],
  treemap:            [''],
  sankey:             [''],
  concentric_circles: [''],
  matrix_2x2:        [''],
  radar_chart:        [''],
};

const designIds = Object.keys(DESIGNS);
const diagramTypes = Object.keys(fixtures);

interface CatalogEntry {
  type: string;
  design: string;
  layout: string;
  svg: string;
  error?: string;
  dataFields: number;
  dataItems: number;
}

const entries: CatalogEntry[] = [];
let errors = 0;

for (const type of diagramTypes) {
  const fixture = fixtures[type];
  const layouts = LAYOUT_STYLES[type] || [''];

  for (const design of designIds) {
    for (const layout of layouts) {
      try {
        const svg = render({
          diagram_type: type,
          data: fixture.data,
          title: fixture.title,
          design,
          style: layout || undefined,
        });
        const dataFields = (svg.match(/data-field="/g) || []).length;
        const dataItems = (svg.match(/data-item="/g) || []).length;
        entries.push({ type, design, layout: layout || 'default', svg, dataFields, dataItems });
      } catch (e) {
        errors++;
        entries.push({
          type, design, layout: layout || 'default', svg: '',
          error: e instanceof Error ? e.message : String(e),
          dataFields: 0, dataItems: 0,
        });
      }
    }
  }
}

// Generate HTML
const filterTypes = diagramTypes.map(t => `<option value="${t}">${t}</option>`).join('');
const filterDesigns = designIds.map(d => `<option value="${d}">${d}</option>`).join('');

let html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Figney Visual Catalog</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #f0f0f0; padding: 16px; }
  h1 { font-size: 18px; margin-bottom: 8px; }
  .stats { font-size: 12px; color: #666; margin-bottom: 12px; }
  .filters { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; align-items: center; }
  select { padding: 4px 8px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; }
  .grid { display: flex; flex-wrap: wrap; gap: 12px; }
  .card { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 8px; width: 380px; }
  .card.error { border-color: #e74c3c; }
  .card-header { font-size: 10px; color: #666; margin-bottom: 4px; display: flex; justify-content: space-between; }
  .card-header .badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; }
  .badge-ok { background: #e8f5e9; color: #2e7d32; }
  .badge-err { background: #ffebee; color: #c62828; }
  .badge-warn { background: #fff3e0; color: #e65100; }
  .card svg { max-width: 100%; height: auto; max-height: 200px; }
  .error-msg { color: #e74c3c; font-size: 10px; padding: 8px; }
</style>
</head>
<body>
<h1>Figney Visual Catalog</h1>
<div class="stats">${entries.length} renders (${entries.length - errors} ok, ${errors} errors) | ${diagramTypes.length} types × ${designIds.length} designs</div>
<div class="filters">
  <select id="f-type" onchange="filter()"><option value="">All types</option>${filterTypes}</select>
  <select id="f-design" onchange="filter()"><option value="">All designs</option>${filterDesigns}</select>
  <label><input type="checkbox" id="f-errors" onchange="filter()"> Errors only</label>
  <label><input type="checkbox" id="f-nofield" onchange="filter()"> Missing data-field</label>
</div>
<div class="grid" id="grid">
`;

for (const e of entries) {
  const fieldBadge = e.dataFields > 0
    ? `<span class="badge badge-ok">${e.dataFields}f ${e.dataItems}i</span>`
    : `<span class="badge badge-warn">0 fields</span>`;
  const cls = e.error ? 'card error' : 'card';

  html += `<div class="${cls}" data-type="${e.type}" data-design="${e.design}" data-layout="${e.layout}" data-fields="${e.dataFields}" data-error="${e.error ? '1' : '0'}">
  <div class="card-header">
    <span><b>${e.type}</b> · ${e.design} · ${e.layout}</span>
    ${fieldBadge}
  </div>
  ${e.error ? `<div class="error-msg">${e.error}</div>` : e.svg}
</div>\n`;
}

html += `</div>
<script>
function filter() {
  const type = document.getElementById('f-type').value;
  const design = document.getElementById('f-design').value;
  const errOnly = document.getElementById('f-errors').checked;
  const noField = document.getElementById('f-nofield').checked;
  document.querySelectorAll('.card').forEach(c => {
    let show = true;
    if (type && c.dataset.type !== type) show = false;
    if (design && c.dataset.design !== design) show = false;
    if (errOnly && c.dataset.error !== '1') show = false;
    if (noField && parseInt(c.dataset.fields) > 0) show = false;
    c.style.display = show ? '' : 'none';
  });
}
</script>
</body></html>`;

mkdirSync('catalog', { recursive: true });
writeFileSync('catalog/index.html', html);

console.log(`Catalog generated: catalog/index.html`);
console.log(`${entries.length} renders (${entries.length - errors} ok, ${errors} errors)`);
console.log(`Open in browser: file://${process.cwd()}/catalog/index.html`);
