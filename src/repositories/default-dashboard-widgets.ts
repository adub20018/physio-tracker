// The starting layout seeded for every user's first ("Default") dashboard,
// and what "Reset to default dashboard" restores: 4 stat tiles across the
// top, then Pain over time, Load vs next-day pain, Physio progression, and
// the calendar heatmap, each full width.
//
// widgetType strings match src/components/dashboard-builder/widget-registry.tsx's
// `type` keys by convention, not by import — repositories/ doesn't import
// from components/ (PLAN.md §5's one-way dependency rule), and a widget
// type is fundamentally just a string key either side can agree on.
import type { NewDashboardWidgetInput } from "./types";

// Grid units: 12 columns, and the row height/margin set in dashboard-grid.tsx.
const TILE_H = 5;
const CHART_H = 10;

export const DEFAULT_DASHBOARD_WIDGETS: NewDashboardWidgetInput[] = [
  { widgetType: "stat-pain", x: 0, y: 0, w: 3, h: TILE_H },
  { widgetType: "stat-steps", x: 3, y: 0, w: 3, h: TILE_H },
  { widgetType: "stat-sleep", x: 6, y: 0, w: 3, h: TILE_H },
  { widgetType: "stat-physio-load", x: 9, y: 0, w: 3, h: TILE_H },
  { widgetType: "chart-pain-timeline", x: 0, y: 5, w: 12, h: CHART_H },
  { widgetType: "chart-load-vs-symptoms", x: 0, y: 15, w: 12, h: CHART_H },
  { widgetType: "chart-progression", x: 0, y: 25, w: 12, h: CHART_H },
  { widgetType: "chart-heatmap", x: 0, y: 35, w: 12, h: CHART_H },
];
