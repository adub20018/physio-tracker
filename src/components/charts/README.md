# components/charts/

The app's chart components (PainTimeline, LoadVsSymptoms, CalendarHeatmap, …).

Rules (PLAN.md §5):

- Props are defined by **us**: plain data arrays + config, never Recharts types.
- Recharts is an internal implementation detail of this folder — switching chart
  libraries means reimplementing these components' internals and nothing else.

Populated in Phase 3.
