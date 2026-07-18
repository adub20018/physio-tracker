# Physio Tracker — Project Plan

A personal web dashboard to track rehab progress for a tibialis posterior tendon injury,
replacing the current spreadsheet with structured daily logging and visualisations that
answer two core questions:

1. **Am I actually progressing?** (trends, not day-to-day noise)
2. **When symptoms flare up, what preceded it?** (load vs. symptom relationships)

Logged from **both phone and computer**; hosted on **Vercel**.

**Single-user for now, multi-user ready.** The app serves one user initially, but the schema
and architecture are built so real auth and additional users can be added later without
restructuring — see the "Multi-user readiness" notes in §2, §3, and §5.

---

## 1. Current data (from spreadsheet review)

49 days logged (30 May → 17 July 2026). Columns and formats:

| Column | Format | Notes |
|---|---|---|
| Date | date | daily rows |
| Steps | integer | end-of-day phone step count |
| Physio Exercise | free text | e.g. "Standing ankle raise" (inconsistent casing) |
| Morning / Daytime / Night Pain | number 0–10, 0.5 steps | being converted from `"2/10"` strings to plain numbers (e.g. `2`, `1.5`); 0–10 scale is assumed |
| Physio Notes | `"4x15"`, `"3x20, 1x30"` | **sets × hold duration in seconds** (e.g. `3x20` = three 20-second holds) |
| Intensity | `"Light-Medium (20-25%)"` | label + % load range |
| Activity Notes | free text | mostly patterns: "Gym + physio", "Rest + physio", "+ walking at X" |
| General Notes | free text | rich qualitative detail (pain timing, quality, context) |

Observations that shape the design:
- Intensity ranges ("20–25%") stored as min/max numbers so they can be charted.
- Activity notes are really **tags** (Gym, Rest, Walking, Physio) plus a free-text remainder.
- Notes frequently mention **morning pain easing over the day** and **next-day responses to
  load** — tendon symptoms typically lag load by ~24h, so the dashboard makes
  day-over-day (lagged) comparisons first-class.
- Only one exercise per day so far, but rehab programs grow — the model supports
  **multiple exercises per day** from the start.

## 2. Data model

**Turso** (hosted SQLite-compatible libSQL) via **Drizzle ORM** — required because Vercel's
filesystem is ephemeral, so a plain SQLite file won't persist there. Local development uses
a local SQLite file through the same libSQL driver; the schema and queries are identical.
All DB access goes through a repository layer (see §5) so the storage backend can be swapped
without touching UI or logic.

```
User
  id, name, created_at
  (one seeded row for now; auth fields like email/password hash arrive with real auth later)

DailyLog
  id, user_id → User
  date (unique per user)
  steps            int, nullable
  pain_morning     real 0–10 (0.5 steps), nullable
  pain_daytime     real 0–10 (0.5 steps), nullable
  pain_night       real 0–10 (0.5 steps), nullable
  activity_tags    e.g. ["gym","physio","rest","walking"]
  activity_notes   text  (free-text remainder, e.g. "walking at cafe")
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

**Multi-user readiness:** every log belongs to a `User` from day one, because retrofitting
`user_id` onto years of existing rows is the painful part of going multi-user — adding it
now costs one column. Repository methods take a `userId` parameter and always scope
queries by it; today that id comes from a single seeded user, later it comes from the
logged-in session, and no query code changes.

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
  avg daily steps this week vs. last, current physio volume vs. last week, days since last flare.
- **Pain timeline** (primary chart): morning/daytime/night as light lines + bold 7-day
  rolling average; flare days marked; annotations from notes on hover.
- **Load vs. symptoms**: steps (bars) and physio volume (bars) overlaid with **next-morning
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
- **Lag scatter plots**: today's steps vs. tomorrow-morning pain; physio volume vs.
  next-day pain — with simple correlation coefficient displayed.
- **Flare-up review**: list of detected flare days; clicking one shows a 3-day "what
  happened before" panel (steps, physio, activities, notes from the prior 48–72h).
- **Weekly report card**: per-week averages table with deltas.

### `/history` — Data table
- The spreadsheet view, kept: sortable/filterable table of all entries, inline edit,
  CSV export (data safety — never locked in).

### One-time import
- Script (`scripts/import-xlsx.ts`) that parses the existing spreadsheet into the DB:
  pain → number (handles both `"2/10"` strings and plain numbers), intensity label →
  min/max %, `"3x20"` → sets + hold seconds, activity notes → tags via keyword matching
  (gym/rest/physio/walk), everything else preserved in notes fields. Run once, verify
  against the sheet, done.

### Access control
- The app is deployed publicly on Vercel but holds personal health data, so it needs a
  simple gate: single-password login via middleware that sets a signed cookie. No user
  accounts or third-party auth yet — just "not readable by strangers."
- **Multi-user readiness:** all auth logic sits behind one server-side helper,
  `getCurrentUser()` — pages and actions call it and never inspect cookies themselves.
  Today it validates the password cookie and returns the seeded user; upgrading to real
  auth (e.g. Auth.js with email login, per-user accounts) means reimplementing that one
  helper plus a login page, while every page, action, and repository call stays untouched.

## 4. Tech stack

| Concern | Choice | Why |
|---|---|---|
| Framework | Next.js 16 App Router (already scaffolded) | server components + server actions = no separate API needed |
| Language | TypeScript (already set up) | |
| DB | **Turso (libSQL) + Drizzle ORM** | works on Vercel; SQLite-compatible; local dev uses a local file with the same driver |
| UI components | **PrimeReact** + custom CSS where needed | user preference; rich component set (forms, table, chips) |
| Charts | **Recharts**, wrapped behind our own chart components | composable enough for band charts/heatmaps; wrapper makes it swappable (see §5) |
| Import | `xlsx` (SheetJS) in a one-off script | |
| Validation | zod on form submission | |
| Hosting | Vercel | |

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
  auth/          getCurrentUser() and the password gate. The only place that knows how
                 auth works — swapping to real multi-user auth changes only this folder
                 plus a login page.
  domain/        Pure functions, zero dependencies: rolling averages, physio volume,
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
Turso production DB, password-gate middleware, Vercel deployment. Mobile-responsive
pass (logging happens on the phone), dark mode, empty/loading states, chart annotations
from notes.

## 7. Open questions

1. ~~Where will logging happen?~~ **Resolved: phone + computer, hosted on Vercel.**
   → Turso for the DB, password gate for privacy, mobile-first `/log` form.
2. ~~Pain quality field~~ **Resolved: included, named "pain type"** — optional
   multi-select (ache / sharp / stiffness / numbness-tingling).
3. ~~Flare threshold~~ **Resolved: any pain reading ≥ 3/10**, per physio guidance
   (pain under 3/10 = safe to continue exercises). Stored as one configurable constant.

None remaining — plan approved, ready for Phase 0.

## 8. Future (explicitly out of scope for now)

- **Multi-user support**: real auth (e.g. Auth.js), signup/login, per-user accounts.
  The groundwork is already laid — `user_id` on all data, userId-scoped repositories,
  auth behind `getCurrentUser()` — so this becomes an additive feature, not a rewrite.
  Not being built until the single-user app is complete and useful.
