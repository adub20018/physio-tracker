# Widget descriptions

Every widget the app ships, followed by every variable it can draw on. Generated
from `src/components/dashboard-builder/widget-registry.tsx` and
`src/lib/definitions.ts` — the same text shown in widget tooltips and on the
`/definitions` page.

Reference doc, kept for planning what to build next. It is not loaded by the app,
so it can go stale — regenerate it from those two files rather than editing here
and expecting the app to follow.

- **27 widgets**: 6 stat tiles, 11 dashboard charts, 10 insights charts
- **24 variables**: 9 logged, 15 derived

---

## Part 1 — Widgets

### Stat tiles

A single 7-day number with its change against the previous week, plus a sparkline
of the underlying days.

#### Avg pain (7D)

Shows your average daily pain over 7 days, with a trend line showing how it has changed across each day in this period.

Use it to answer: "Is my pain improving, worsening, or staying consistent?"

#### Avg daily steps (7D)

Shows your average daily steps over 7 days, showing how your activity has changed across each day in this period.

Use it to answer: "Is my activity level increasing, decreasing, or staying consistent?"

#### Avg sleep (7D)

Shows your average nightly sleep duration over 7 days, showing how your sleep has changed across each night in this period.

Use it to answer: "Is my sleep improving, worsening, or staying consistent?"

#### Physio load (7D)

Shows your average daily physio load over 7 days, with a trend line showing how your rehabilitation workload has changed across each day in this period.

Use it to answer: "Is my rehabilitation workload increasing, decreasing, or staying consistent?"

#### Physio load ratio

Shows your last 7 days of physio load as a multiple of the 28-day baseline you've built up to.

Use it to answer: "Have I stepped up my physio faster than usual?"

#### Step load ratio

Shows your last 7 days of steps as a multiple of the 28-day baseline you've built up to.

Use it to answer: "Am I increasing my steps gradually?"

### Dashboard charts

Time series over the dashboard's selected range.

#### Pain over time

Shows your morning, daytime, and night pain over time, alongside a 7-day trend line and highlighted flare days.

Use it to answer: "Is my pain improving overall, or just fluctuating from day to day?"

#### Load vs next-day pain

Shows your daily steps and physio load alongside the following day's pain.

Use it to answer: "Did yesterday's workload contribute to today's pain?"

#### Sleep & pain over time

Shows your sleep alongside your pain throughout the same day.

Use it to answer: "Does getting more or less sleep seem to affect my pain?"

#### Physio progression

Shows how your rehabilitation program has progressed by tracking exercise intensity, hold volume, and overall physio load.

Use it to answer: "Am I steadily progressing my rehabilitation program?"

#### Workload ratio (ACWR)

Shows your recent physio load and steps as a multiple of the 28-day baseline you've built up to, with the usual steady range shaded.

Use it to answer: "Am I ramping up faster than I've adapted to?"

#### Workload ratio (EWMA)

Shows your recent physio load and steps as a multiple of a baseline that weights recent days most, unlike the ACWR version's flat 28-day average.

Use it to answer: "Am I ramping up faster than I've recently adapted to?"

#### Step load zones (ACWR)

Shows your daily steps against a steady range scaled to your own 28-day baseline, so the range moves as that baseline does.

Use it to answer: "How many steps a day is a sensible amount right now?"

#### Step load zones (EWMA)

Shows your daily steps against a steady range scaled to a baseline that weights recent days most, unlike the ACWR version's flat 28-day average.

Use it to answer: "How many steps a day is sensible, given what I've been doing lately?"

#### Physio load zones (ACWR)

Shows your daily physio load against a steady range scaled to your own 28-day baseline, so the range moves as that baseline does.

Use it to answer: "How much physio a day is a sensible amount right now?"

#### Physio load zones (EWMA)

Shows your daily physio load against a steady range scaled to a baseline that weights recent days most, unlike the ACWR version's flat 28-day average.

Use it to answer: "How much physio a day is sensible, given what I've been doing lately?"

#### Calendar / Pain Heatmap

Shows your daily pain as a color-coded calendar, making patterns and flare periods easy to spot.

Use it to answer: "When was my pain better or worse?"

### Insights charts

Relationships between two variables, plus the two report widgets.

#### Steps vs next-morning pain

Shows the relationship between your daily steps and your pain the following morning.

Use it to answer: "Do higher step counts lead to more pain the next morning?"

#### Steps vs peak next-day pain

Shows the relationship between your daily steps and your highest pain the following day.

Use it to answer: "Do higher step counts lead to worse pain the next day?"

#### Steps vs average next-day pain

Shows the relationship between your daily steps and your average pain the following day.

Use it to answer: "Do higher step counts affect my overall pain the next day?"

#### Physio load vs next-morning pain

Shows the relationship between your physio load and your pain the following morning.

Use it to answer: "Does increasing my physio workload affect my pain the next morning?"

#### Physio load vs peak next-day pain

Shows the relationship between your physio load and your highest pain the following day.

Use it to answer: "Does increasing my physio workload lead to worse pain the next day?"

#### Physio load vs average next-day pain

Shows the relationship between your physio load and your average pain the following day.

Use it to answer: "Does increasing my physio workload affect my overall pain the next day?"

#### Morning-to-day pain

Shows how your pain changes throughout each day, from morning to night.

Use it to answer: "Does my pain usually improve or worsen as the day goes on?"

#### Sleep vs pain, all day

Shows the relationship between your sleep and your pain throughout the same day.

Use it to answer: "Does getting more sleep seem to affect my pain?"

#### Flare review

Shows every flare day alongside the activity, physio, and notes from the days leading up to it.

Use it to answer: "What happened before my flare-up?"

#### Weekly report card

Shows a weekly summary of your pain, activity, physio load, and flare count.

Use it to answer: "How does each week compare with the last?"

---

## Part 2 — Variables

Values are either **logged** — typed in on the Log page — or **derived**,
calculated from logged values.

### Logged each day

Typed in on the Log page. Every field is optional — a day with only a step count
is still a logged day, and the derived values below simply skip what isn't there.

#### Date · logged

The calendar day an entry belongs to.

- **Collected:** Defaults to today on the Log page; past days can be picked and edited. One entry per date.
- Stored as a plain calendar date, so entries don't shift when you travel between timezones.

#### Steps · logged

Total steps walked that day.

- **Collected:** Read off your phone or watch and typed into the Log page's Activity section.
- **Units:** steps · 0–200,000
- This is the app's stand-in for general daily walking load — it isn't split by walk, and it doesn't include gym or physio work.

#### Pain readings (morning, daytime, night) · logged

How much it hurt, rated three times across the day.

- **Collected:** Three separate sliders on the Log page's Pain section. Each is independent — record one, two, or all three.
- **Units:** 0–10 in steps of 0.5
- Morning pain is the reading physios usually treat as the irritability signal for tendon problems, since overnight rest resets it.
- A missing reading means 'not recorded', never zero — derived values skip it rather than counting it as painless.

#### Sleep hours · logged

Hours slept the night before that day.

- **Collected:** Typed into the Log page's Activity section.
- **Units:** hours · 0–24
- Logged against the day you woke up, so it precedes all three of that day's pain readings — which is why sleep is compared same-day rather than lagged.

#### Pain type · logged

The character of the pain, as tags.

- **Collected:** Tapped from suggested chips (ache, sharp, stiffness, numbness-tingling) on the Log page's Pain section; custom tags are allowed.
- Descriptive only — no derived value reads these.

#### Activity tags · logged

What kind of activity the day involved.

- **Collected:** Tapped from suggested chips (gym, physio, rest, walking, hiking) on the Log page; custom tags are allowed. A spreadsheet import fills these in by keyword from the Activity Notes column.
- Descriptive only. Physio load is calculated from logged exercises, not from the presence of a 'physio' tag.

#### Notes · logged

Free text about the day.

- **Collected:** Typed into the Log page's Notes section.
- Shown alongside flare days in Flare review, which is where context like 'new shoes' or 'long drive' earns its keep.

### Physio exercises

Logged per exercise, so one day can hold several. These fields are the raw inputs
behind physio load.

#### Exercise, sets, and reps or hold time · logged

One exercise as performed: its name, how many sets, and how long or how many.

- **Collected:** Entered per exercise on the Log page's Physio section. Each set group records a count and a duration in seconds or a number of reps.
- Mixed set groups on one exercise (say 3×20s plus 1×30s) are stored as separate entries so the detail survives.
- Exercise names are normalised to one casing, so 'calf raise' and 'Calf Raise' don't become two different exercises.

#### Intensity range · logged

How loaded the exercise was, as a percentage range.

- **Collected:** Entered as a minimum and maximum percentage on the Log page's Physio section — a range because prescriptions often give one (e.g. 20–25%).
- **Units:** %
- Optional. When it's missing, physio load treats the exercise as unweighted rather than dropping it.

### Derived — pain

Calculated from the pain readings above. Nothing here is entered by hand.

#### Daily pain average · derived

One number for how the whole day felt.

- **Built from:** Computed from that day's recorded pain readings.
- **Formula:** `mean of the recorded morning, daytime and night readings`
- **Why it helps:** Flattens the swing within a day so days can be compared to each other. It's what the calendar colours and the weekly averages use.
- Readings you didn't record are skipped, not counted as zero — a day with only a night reading averages to that reading.

#### Daily pain peak · derived

The worst the day got.

- **Built from:** Computed from that day's recorded pain readings.
- **Formula:** `highest of the recorded morning, daytime and night readings`
- **Why it helps:** An average can hide a bad afternoon between two fine readings. The peak answers 'how bad did it actually get', which is the question that matters when judging whether a given day's activity was too much.

#### 7-day pain trend · derived

The smoothed line through day-to-day pain noise.

- **Built from:** Computed across the daily pain averages.
- **Formula:** `mean of the last 7 days' pain averages, recomputed each day`
- **Why it helps:** Day-to-day pain bounces enough that two consecutive readings tell you almost nothing about direction. The trend is what answers 'am I actually getting better', which single days can't.
- Trailing, not centred — each point uses that day and the six before it, so it never uses future data.

#### Flare day · derived

A day bad enough to count as a flare-up.

- **Built from:** Tested against every recorded reading for the day.
- **Formula:** `any single reading at or above your flare threshold (default 3/10)`
- **Why it helps:** Turns a continuous scale into a countable event, so flares can be counted per week and reviewed alongside what preceded them.
- Any one reading is enough — a day that spikes at night still counts, even if the average looks fine.
- The threshold is yours to set, in Account → Preferences.

#### Days since last flare · derived

How long you've gone without one.

- **Built from:** Measured from the most recent flare day to today.
- **Formula:** `calendar days between the latest flare day and today`
- **Why it helps:** A streak is easier to read than a chart when the question is simply 'how's it going lately', and it keeps improving on quiet days without needing new data.
- 0 means today flared. Blank means no flare has ever been logged.

### Derived — load

How much work you did, and how that compares to what your body is used to.

#### Physio load · derived

One number for how much rehab work a day contained.

- **Built from:** Computed from every exercise entry logged that day.
- **Formula:** `per exercise: sets × (hold seconds or reps) × mean intensity — where mean intensity is the midpoint of the intensity range as a fraction (25–35% → 0.30). Summed across the day's exercises.`
- **Why it helps:** Sets, hold time and intensity all move independently — you can do fewer, longer, harder sets and be doing more work overall. Collapsing them into one number is what lets rehab work be charted against symptoms and compared week to week.
- With no intensity recorded, the multiplier is 1 — the entry counts as raw sets × time rather than being dropped.
- The number has no unit and isn't comparable to anyone else's. Only its movement relative to your own history means anything.
- A logged rest day is a genuine 0. A day you didn't log is unknown, and derived values skip it.

#### Hold volume · derived

Time under load, ignoring how hard it was.

- **Built from:** Computed from every exercise entry logged that day.
- **Formula:** `sum of sets × (hold seconds or reps), with no intensity weighting`
- **Why it helps:** Shown next to physio load because the two can move in opposite directions: longer holds at a lower percentage raise volume while lowering load. Seeing both makes it clear which lever the programme actually moved.

#### Acute load · derived

What you've been doing lately.

- **Built from:** A rolling average over the most recent days.
- **Formula:** `mean daily value over the last 7 days`
- **Why it helps:** The numerator of the workload ratio. On its own it's the recent-work figure the ratio compares against your baseline.
- Needs at least 3 logged days in the window; below that it stays blank rather than reporting an average built from almost nothing.

#### Chronic load (baseline) · derived

What your body is currently adapted to.

- **Built from:** A rolling average over a longer window.
- **Formula:** `mean daily value over the last 28 days`
- **Why it helps:** Your moving normal. It's the reference every workload comparison is made against, and it rises as you train more — which is why the safe range moves with you rather than being a fixed target.
- Needs at least 14 logged days in the window, so a single session can't define a four-week baseline.
- Unlogged days are skipped rather than counted as zero, so gaps in logging don't fake a drop in your baseline.

#### Workload ratio (ACWR) · derived

Recent work measured against what you're used to.

- **Built from:** Computed for physio load and for steps, separately.
- **Formula:** `acute load ÷ chronic load — the 7-day mean divided by the 28-day mean`
- **Why it helps:** A raw load of 450 is meaningless without knowing your normal. The ratio answers 'is this a lot for me, right now': 1.00× is training exactly at your baseline, 1.50× is half again more than your body has adapted to. It's the one number that flags a spike while it's happening rather than after the flare.
- Known in sports science as the acute:chronic workload ratio, if you want to read further.
- It bounds your weekly average, not any single day — one hard session is fine if the week's average stays in range.
- Blank until there's enough logged history, and blank rather than infinite when the baseline is zero.
- The bands it's read against are conventions, not facts — see Workload zones below.
- Both means here are flat: every day in the window counts the same, and drops out entirely once it falls off the end. The EWMA version below fades them instead.

#### Workload ratio, EWMA version · derived

The same ratio, with recent days counting for more than old ones.

- **Built from:** Computed for physio load and for steps, separately, from the same logged days.
- **Formula:** `each day's average = today's value × λ + yesterday's average × (1 − λ), where λ = 2 ÷ (window + 1) — so 0.25 for the 7-day average and 0.069 for the 28-day one. The ratio is then acute ÷ chronic, exactly as above.`
- **Why it helps:** A flat 28-day baseline counts a session from four weeks ago exactly as much as yesterday's, and drops it entirely on day 29. That makes it slow to notice a fortnight of harder work — your baseline reads lower than what you're actually adapted to, so the ratio overstates a ramp. Weighting the recent days more heavily tracks that adaptation as it happens, and the older days fade out gradually instead of falling off a cliff.
- Read against the same zones as the flat version — they aren't recalibrated for it.
- The two ratios usually agree. When they disagree, the EWMA is the one reacting to something recent, which is worth a look rather than an alarm.
- Needs the same warm-up before it appears, but counts logged days in total rather than within a window: an exponential average never forgets a day, so intermittent logging still builds a baseline.
- An unlogged day carries both averages forward untouched rather than decaying them — same reasoning as everywhere else here.

#### Workload zones · derived

The bands the workload ratio is read against.

- **Built from:** Fixed cut-offs applied to the workload ratio.
- **Formula:** `under 0.8× · steady 0.8–1.3× · higher risk 1.3–1.5× · above 1.5×`
- **Why it helps:** Turns the ratio into a read at a glance. Multiplied through your baseline they also become a range in real units — if your baseline is 1,900 steps, steady is roughly 1,520–2,470 steps a day.
- These cut-offs come from team-sport research and are not golden numbers. They have never been validated for one person's rehab, so treat a reading as a prompt to look, not a verdict — and worth raising with your physio before letting them steer decisions.
- Below the steady band isn't automatically bad: it's what deliberate rest weeks look like.
- On the zone charts, the bars are that day's own total, drawn for context — a tall bar is a big day, not a dangerous one, since the range bounds the week rather than the day.
- The zone charts come in two versions: ACWR ones scale the bands through the flat 28-day baseline, EWMA ones through the exponentially weighted baseline. Same bands either way — only the baseline they're multiplied by differs.

### Derived — relationships

Values that compare two things rather than describing one.

#### Next-day pairing · derived

Today's activity lined up against tomorrow's pain.

- **Built from:** Pairs each day's steps or physio load with the following day's pain readings.
- **Formula:** `day N's load paired with day N+1's morning, peak, or average pain`
- **Why it helps:** Tendon pain often shows up the day after the work that caused it, so comparing load against the same day's pain would miss the effect entirely. Days where either side is missing are dropped from the pair.

#### Correlation (r) · derived

How strongly two things move together.

- **Built from:** Computed across every complete pair of points on a scatter chart.
- **Formula:** `Pearson correlation coefficient, from −1 (perfect opposite) through 0 (no relationship) to +1 (perfect together)`
- **Why it helps:** Puts a number on what a scatter plot only suggests. Strength is labelled from the size of r regardless of sign: strong from 0.7, moderate from 0.4, weak from 0.2, negligible below.
- Correlation is not cause. Two things can move together because a third drives both — a busy week raises steps and gym work at once.
- Blank below three paired days, or when one side never varies.
- The app shows several of these on the same data. With a few dozen days, some will look moderate by chance alone, so treat a single striking number with suspicion.

#### Weekly averages · derived

One row per calendar week.

- **Built from:** Groups logged days into Monday-to-Sunday weeks.
- **Formula:** `per week: mean daily pain average, mean daily steps, total physio load, and a count of flare days`
- **Why it helps:** Weeks smooth out the day-level noise more aggressively than a rolling average, which makes 'is this month better than last' answerable at a glance.
- Physio load is a weekly total, while pain and steps are averages — a week with fewer logged days shows a lower total but an unaffected average.
- Weeks with nothing logged don't appear at all.

---

## Part 3 — Coverage

Which variables currently have a widget, and which don't. The gaps are where new
widget ideas are most likely to be worth something.

| Variable | Widgets using it |
| --- | --- |
| Date | (structural — every chart's x-axis) |
| Steps | Avg daily steps, Load vs next-day pain, 3 × steps scatters, both step zone charts, both workload ratio charts |
| Pain readings | Avg pain, Pain over time, Morning-to-day pain, Sleep & pain, heatmap |
| Sleep hours | Avg sleep, Sleep & pain over time, Sleep vs pain all day |
| Pain type | **none** |
| Activity tags | Flare review only (as context) |
| Notes | Flare review only (as context) |
| Exercise, sets, reps/hold | Physio progression (via hold volume) |
| Intensity range | Physio progression |
| Daily pain average | heatmap, Steps vs average next-day pain, weekly report |
| Daily pain peak | Steps vs peak, Physio load vs peak |
| 7-day pain trend | Pain over time |
| Flare day | Pain over time, Flare review, weekly report |
| Days since last flare | **none** — computed but not surfaced in any widget |
| Physio load | Physio load tile, Load vs next-day pain, Physio progression, 3 × load scatters, both physio zone charts, both ratio charts |
| Hold volume | Physio progression |
| Acute load | both ratio charts, all four zone charts |
| Chronic load | both ratio charts, all four zone charts |
| Workload ratio (ACWR) | Physio/Step load ratio tiles, Workload ratio (ACWR) |
| Workload ratio (EWMA) | Workload ratio (EWMA) |
| Workload zones | all four zone charts, ratio charts' shaded bands |
| Next-day pairing | Load vs next-day pain, all six scatters |
| Correlation (r) | all six scatters (as a caption) |
| Weekly averages | Weekly report card |

Gaps worth noting:

- **Pain type** is logged and never read by anything. A breakdown of which
  descriptor dominates over time, or which type precedes flares, has no widget.
- **Days since last flare** exists in the domain layer with tests, but nothing
  displays it — an obvious stat tile.
- **Activity tags** only appear as text in Flare review. Nothing compares pain or
  load across tag (gym days vs rest days vs hiking days).
- **EWMA has no stat tile**, while ACWR has two. The tiles are ACWR-only.
- **Exercise-level detail** is collapsed into physio load and hold volume
  everywhere. No widget shows one named exercise's own progression.
- **Sleep** never enters the workload model, though it's a recognised recovery
  input.
