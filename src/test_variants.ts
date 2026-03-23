import { render } from './index.js';
import { writeFileSync } from 'fs';

const variants: Array<{ type: string; style: string; data: any }> = [
  { type: 'swimlane', style: 'vertical', data: { lanes: [{ actor: '開発', steps: [{ label: '実装' }, { label: 'テスト' }] }, { actor: 'QA', steps: [{ label: '検証' }] }] } },
  { type: 'mind_map', style: 'horizontal', data: { center: 'DX', branches: [{ label: '技術', children: ['AI', 'Cloud'] }, { label: '組織', children: ['人材', '文化'] }] } },
  { type: 'roadmap', style: 'vertical', data: { phases: [{ label: 'P1', items: ['MVP'] }, { label: 'P2', items: ['API', 'SDK'] }] } },
  { type: 'bar_chart', style: 'horizontal', data: { items: [{ label: 'Q1', value: 120 }, { label: 'Q2', value: 185 }], unit: '万' } },
  { type: 'pie_chart', style: 'donut', data: { segments: [{ label: 'A', value: 40 }, { label: 'B', value: 35 }, { label: 'C', value: 25 }] } },
  { type: 'stacked_bar', style: 'horizontal', data: { categories: ['国内', '海外'], items: [{ label: 'Q1', values: [80, 40] }, { label: 'Q2', values: [90, 60] }] } },
  { type: 'ranking', style: 'vertical', data: { items: [{ label: 'Python', value: '100' }, { label: 'JS', value: '85' }, { label: 'Rust', value: '72' }] } },
  { type: 'pyramid', style: 'horizontal', data: { layers: [{ label: '戦略' }, { label: '戦術' }, { label: '実行' }] } },
  { type: 'decision_tree', style: 'horizontal', data: { root: { label: 'Q?', yes: { label: 'Yes' }, no: { label: 'No' } } } },
];

const designs = ['clean', 'sketch', 'pixel', 'bold', 'flat', 'glass', 'neon', 'watercolor'];
let ok = 0, errors = 0;

for (const v of variants) {
  for (const design of designs) {
    try {
      const svg = render({ diagram_type: v.type, data: v.data, title: 'Test', design, style: v.style });
      writeFileSync(`/tmp/visual-review/${design}-${v.type}-${v.style}.svg`, svg);
      console.log(`✓ ${design} × ${v.type} (${v.style})`);
      ok++;
    } catch (e: any) {
      console.error(`✗ ${design} × ${v.type} (${v.style}): ${e.message}`);
      errors++;
    }
  }
}
console.log(`\n${ok}/${ok + errors} passed. ${errors} errors.`);
