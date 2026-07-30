# components/charts/

The app's chart components. Props are defined by **us** (plain data arrays +
config) — Recharts is an internal implementation detail of this folder, so
switching chart libraries means reimplementing these components' internals
and nothing else (PLAN.md §5).

- `chart-theme.ts` — validated categorical palette (dataviz six-checks, dark
  surface), recessive chrome, shared tooltip style
- `pain-timeline.tsx` — raw M/D/N lines + bold 7-day rolling average + flare
  dots (status red)
- `load-vs-symptoms.tsx` — steps / physio load / next-morning pain as three
  hover-synced panels sharing an x-axis (never a dual-axis chart)
- `progression-chart.tsx` — intensity min–max band with midpoint + hold
  volume panel
- `calendar-heatmap.tsx` — pure CSS sequential red ramp; unlogged days are
  outlined empty cells, distinct from "zero pain"

Conventions: fixed series → color assignment (never cycled), legends always
present for multi-series charts, text in text colors (never series colors),
animations off for instant server-rendered feel.
