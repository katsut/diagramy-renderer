// Main entry: exports render function for all 26 diagram types

import { renderProcess } from './renderers/process.js';
import { renderFunnel } from './renderers/funnel.js';
import { renderBlockList } from './renderers/block_list.js';
import { renderComparisonTable } from './renderers/comparison_table.js';
import { renderCycle } from './renderers/cycle.js';
import { renderHierarchy } from './renderers/hierarchy.js';
import { renderMindMap } from './renderers/mind_map.js';
import { renderTimeline } from './renderers/timeline.js';
import { renderQuadrant } from './renderers/quadrant.js';
import { renderMatrix2x2 } from './renderers/matrix2x2.js';
import { renderCompositeFlow } from './renderers/composite_flow.js';
import { renderBarChart } from './renderers/bar_chart.js';
import { renderPieChart } from './renderers/pie_chart.js';
import { renderRadarChart } from './renderers/radar_chart.js';
import { renderStackedBar } from './renderers/stacked_bar.js';
import { renderRoadmap } from './renderers/roadmap.js';
import { renderNetworkGraph } from './renderers/network_graph.js';
import { renderSankey } from './renderers/sankey.js';
import { renderTreemap } from './renderers/treemap.js';
import { renderSwimlane } from './renderers/swimlane.js';
import { renderDecisionTree } from './renderers/decision_tree.js';
import { renderGantt } from './renderers/gantt.js';
import { renderConcentricCircles } from './renderers/concentric_circles.js';
import { renderPyramid } from './renderers/pyramid.js';
import { renderVenn } from './renderers/venn.js';
import { renderRanking } from './renderers/ranking.js';
import { renderKpiCard } from './renderers/kpi_card.js';
import { renderLayerStack } from './renderers/layer_stack.js';
import { renderBusinessFramework } from './renderers/business_framework.js';
import { DESIGNS, type DesignPreset } from './shared/design.js';
import { resetIconUsage } from './shared/icons.js';

export interface RenderRequest {
  diagram_type: string;
  data: Record<string, unknown>;
  title?: string;
  design?: string;
  style?: string;
}

const RENDERERS: Record<string, (data: any, title?: string, design?: DesignPreset, style?: string) => string> = {
  process:            renderProcess,
  funnel:             renderFunnel,
  block_list:         renderBlockList,
  comparison_table:   renderComparisonTable,
  cycle:              renderCycle,
  hierarchy:          renderHierarchy,
  mind_map:           renderMindMap,
  timeline:           renderTimeline,
  quadrant:           renderQuadrant,
  matrix_2x2:         renderMatrix2x2,
  composite_flow:     renderCompositeFlow,
  bar_chart:          renderBarChart,
  pie_chart:          renderPieChart,
  radar_chart:        renderRadarChart,
  stacked_bar:        renderStackedBar,
  roadmap:            renderRoadmap,
  network_graph:      renderNetworkGraph,
  sankey:             renderSankey,
  treemap:            renderTreemap,
  swimlane:           renderSwimlane,
  decision_tree:      renderDecisionTree,
  gantt:              renderGantt,
  concentric_circles: renderConcentricCircles,
  pyramid:            renderPyramid,
  venn:               renderVenn,
  ranking:            renderRanking,
  kpi_card:           renderKpiCard,
  layer_stack:        renderLayerStack,
  business_framework: renderBusinessFramework,
};

export function render(req: RenderRequest): string {
  resetIconUsage();
  const design = req.design ? DESIGNS[req.design] : undefined;

  const renderer = RENDERERS[req.diagram_type];
  if (!renderer) {
    throw new Error(`Unsupported diagram type: ${req.diagram_type}`);
  }
  return renderer(req.data, req.title, design, req.style);
}
