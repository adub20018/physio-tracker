# PhysiMate — Project Plan

A personal web dashboard to track rehab progress for a tibialis posterior tendon injury,
replacing the current spreadsheet with structured daily logging and visualisations that
answer two core questions:

1. **Am I actually progressing?** (trends, not day-to-day noise)
2. **When symptoms flare up, what preceded it?** (load vs. symptom relationships)

Logged from **both phone and computer**; hosted on **Vercel**.

**Multi-user, with real per-account auth.** Every person gets their own account (via Neon
Auth) and their own private set of logs — the schema and repository layer were built
userId-scoped from day one specifically so this didn't require a rewrite (see §2, §3, §5).

---

## 1. Current data (from spreadsheet review)

49 days logged (30 May → 17 July 2026). Columns and formats:

| Column                         | Format                    | Notes                                                                                           |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- |
| Date                           | date                      | daily rows                                                                                      |
| Steps                          | integer                   | end-of-day phone step count                                                                     |
| Physio Exercise                | free text                 | e.g. "Standing ankle raise" (inconsistent casing)                                               |
| Morning / Daytime / Night Pain | number 0–10, 0.5 steps    | being converted from `"2/10"` strings to plain numbers (e.g. `2`, `1.5`); 0–10 scale is assumed |
| Physio Notes                   | `"4x15"`, `"3x20, 1x30"`  | **sets × hold duration in seconds** (e.g. `3x20` = three 20-second holds)                       |
| Intensity                      | `"Light-Medium (20-25%)"` | label + % load range                                                                            |
| Activity Notes                 | free text                 | mostly patterns: "Gym + physio", "Rest + physio", "+ walking at X"                              |
| General Notes                  | free text                 | rich qualitative detail (pain timing, quality, context)                                         |

Observations that shape the design:

- Intensity ranges ("20–25%") stored as min/max numbers so they can be charted.
- Activity notes are really **tags** (Gym, Rest, Walking, Physio) plus a free-text remainder.
- Notes frequently mention **morning pain easing over the day** and **next-day responses to
  load** — tendon symptoms typically lag load by ~24h, so the dashboard makes
  day-over-day (lagged) comparisons first-class.
- Only one exercise per day so far, but rehab programs grow — the model supports
  **multiple exercises per day** from the start.

## 2. Data model

**Postgres, hosted on Neon** (via `@neondatabase/serverless` + `drizzle-orm/neon-http`) —
Vercel's filesystem is ephemeral, so the DB has to be a real hosted service, not a file.
All DB access goes through a repository layer (see §5) so the storage backend can be swapped
without touching UI or logic.

Identity is **Neon Auth** (Better Auth, hosted by Neon), which provisions its own
`neon_auth.user` table (plus session/account/verification) in this same Postgres database —
we don't keep a separate app-level users table. `daily_logs.user_id` is a `uuid` column that
foreign-keys directly into `neon_auth.user.id` (a cross-schema constraint, hand-written in
`src/db/migrations/0001_repoint-user-fk.sql` since drizzle-kit only manages the `public`
schema — see the comment on `dailyLogs.userId` in `src/db/schema.ts`).

```
DailyLog
  id, user_id → neon_auth.user.id
  date (unique per user)
  steps            int, nullable
  pain_morning     real 0–10 (0.5 steps), nullable
  pain_daytime     real 0–10 (0.5 steps), nullable
  pain_night       real 0–10 (0.5 steps), nullable
  activity_tags    e.g. ["gym","physio","rest","walking"]
  general_notes    text
  sleep_hours      real, nullable
  pain_type        tags, nullable — optional multi-select: ache | sharp | stiffness | numbness-tingling

ExerciseEntry (0..n per DailyLog)
  id, daily_log_id
  exercise_name    normalized text (picker with autocomplete from past entries)
  sets             int                   ("3 sets of 20-second holds" → sets = 3)
  duration_or_reps int                   (hold seconds for isometrics; rep count if a future exercise is rep-based)
  unit             enum: seconds | reps  (defaults to seconds)
  intensity_min    real (% load)
  intensity_max    real (% load)
  notes            text, nullable        (catches "last set 30s hold to test" cases)
```

Pain values are stored as `real` (not integer) to allow half-steps like `1.5`.

**Multi-user by design:** every log belongs to a user from day one, because retrofitting
`user_id` onto years of existing rows would have been the painful part of going multi-user.
Repository methods take a `userId` parameter and always scope queries by it; that id comes
from the signed-in Neon Auth session via `getCurrentUser()` (§3), so no query code needed to
change when real auth replaced the single seeded user.

Derived (computed by pure functions, never stored):

- **Daily pain average** and **7-day rolling averages** per pain slot
- **Physio volume** = Σ sets × duration × mean intensity (a single "how hard was physio today" number)
- **Flare flag** = any pain reading ≥ **3/10**, per physio guidance that pain under 3/10
  means exercises can continue. Kept as a single configurable constant in `domain/` so it
  can be adjusted if the guidance changes.

Variable changes vs. the spreadsheet:

- **Keep**: everything currently tracked.
- **Restructure**: intensity → min/max %; sets/holds → structured; activity → tags + text.
- **Add**: sleep hours and pain type (both optional fields, skippable on any day).

## 3. Pages & features

### `/` — Dashboard (the main event)

- **Headline stat tiles**: current 7-day avg pain vs. previous 7 days (with trend arrow),
  avg daily steps this week vs. last, current physio load vs. last week, days since last flare.
- **Pain timeline** (primary chart): morning/daytime/night as light lines + bold 7-day
  rolling average; flare days marked; annotations from notes on hover.
- **Load vs. symptoms**: steps (bars) and physio load (bars) overlaid with **next-morning
  pain** (line) — the chart that answers "what did I do before it flared?"
- **Progression chart**: intensity % band (min–max) and sets×duration volume over time —
  shows the rehab program itself is advancing, which is progress even when pain plateaus.
- **Calendar heatmap**: one cell per day coloured by avg pain — the at-a-glance
  "is the colour getting greener" view the spreadsheet colour-coding was trying to be.

### `/log` — Daily entry form

- Optimised for a 30-second daily habit **on a phone**: date defaults to today, pain as
  tap-to-select 0–10 chips (0.5 steps), steps numeric, activity tag toggles, pain type
  toggles, exercise rows prefilled from the last entry (rehab rarely changes day-to-day),
  sleep hours, notes.
- Editing past days supported (same form, pick a date).

### `/insights` — Correlation explorer

- **Lag scatter plots**: today's steps vs. tomorrow-morning pain; physio load vs.
  next-day pain — with simple correlation coefficient displayed.
- **Flare-up review**: list of detected flare days; clicking one shows a 3-day "what
  happened before" panel (steps, physio, activities, notes from the prior 48–72h).
- **Weekly report card**: per-week averages table with deltas.

### `/history` — Data table

- The spreadsheet view, kept: sortable/filterable table of all entries, inline edit,
  CSV export (data safety — never locked in).

### Spreadsheet import

- The parsing logic (pain → number, handling both `"2/10"` strings and plain numbers;
  intensity label → min/max %; `"3x20"` → sets + hold seconds; activity notes → tags via
  keyword matching) lives in `src/domain/xlsx-import.ts`, pure and DB-agnostic.
- An in-app "Import from spreadsheet" flow on `/log/import`: preview classifies each row
  as new or an overwrite of an already-logged day without writing anything, then confirm
  writes only what's approved (AGENTS.md's no-bulk-overwrite-without-confirmation rule) —
  into the signed-in user's own account, so anyone with a same-format spreadsheet can
  bring their own history in. Replaces the original single-user CLI script.

### Access control

- Real per-account auth via **Neon Auth** (Better Auth, hosted by Neon) — email/password
  sign-up and sign-in, each account's data private to it. `src/proxy.ts` (Next 16's
  `middleware.ts`) gates every route except `/login`, `/sign-up`, and static assets.
- All auth logic sits behind one server-side helper, `getCurrentUser()`
  (`src/auth/get-current-user.ts`) — pages and actions call it and never touch sessions or
  cookies themselves. It resolves the real Neon Auth session; nothing else in the app needed
  to change when this replaced the original single-password gate.

## 4. Tech stack

| Concern       | Choice                                                                        | Why                                                                                                    |
| ------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Framework     | Next.js 16 App Router (already scaffolded)                                    | server components + server actions = no separate API needed                                            |
| Language      | TypeScript (already set up)                                                   |                                                                                                        |
| DB            | **Postgres (hosted on Neon) + Drizzle ORM**                                   | works on Vercel (no ephemeral-filesystem problem); one DB for both app data and Neon Auth's own tables |
| Auth          | **Neon Auth** (Better Auth, hosted by Neon)                                   | real per-account sign-up/sign-in without running our own auth infra                                    |
| UI components | **PrimeReact** + custom CSS where needed                                      | user preference; rich component set (forms, table, chips)                                              |
| Charts        | **Recharts**, wrapped behind our own chart components                         | composable enough for band charts/heatmaps; wrapper makes it swappable (see §5)                        |
| Import        | `xlsx` (SheetJS) — moving from a one-off script to an in-app upload (Phase 8) |                                                                                                        |
| Validation    | zod on form submission                                                        |                                                                                                        |
| Hosting       | Vercel                                                                        |                                                                                                        |

⚠️ Per AGENTS.md: this Next.js version has breaking changes — **read the relevant guides in
`node_modules/next/dist/docs/` before writing any code** in each phase.

## 5. Architecture & modularity

Guiding rule: **each concern lives behind its own interface, so swapping one piece
(chart library, database, UI kit) never ripples into the others.**

```
src/
  db/            Drizzle schema + client. Nothing outside this folder imports Drizzle.
  repositories/  Data in/out. Plain-TS interfaces (DailyLogRepository, …) with a
                 Drizzle implementation. UI and logic depend on the interface only —
                 swapping Turso → Postgres (or anything) means one new implementation.
                 All methods are scoped by userId (multi-user ready from day one).
  auth/          getCurrentUser(), plus the Neon Auth server/client instances. The only
                 place that knows how auth works — every page and action calls
                 getCurrentUser() and never touches sessions or cookies directly.
  domain/        Pure functions, zero dependencies: rolling averages, physio load,
                 flare detection, lag correlations, week aggregation. Unit-testable
                 without a DB or browser; usable by any UI.
  components/
    charts/      Our own chart components (PainTimeline, LoadVsSymptoms, CalendarHeatmap…)
                 with props defined by *us* (plain data arrays + config). Recharts is an
                 internal detail of this folder — switching chart libraries means
                 reimplementing these components' internals, nothing else.
    ui/          Thin wrappers/composition of PrimeReact pieces where useful, so a UI-kit
                 change is similarly contained.
  app/           Next.js routes. Pages fetch via repositories, compute via domain,
                 render via components. No business logic in pages.
```

Dependency direction (one-way): `app → components / domain / repositories → db`.
Nothing imports "upward," and `domain` imports nothing at all.

## 6. Build phases

**Phase 0 — Foundations**
Read Next 16 docs (routing, server actions, data fetching). Add PrimeReact, Drizzle +
libSQL, Recharts, zod, xlsx. Define schema (including the User table with one seeded
user), set up local dev DB + migrations, folder structure from §5.

**Phase 1 — Data in**
Import script for the existing spreadsheet → verify all 49 days round-trip correctly.
`/history` table view with PrimeReact DataTable (proves the data layer end-to-end).

**Phase 2 — Daily logging**
`/log` form with server actions, validation, edit-past-days. From this point the app
replaces the spreadsheet day-to-day.

**Phase 3 — Dashboard**
Domain functions (rolling avg, volume, flare detection) as pure, tested utilities.
Stat tiles, pain timeline, calendar heatmap, load-vs-symptom chart, progression chart.

**Phase 4 — Insights**
Lag correlation scatters, flare-up review panel, weekly report card, CSV export.

**Phase 5 — Deploy & polish**
Mobile-responsive pass (logging happens on the phone), dark mode, empty/loading states,
chart annotations from notes — done. DB and access control ended up switching from the
original Turso + single-password plan to Neon Postgres + Neon Auth (real per-account
sign-up), landed on the `neon-auth` branch; Vercel deployment itself is still pending.

**Phase 6 — Cleanup after the Neon/auth switch**
Repoint `daily_logs.userId` to `neon_auth.user.id` and drop the now-redundant local
`users` table; remove dependencies left over from the Turso/libSQL setup; retire the
single-user CLI import script; update env files and this plan — done. Also fixed a
save-blocking bug found during verification: `@neondatabase/auth`'s beta middleware
forwarded the original request's HTTP method to its internal session check, so every
`/log` Server Action save was misread as unauthenticated (worked around in `proxy.ts`).

**Phase 7 — Login/signup UX**
Style `/login` and `/sign-up` with PrimeReact, matching the rest of the app. Real
validation: confirm-password field on sign-up, email format, required name, clear error
states for wrong credentials and for signing up with an already-registered email — done.

**Phase 8 — In-app spreadsheet import**
Replace the retired CLI script with an "Import from spreadsheet" flow at `/log/import`
(preview → confirm, scoped to the signed-in user's own account), reusing the parsing
logic moved to `src/domain/xlsx-import.ts` — done.

**Phase 9 (future) — Auth completeness**
Forgot-password flow and other auth gaps, scoped once Phases 6–8 are done.

## 7. Open questions

1. ~~Where will logging happen?~~ **Resolved: phone + computer, hosted on Vercel.**
   → Turso for the DB, password gate for privacy, mobile-first `/log` form.
2. ~~Pain quality field~~ **Resolved: included, named "pain type"** — optional
   multi-select (ache / sharp / stiffness / numbness-tingling).
3. ~~Flare threshold~~ **Resolved: any pain reading ≥ 3/10**, per physio guidance
   (pain under 3/10 = safe to continue exercises). Stored as one configurable constant.

None remaining — plan approved, ready for Phase 0.

## 8. Future (explicitly out of scope for now)

- **Auth completeness** (Phase 9): forgot-password flow and any other gaps found once
  Phases 6–8 land.
- **Smart watch data import**: motivated the move to Postgres ahead of schedule (more
  headroom for higher-volume time-series data than SQLite/Turso would comfortably give).
  Not yet scoped.

## 9. Potential charts (backlog)

Dashboard stat-tile/chart ideas discussed but deliberately deferred until the MVP is more
fleshed out (and, for the Garmin-dependent ones, until that import exists at all). Not
scheduled to a phase — pull from here when there's room.

- **Pain-vs-load trend** — not a stat tile: with the current amount of data, a single
  Pearson r isn't meaningful yet, and a static correlation number wouldn't show what's
  actually wanted, which is whether the pain-per-unit-load relationship is _improving_
  over time (handling more physio load for less pain). Needs either a rolling correlation
  recomputed over trailing multi-week windows, or a load-vs-pain scatter shaded by date so
  the cluster's drift over time is visible directly.
- **Time-of-day pain skew** — a chart, not a tile. The existing "Pain over time" chart
  already plots morning/daytime/night as separate series but only computes one combined
  7-day rolling average; running `rollingAverage()` separately on each of the three
  series (instead of once on the combined data) and plotting three trend lines would
  surface whether pain is shifting between times of day (e.g. morning-dominant →
  night-dominant) — a pattern the combined average hides.
- **Sleep stage correlation** — depends on Garmin import (not yet scoped). Once raw stage
  minutes (deep/REM/light/awake) are available, run the same correlation machinery
  already used for load-vs-pain against each stage separately, rather than trusting
  Garmin's opaque composite "sleep score," which blends in inputs (restlessness, bedtime
  consistency) unrelated to tendon recovery specifically.
- **Logging streak** — a small badge/icon (e.g. near the account menu), not a stat tile.
  Nice-to-have habit nudge, not a rehab metric.
