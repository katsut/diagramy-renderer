import { render } from './index.js';
import { writeFileSync } from 'fs';

const testCases: Array<{ name: string; req: { diagram_type: string; data: any; title: string } }> = [
  { name: 'process', req: { diagram_type: 'process', title: '業務改善', data: { nodes: [{ label: '計画' }, { label: '実行' }, { label: '検証' }] } } },
  { name: 'funnel', req: { diagram_type: 'funnel', title: 'ファネル', data: { stages: [{ label: '認知', value: '1000' }, { label: '興味', value: '500' }, { label: '購入', value: '100' }] } } },
  { name: 'block_list', req: { diagram_type: 'block_list', title: 'バリュー', data: { items: [{ label: '革新' }, { label: '品質' }, { label: '連携' }] } } },
  { name: 'comparison_table', req: { diagram_type: 'comparison_table', title: '比較', data: { headers: ['項目', 'A', 'B'], rows: [{ label: '価格', values: ['安い', '高い'] }, { label: '品質', values: ['普通', '良い'] }] } } },
  { name: 'cycle', req: { diagram_type: 'cycle', title: 'PDCA', data: { steps: [{ label: 'Plan' }, { label: 'Do' }, { label: 'Check' }, { label: 'Act' }] } } },
  { name: 'hierarchy', req: { diagram_type: 'hierarchy', title: '組織図', data: { root: { label: 'CEO', children: [{ label: 'CTO' }, { label: 'CFO' }] } } } },
  { name: 'mind_map', req: { diagram_type: 'mind_map', title: 'マインドマップ', data: { center: '中心', branches: [{ label: 'A', children: ['a1'] }, { label: 'B', children: ['b1'] }] } } },
  { name: 'timeline', req: { diagram_type: 'timeline', title: '年表', data: { events: [{ time: '2024', event: '設立' }, { time: '2025', event: '成長' }] } } },
  { name: 'quadrant', req: { diagram_type: 'quadrant', title: 'SWOT', data: { labels: ['強み', '弱み', '機会', '脅威'], quadrants: [['技術'], ['知名度'], ['AI'], ['競合']] } } },
  { name: 'matrix_2x2', req: { diagram_type: 'matrix_2x2', title: '優先度', data: { axes: { x: '緊急', y: '重要' }, items: [{ name: 'A', x: 0.8, y: 0.9 }, { name: 'B', x: 0.3, y: 0.5 }] } } },
  { name: 'composite_flow', req: { diagram_type: 'composite_flow', title: 'CI/CD', data: { nodes: [{ id: 'a', label: 'Build' }, { id: 'b', label: 'Test' }, { id: 'c', label: 'Deploy' }] } } },
  { name: 'bar_chart', req: { diagram_type: 'bar_chart', title: '売上', data: { items: [{ label: '1月', value: 100 }, { label: '2月', value: 150 }, { label: '3月', value: 80 }], unit: '万円' } } },
  { name: 'pie_chart', req: { diagram_type: 'pie_chart', title: '構成比', data: { segments: [{ label: 'A', value: 40 }, { label: 'B', value: 35 }, { label: 'C', value: 25 }] } } },
  { name: 'radar_chart', req: { diagram_type: 'radar_chart', title: 'スキル', data: { axes: [{ label: '技術' }, { label: '設計' }, { label: 'コミュ' }, { label: 'リーダー' }], items: [{ label: 'Alice', values: [80, 60, 90, 70] }] } } },
  { name: 'stacked_bar', req: { diagram_type: 'stacked_bar', title: '内訳', data: { categories: ['国内', '海外'], items: [{ label: 'Q1', values: [60, 40] }, { label: 'Q2', values: [70, 50] }] } } },
  { name: 'roadmap', req: { diagram_type: 'roadmap', title: 'ロードマップ', data: { phases: [{ label: 'Phase 1', items: ['MVP', 'テスト'] }, { label: 'Phase 2', items: ['拡大'] }] } } },
  { name: 'network_graph', req: { diagram_type: 'network_graph', title: 'ネットワーク', data: { nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }], edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }] } } },
  { name: 'sankey', req: { diagram_type: 'sankey', title: 'フロー', data: { nodes: [{ id: 'a', label: '入力' }, { id: 'b', label: '処理' }, { id: 'c', label: '出力' }], flows: [{ from: 'a', to: 'b', value: 100 }, { from: 'b', to: 'c', value: 80 }] } } },
  { name: 'treemap', req: { diagram_type: 'treemap', title: 'ツリーマップ', data: { items: [{ label: 'A', value: 60 }, { label: 'B', value: 30 }, { label: 'C', value: 10 }] } } },
  { name: 'swimlane', req: { diagram_type: 'swimlane', title: 'ワークフロー', data: { lanes: [{ actor: '開発', steps: [{ label: '実装' }] }, { actor: 'QA', steps: [{ label: 'テスト' }] }] } } },
  { name: 'decision_tree', req: { diagram_type: 'decision_tree', title: '判断', data: { root: { label: '条件?', yes: { label: 'はい' }, no: { label: 'いいえ' } } } } },
  { name: 'gantt', req: { diagram_type: 'gantt', title: 'スケジュール', data: { tasks: [{ label: '設計', start: 0, end: 3 }, { label: '実装', start: 2, end: 6 }, { label: 'テスト', start: 5, end: 8 }] } } },
  { name: 'concentric_circles', req: { diagram_type: 'concentric_circles', title: '同心円', data: { rings: [{ label: 'コア' }, { label: '中間' }, { label: '外周' }] } } },
  { name: 'pyramid', req: { diagram_type: 'pyramid', title: 'ピラミッド', data: { layers: [{ label: '戦略' }, { label: '戦術' }, { label: '実行' }] } } },
  { name: 'venn', req: { diagram_type: 'venn', title: 'ベン図', data: { sets: [{ label: 'A', items: ['a1'] }, { label: 'B', items: ['b1'] }], intersection: '共通' } } },
  { name: 'ranking', req: { diagram_type: 'ranking', title: 'ランキング', data: { items: [{ label: '1位', value: '100' }, { label: '2位', value: '80' }, { label: '3位', value: '60' }] } } },
  { name: 'kpi_card', req: { diagram_type: 'kpi_card', title: 'KPIダッシュボード', data: { cards: [{ label: '月間売上', value: '1.2M', unit: '円', trend: '+12%', description: '前年比' }, { label: 'ユーザー数', value: '5,000', trend: '-3%', description: '先月比' }, { label: '満足度', value: '4.5', unit: '/5', trend: '+0.2' }] } } },
  { name: 'layer_stack', req: { diagram_type: 'layer_stack', title: 'システム構成', data: { layers: [{ label: 'Presentation', components: ['React', 'Next.js'], description: 'UI layer' }, { label: 'Application', components: ['Node.js', 'Express'], description: 'Business logic' }, { label: 'Data', components: ['PostgreSQL', 'Redis'], description: 'Storage' }] } } },
  { name: 'business_framework', req: { diagram_type: 'business_framework', title: 'ビジネスモデル', data: { blocks: [{ key: 'value_proposition', label: '価値提案', items: ['AI図式化', '認知負荷軽減'] }, { key: 'customer_segments', label: '顧客セグメント', items: ['開発者', 'コンサルタント'] }, { key: 'channels', label: 'チャネル', items: ['Web', 'API'] }, { key: 'revenue_streams', label: '収益源', items: ['SaaS月額'] }, { key: 'key_activities', label: '主要活動', items: ['LLM開発'] }, { key: 'key_resources', label: '主要リソース', items: ['エンジニア'] }, { key: 'key_partners', label: 'パートナー', items: ['OpenAI'] }, { key: 'customer_relationships', label: '顧客関係', items: ['セルフサービス'] }, { key: 'cost_structure', label: 'コスト構造', items: ['API費用', 'インフラ'] }] } } },
];

let total = 0;
let errors = 0;

for (const design of ['clean', 'sketch', 'pixel', 'bold', 'flat', 'glass', 'neon', 'watercolor']) {
  for (const tc of testCases) {
    try {
      const svg = render({ ...tc.req, design });
      writeFileSync(`/tmp/design-${design}-${tc.name}.svg`, svg);
      console.log(`✓ ${design} × ${tc.name}`);
    } catch (e: any) {
      console.error(`✗ ${design} × ${tc.name}: ${e.message}`);
      errors++;
    }
    total++;
  }
}

console.log(`\n${total - errors}/${total} passed. ${errors} errors.`);
