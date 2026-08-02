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

// Grid units: 12 columns, and the row height/margin set in dashboard-grid.tsx
// (one row step is 20px). TILE_H matches the stat tile's locked height in
// widget-registry.tsx's STAT_TILE_BOUNDS — 128px, its natural content size.
const TILE_H = 7;
const CHART_H = 18;

// The phone grid is 2 columns with the same row step as desktop — see
// MOBILE_COLS in dashboard-grid.tsx. Stat tiles take one column each so
// they sit 2x2; charts span both, since a plot at half a phone's width
// isn't readable. Tiles are 9 rows (168px) rather than desktop's 7 (128px)
// because at half width the value/delta line wraps and needs the room.
const M_TILE_W = 1;
const M_TILE_H = 9;
const M_CHART_W = 2;

export const DEFAULT_DASHBOARD_WIDGETS: NewDashboardWidgetInput[] = [
  { widgetType: "stat-pain", x: 0, y: 0, w: 3, h: TILE_H,
    mobileX: 0, mobileY: 0, mobileW: M_TILE_W, mobileH: M_TILE_H },
  { widgetType: "stat-steps", x: 3, y: 0, w: 3, h: TILE_H,
    mobileX: 1, mobileY: 0, mobileW: M_TILE_W, mobileH: M_TILE_H },
  { widgetType: "stat-sleep", x: 6, y: 0, w: 3, h: TILE_H,
    mobileX: 0, mobileY: 9, mobileW: M_TILE_W, mobileH: M_TILE_H },
  { widgetType: "stat-physio-load", x: 9, y: 0, w: 3, h: TILE_H,
    mobileX: 1, mobileY: 9, mobileW: M_TILE_W, mobileH: M_TILE_H },
  { widgetType: "chart-pain-timeline", x: 0, y: 7, w: 12, h: CHART_H,
    mobileX: 0, mobileY: 18, mobileW: M_CHART_W, mobileH: CHART_H },
  { widgetType: "chart-load-vs-symptoms", x: 0, y: 25, w: 12, h: 28,
    mobileX: 0, mobileY: 36, mobileW: M_CHART_W, mobileH: 28 },
  { widgetType: "chart-progression", x: 0, y: 43, w: 12, h: 28,
    mobileX: 0, mobileY: 64, mobileW: M_CHART_W, mobileH: 28 },
  { widgetType: "chart-heatmap", x: 0, y: 61, w: 12, h: 12,
    mobileX: 0, mobileY: 92, mobileW: M_CHART_W, mobileH: 12 },
];
