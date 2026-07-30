# domain/

Pure calculation functions with zero dependencies — the app's single source
of truth for derived metrics.

- `constants.ts` — default flare threshold (≥ 3/10, per physio guidance —
  overridable per user, see repositories/types.ts UserSettings), pain scale,
  severity buckets for color coding
- `types.ts` — the domain's own view of a logged day (`DomainDay`); the app
  layer maps DB rows into it
- `rolling.ts` — `average`, `rollingAverage` (trailing window, gap-tolerant)
- `load.ts` — physio load = sets × duration × mean intensity fraction
- `flare.ts` — flare detection, `daysBetween`, `daysSinceLastFlare`
- `aggregate.ts` — daily pain average, calendar-window filtering,
  week-vs-previous-week stats for the dashboard tiles

Rules (PLAN.md §5):

- Imports **nothing** from the rest of the app (no db, no repositories, no React).
- Every function is unit-tested (`__tests__/`, run with `npm test`);
  no DB or browser needed.
- All derived metrics live here and only here — pages and components call in.
