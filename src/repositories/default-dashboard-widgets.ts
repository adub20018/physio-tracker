// The starting layout seeded for every user's first ("Default") dashboard —
// replicates today's hardcoded /dashboard exactly: 4 stat tiles in a row,
// then the 4 range-dependent charts full-width, then the calendar heatmap.
// widgetType strings match src/components/dashboard-builder/widget-registry.tsx's
// `type` keys by convention, not by import — repositories/ doesn't import
// from components/ (PLAN.md §5's one-way dependency rule), and a widget
// type is fundamentally just a string key either side can agree on.
import type { NewDashboardWidgetInput } from "./types";

export const DEFAULT_DASHBOARD_WIDGETS: NewDashboardWidgetInput[] = [
  { widgetType: "stat-pain", x: 0, y: 0, w: 3, h: 5 },
  { widgetType: "stat-steps", x: 3, y: 0, w: 3, h: 5 },
  { widgetType: "stat-sleep", x: 6, y: 0, w: 3, h: 5 },
  { widgetType: "stat-physio-load", x: 9, y: 0, w: 3, h: 5 },
  { widgetType: "chart-pain-timeline", x: 0, y: 5, w: 12, h: 10 },
  { widgetType: "chart-load-vs-symptoms", x: 0, y: 15, w: 12, h: 10 },
  { widgetType: "chart-sleep-pain", x: 0, y: 25, w: 12, h: 10 },
  { widgetType: "chart-progression", x: 0, y: 35, w: 12, h: 10 },
  { widgetType: "chart-heatmap", x: 0, y: 45, w: 12, h: 10 },
];
