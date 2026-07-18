# domain/

Pure calculation functions with zero dependencies — rolling averages, physio
volume, flare detection (pain ≥ 3/10), lag correlations, week aggregation.

Rules (PLAN.md §5):

- Imports **nothing** from the rest of the app (no db, no repositories, no React).
- Every function is unit-testable without a database or browser.
- All derived metrics live here and only here — pages and components call in.

Populated in Phase 3.
