// Seed layout for a user's first dashboard and what "Reset to default" restores. widgetType
// matches widget-registry.tsx's `type` keys by convention (repositories/ can't import components/, PLAN.md §5).
import type { NewDashboardWidgetInput } from "./types";

// Grid units: 12 columns, row height/margin set in dashboard-grid.tsx (one row = 20px).
// TILE_H matches the stat tile's locked height in widget-registry.tsx's STAT_TILE_BOUNDS (128px).
const TILE_H = 7;
const CHART_H = 18;

// Phone grid is 2 columns (MOBILE_COLS in dashboard-grid.tsx); stat tiles sit 2x2, charts
// span both. Tiles are 9 rows vs desktop's 7 since at half width the value/delta line wraps.
const M_TILE_W = 1;
const M_TILE_H = 9;
const M_CHART_W = 2;

export const DEFAULT_DASHBOARD_WIDGETS: NewDashboardWidgetInput[] = [
  {
    widgetType: "stat-pain",
    x: 0,
    y: 0,
    w: 3,
    h: TILE_H,
    mobileX: 0,
    mobileY: 0,
    mobileW: M_TILE_W,
    mobileH: M_TILE_H,
  },
  {
    widgetType: "stat-steps",
    x: 3,
    y: 0,
    w: 3,
    h: TILE_H,
    mobileX: 1,
    mobileY: 0,
    mobileW: M_TILE_W,
    mobileH: M_TILE_H,
  },
  {
    widgetType: "stat-sleep",
    x: 6,
    y: 0,
    w: 3,
    h: TILE_H,
    mobileX: 0,
    mobileY: 9,
    mobileW: M_TILE_W,
    mobileH: M_TILE_H,
  },
  {
    widgetType: "stat-physio-load",
    x: 9,
    y: 0,
    w: 3,
    h: TILE_H,
    mobileX: 1,
    mobileY: 9,
    mobileW: M_TILE_W,
    mobileH: M_TILE_H,
  },
  {
    widgetType: "chart-pain-timeline",
    x: 0,
    y: 7,
    w: 12,
    h: CHART_H,
    mobileX: 0,
    mobileY: 18,
    mobileW: M_CHART_W,
    mobileH: CHART_H,
  },
  {
    widgetType: "chart-load-vs-pain",
    x: 0,
    y: 25,
    w: 12,
    h: 28,
    mobileX: 0,
    mobileY: 36,
    mobileW: M_CHART_W,
    mobileH: 28,
  },
  {
    widgetType: "chart-physio-progression",
    x: 0,
    y: 43,
    w: 12,
    h: 28,
    mobileX: 0,
    mobileY: 64,
    mobileW: M_CHART_W,
    mobileH: 28,
  },
  {
    widgetType: "chart-heatmap",
    x: 0,
    y: 61,
    w: 12,
    h: 12,
    mobileX: 0,
    mobileY: 92,
    mobileW: M_CHART_W,
    mobileH: 12,
  },
];
