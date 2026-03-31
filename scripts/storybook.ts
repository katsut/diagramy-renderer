// Storybook-like interactive viewer for all diagram renderers
// Run: pnpm storybook → opens Express server on :4730
// Shows all diagram types with fixtures, editable JSON, live preview

import express from 'express';
import { render, type RenderRequest } from '../src/index.ts';
import { readFileSync } from 'node:fs';
import { DESIGNS } from '../src/shared/design.ts';

const fixtures = JSON.parse(readFileSync('test-fixtures/fixtures.json', 'utf-8'));
const designIds = Object.keys(DESIGNS);

const LAYOUT_STYLES: Record<string, { value: string; label: string }[]> = {
  process:            [{ value: '', label: 'Horizontal' }, { value: 'chevron', label: 'Chevron' }, { value: 'vertical', label: 'Vertical' }, { value: 'serpentine', label: 'Serpentine' }, { value: 'staircase', label: 'Staircase' }, { value: 'numbered', label: 'Numbered' }, { value: 'pipeline', label: 'Pipeline' }, { value: 'escalation', label: 'Escalation' }],
  timeline:           [{ value: '', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'serpentine', label: 'Serpentine' }, { value: 'alternating', label: 'Alternating' }, { value: 'grouped', label: 'Grouped' }, { value: 'nested', label: 'Nested' }],
  hierarchy:          [{ value: '', label: 'Tree' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'radial', label: 'Radial' }, { value: 'bracket', label: 'Bracket' }],
  block_list:         [{ value: '', label: 'Horizontal' }, { value: 'simple', label: 'Simple' }, { value: 'inline', label: 'Inline' }, { value: 'grid', label: 'Grid' }, { value: 'pillars', label: 'Pillars' }, { value: 'numbered', label: 'Numbered' }, { value: 'cards', label: 'Cards' }, { value: 'timeline', label: 'Timeline' }, { value: 'warning', label: 'Warning' }, { value: 'catalog', label: 'Catalog' }],
  cycle:              [{ value: '', label: 'Circle' }, { value: 'flywheel', label: 'Flywheel' }, { value: 'gear', label: 'Gear' }, { value: 'feedback-loop', label: 'Feedback Loop' }],
  funnel:             [{ value: '', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'pipeline', label: 'Pipeline' }],
  comparison_table:   [{ value: '', label: 'Table' }, { value: 'cards', label: 'Cards' }, { value: 'minimal', label: 'Minimal' }, { value: 'before-after', label: 'Before/After' }, { value: 'highlight', label: 'Highlight' }, { value: 'checklist', label: 'Checklist' }, { value: 'spec_card', label: 'Spec Card' }, { value: 'matrix', label: 'Matrix' }, { value: 'pricing', label: 'Pricing' }, { value: 'scorecard', label: 'Scorecard' }, { value: 'versus', label: 'VS' }, { value: 'feature_matrix', label: 'Feature Matrix' }, { value: 'timeline_compare', label: 'Timeline' }],
  swimlane:           [{ value: '', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'kanban', label: 'Kanban' }],
  mind_map:           [{ value: '', label: 'Radial' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'org_chart', label: 'Org Chart' }],
  roadmap:            [{ value: '', label: 'Horizontal' }, { value: 'vertical', label: 'Vertical' }, { value: 'timeline_cards', label: 'Cards' }],
  bar_chart:          [{ value: '', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'lollipop', label: 'Lollipop' }],
  pie_chart:          [{ value: '', label: 'Pie' }, { value: 'donut', label: 'Donut' }, { value: 'waffle', label: 'Waffle' }],
  stacked_bar:        [{ value: '', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'percentage', label: '100%' }],
  ranking:            [{ value: '', label: 'List' }, { value: 'vertical', label: 'Podium' }, { value: 'horizontal', label: 'Bars' }, { value: 'roi-bar', label: 'ROI Bar' }],
  pyramid:            [{ value: '', label: 'Triangle' }, { value: 'blocks', label: 'Blocks' }, { value: 'horizontal', label: 'Horizontal' }],
  decision_tree:      [{ value: '', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }, { value: 'flowchart', label: 'Flowchart' }],
  quadrant:           [{ value: '', label: 'Grid' }, { value: 'color_block', label: 'Color Block' }, { value: 'bubble', label: 'Bubble' }],
  network_graph:      [{ value: '', label: 'Circle' }, { value: 'card_flow', label: 'Card Flow' }, { value: 'arc', label: 'Arc' }],
  kpi_card:           [{ value: '', label: 'Horizontal' }, { value: 'grid', label: 'Grid' }, { value: 'dashboard', label: 'Dashboard' }],
  venn:               [{ value: '', label: 'Classic' }, { value: 'distinction', label: 'Distinction' }],
  layer_stack:        [{ value: '', label: 'Vertical' }, { value: 'horizontal', label: 'Horizontal' }],
};

const app = express();
app.use(express.json({ limit: '1mb' }));

// Render API
app.post('/render', (req, res) => {
  try {
    const svg = render(req.body as RenderRequest);
    res.type('image/svg+xml').send(svg);
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : String(e) });
  }
});

// Fixtures API
app.get('/api/fixtures', (_req, res) => res.json(fixtures));
app.get('/api/designs', (_req, res) => res.json(designIds));
app.get('/api/layouts', (_req, res) => res.json(LAYOUT_STYLES));

// Main page
app.get('/', (_req, res) => {
  const typeOptions = Object.keys(fixtures).map(t => `<option value="${t}">${t}</option>`).join('');
  const designOptions = designIds.map(d => `<option value="${d}">${d}</option>`).join('');

  res.type('html').send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<title>Figney Storybook</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; display: flex; height: 100vh; background: #f5f5f7; }
  .sidebar { width: 260px; background: #1e1e2e; color: #cdd6f4; overflow-y: auto; flex-shrink: 0; }
  .sidebar h2 { padding: 16px; font-size: 14px; border-bottom: 1px solid #313244; }
  .sidebar .type-btn { display: block; width: 100%; text-align: left; padding: 8px 16px; border: none; background: none; color: #cdd6f4; font-size: 12px; cursor: pointer; }
  .sidebar .type-btn:hover { background: #313244; }
  .sidebar .type-btn.active { background: #45475a; color: #89b4fa; font-weight: 700; }
  .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .toolbar { padding: 8px 16px; background: white; border-bottom: 1px solid #e0e0e0; display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
  .toolbar select { padding: 4px 8px; font-size: 12px; border: 1px solid #ccc; border-radius: 4px; }
  .toolbar label { font-size: 11px; color: #666; }
  .content { flex: 1; display: flex; overflow: hidden; }
  .preview { flex: 1; overflow: auto; padding: 16px; display: flex; flex-wrap: wrap; gap: 12px; align-content: start; }
  .preview-card { background: white; border: 1px solid #e0e0e0; border-radius: 8px; padding: 8px; }
  .preview-card .label { font-size: 10px; color: #666; margin-bottom: 4px; }
  .preview-card .badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; background: #e8f5e9; color: #2e7d32; }
  .preview-card .badge.warn { background: #fff3e0; color: #e65100; }
  .preview-card svg { max-width: 100%; height: auto; max-height: 300px; display: block; }
  .editor { width: 320px; border-left: 1px solid #e0e0e0; background: white; display: flex; flex-direction: column; }
  .editor h3 { padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e0e0e0; }
  .editor textarea { flex: 1; border: none; padding: 8px; font-family: monospace; font-size: 11px; resize: none; outline: none; }
  .editor .actions { padding: 8px; border-top: 1px solid #e0e0e0; }
  .editor button { padding: 6px 12px; font-size: 11px; background: #4361ee; color: white; border: none; border-radius: 4px; cursor: pointer; }
  .mode-tabs { display: flex; gap: 0; }
  .mode-tab { padding: 6px 12px; font-size: 11px; border: 1px solid #ccc; background: #f5f5f7; cursor: pointer; }
  .mode-tab:first-child { border-radius: 4px 0 0 4px; }
  .mode-tab:last-child { border-radius: 0 4px 4px 0; }
  .mode-tab.active { background: #4361ee; color: white; border-color: #4361ee; }
</style>
</head>
<body>
<div class="sidebar">
  <h2>Figney Storybook</h2>
  <div id="type-list"></div>
</div>
<div class="main">
  <div class="toolbar">
    <label>Design:</label>
    <select id="sel-design" onchange="rerender()">${designOptions}</select>
    <label>Layout:</label>
    <select id="sel-layout" onchange="rerender()"></select>
    <div class="mode-tabs">
      <div class="mode-tab active" onclick="setMode('single')">Single</div>
      <div class="mode-tab" onclick="setMode('all-designs')">All Designs</div>
      <div class="mode-tab" onclick="setMode('all-layouts')">All Layouts</div>
      <div class="mode-tab" onclick="setMode('matrix')">Matrix</div>
    </div>
  </div>
  <div class="content">
    <div class="preview" id="preview"></div>
    <div class="editor">
      <h3>Data (JSON)</h3>
      <textarea id="json-editor"></textarea>
      <div class="actions">
        <button onclick="rerender()">Render</button>
        <button onclick="resetData()" style="background:#666">Reset</button>
      </div>
    </div>
  </div>
</div>
<script>
let fixtures = {};
let layouts = {};
let designs = [];
let currentType = '';
let mode = 'single';

async function init() {
  [fixtures, designs, layouts] = await Promise.all([
    fetch('/api/fixtures').then(r => r.json()),
    fetch('/api/designs').then(r => r.json()),
    fetch('/api/layouts').then(r => r.json()),
  ]);
  const list = document.getElementById('type-list');
  for (const type of Object.keys(fixtures)) {
    const btn = document.createElement('button');
    btn.className = 'type-btn';
    btn.textContent = type;
    btn.onclick = () => selectType(type);
    list.appendChild(btn);
  }
  selectType(Object.keys(fixtures)[0]);
}

function selectType(type) {
  currentType = type;
  document.querySelectorAll('.type-btn').forEach(b => b.classList.toggle('active', b.textContent === type));

  // Update layout select
  const sel = document.getElementById('sel-layout');
  const typeLayouts = layouts[type] || [{ value: '', label: 'Default' }];
  sel.innerHTML = typeLayouts.map(l => '<option value="' + l.value + '">' + l.label + '</option>').join('');

  // Set editor
  document.getElementById('json-editor').value = JSON.stringify(fixtures[type], null, 2);
  rerender();
}

function setMode(m) {
  mode = m;
  document.querySelectorAll('.mode-tab').forEach((t, i) => {
    t.classList.toggle('active', ['single','all-designs','all-layouts','matrix'][i] === m);
  });
  rerender();
}

function resetData() {
  document.getElementById('json-editor').value = JSON.stringify(fixtures[currentType], null, 2);
  rerender();
}

async function renderOne(type, data, title, design, layout) {
  const res = await fetch('/render', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagram_type: type, data, title, design, style: layout || undefined }),
  });
  if (!res.ok) throw new Error((await res.json()).error);
  return res.text();
}

async function rerender() {
  const preview = document.getElementById('preview');
  preview.innerHTML = '<div style="padding:20px;color:#666">Rendering...</div>';

  let parsed;
  try {
    parsed = JSON.parse(document.getElementById('json-editor').value);
  } catch (e) {
    preview.innerHTML = '<div style="color:red;padding:20px">JSON Error: ' + e.message + '</div>';
    return;
  }

  const design = document.getElementById('sel-design').value;
  const layout = document.getElementById('sel-layout').value;
  const typeLayouts = layouts[currentType] || [{ value: '', label: 'Default' }];

  let combos = [];
  if (mode === 'single') {
    combos = [{ design, layout, label: design + ' / ' + (layout || 'default') }];
  } else if (mode === 'all-designs') {
    combos = designs.map(d => ({ design: d, layout, label: d }));
  } else if (mode === 'all-layouts') {
    combos = typeLayouts.map(l => ({ design, layout: l.value, label: l.label }));
  } else {
    // Matrix: all designs × all layouts
    for (const d of designs) {
      for (const l of typeLayouts) {
        combos.push({ design: d, layout: l.value, label: d + ' / ' + l.label });
      }
    }
  }

  preview.innerHTML = '';
  const results = await Promise.allSettled(
    combos.map(c => renderOne(currentType, parsed.data, parsed.title, c.design, c.layout).then(svg => ({ ...c, svg })))
  );

  for (const r of results) {
    const card = document.createElement('div');
    card.className = 'preview-card';
    if (r.status === 'fulfilled') {
      const { label, svg } = r.value;
      const fields = (svg.match(/data-field="/g) || []).length;
      const items = (svg.match(/data-item="/g) || []).length;
      const badge = fields > 0 ? '<span class="badge">' + fields + 'f ' + items + 'i</span>' : '<span class="badge warn">0 fields</span>';
      card.innerHTML = '<div class="label">' + label + ' ' + badge + '</div>' + svg;
    } else {
      const label = combos[results.indexOf(r)]?.label || '?';
      card.innerHTML = '<div class="label">' + label + '</div><div style="color:red;font-size:11px;padding:8px">' + r.reason.message + '</div>';
    }
    preview.appendChild(card);
  }
}

init();
</script>
</body>
</html>`);
});

const port = 4730;
app.listen(port, () => {
  console.log(`Figney Storybook: http://localhost:${port}`);
});
