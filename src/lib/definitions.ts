// Reference copy for /definitions — what every value in the app means, how it gets
// there, and (where derived) the arithmetic behind it.
//
// Thresholds and window lengths are imported rather than retyped: the page must not be
// able to claim a number the code doesn't actually use.
import { PAIN_TYPES, ACTIVITY_TAGS } from "@/db/schema";
import {
  DEFAULT_FLARE_PAIN_THRESHOLD,
  PAIN_SCALE_MAX,
  PAIN_SCALE_MIN,
  PAIN_SCALE_STEP,
} from "@/domain/constants";
import {
  ACUTE_WINDOW_DAYS,
  CHRONIC_WINDOW_DAYS,
  smoothingFactor,
  WORKLOAD_DANGER_MIN,
  WORKLOAD_STEADY_MAX,
  WORKLOAD_STEADY_MIN,
} from "@/domain/workload";

export type VariableDefinition = {
  // Anchor target — tooltips deep-link to /definitions#<id>, so renaming one breaks
  // those links. Check DEFINITION_IDS' usages before changing.
  id: string;
  name: string;
  // "logged" is typed in by hand; "derived" is computed from logged values.
  kind: "logged" | "derived";
  summary: string;
  // Where the number comes from — the form field, or the inputs it's built from.
  collection: string;
  // Derived values only: the arithmetic, in words rather than code.
  formula?: string;
  // Derived values only: what it tells you that the raw inputs don't.
  meaning?: string;
  unit?: string;
  range?: string;
  notes?: string[];
};

export type DefinitionGroup = {
  id: string;
  title: string;
  blurb: string;
  variables: VariableDefinition[];
};

const painScale = `${PAIN_SCALE_MIN}–${PAIN_SCALE_MAX} in steps of ${PAIN_SCALE_STEP}`;

// Rounded for reading; the code uses the exact fractions.
const SMOOTHING_ACUTE = smoothingFactor(ACUTE_WINDOW_DAYS).toFixed(2);
const SMOOTHING_CHRONIC = smoothingFactor(CHRONIC_WINDOW_DAYS).toFixed(3);

export const DEFINITION_GROUPS: DefinitionGroup[] = [
  {
    id: "logged-daily",
    title: "Logged each day",
    blurb:
      "Typed in on the Log page. Every field is optional — a day with only a step count is still a logged day, and the derived values below simply skip what isn't there.",
    variables: [
      {
        id: "date",
        name: "Date",
        kind: "logged",
        summary: "The calendar day an entry belongs to.",
        collection:
          "Defaults to today on the Log page; past days can be picked and edited. One entry per date.",
        notes: [
          "Stored as a plain calendar date, so entries don't shift when you travel between timezones.",
        ],
      },
      {
        id: "steps",
        name: "Steps",
        kind: "logged",
        summary: "Total steps walked that day.",
        collection:
          "Read off your phone or watch and typed into the Log page's Activity section.",
        unit: "steps",
        range: "0–200,000",
        notes: [
          "This is the app's stand-in for general daily walking load — it isn't split by walk, and it doesn't include gym or physio work.",
        ],
      },
      {
        id: "pain-readings",
        name: "Pain readings (morning, daytime, night)",
        kind: "logged",
        summary: "How much it hurt, rated three times across the day.",
        collection:
          "Three separate sliders on the Log page's Pain section. Each is independent — record one, two, or all three.",
        unit: `${painScale}`,
        notes: [
          "Morning pain is the reading physios usually treat as the irritability signal for tendon problems, since overnight rest resets it.",
          "A missing reading means 'not recorded', never zero — derived values skip it rather than counting it as painless.",
        ],
      },
      {
        id: "sleep-hours",
        name: "Sleep hours",
        kind: "logged",
        summary: "Hours slept the night before that day.",
        collection: "Typed into the Log page's Activity section.",
        unit: "hours",
        range: "0–24",
        notes: [
          "Logged against the day you woke up, so it precedes all three of that day's pain readings — which is why sleep is compared same-day rather than lagged.",
        ],
      },
      {
        id: "pain-types",
        name: "Pain type",
        kind: "logged",
        summary: "The character of the pain, as tags.",
        collection: `Tapped from suggested chips (${PAIN_TYPES.join(", ")}) on the Log page's Pain section; custom tags are allowed.`,
        notes: ["Descriptive only — no derived value reads these."],
      },
      {
        id: "activity-tags",
        name: "Activity tags",
        kind: "logged",
        summary: "What kind of activity the day involved.",
        collection: `Tapped from suggested chips (${ACTIVITY_TAGS.join(", ")}) on the Log page; custom tags are allowed. A spreadsheet import fills these in by keyword from the Activity Notes column.`,
        notes: [
          "Descriptive only. Physio load is calculated from logged exercises, not from the presence of a 'physio' tag.",
        ],
      },
      {
        id: "general-notes",
        name: "Notes",
        kind: "logged",
        summary: "Free text about the day.",
        collection: "Typed into the Log page's Notes section.",
        notes: [
          "Shown alongside flare days in Flare review, which is where context like 'new shoes' or 'long drive' earns its keep.",
        ],
      },
    ],
  },
  {
    id: "physio-entries",
    title: "Physio exercises",
    blurb:
      "Logged per exercise, so one day can hold several. These fields are the raw inputs behind physio load.",
    variables: [
      {
        id: "exercise-entry",
        name: "Exercise, sets, and reps or hold time",
        kind: "logged",
        summary: "One exercise as performed: its name, how many sets, and how long or how many.",
        collection:
          "Entered per exercise on the Log page's Physio section. Each set group records a count and a duration in seconds or a number of reps.",
        notes: [
          "Mixed set groups on one exercise (say 3×20s plus 1×30s) are stored as separate entries so the detail survives.",
          "Exercise names are normalised to one casing, so 'calf raise' and 'Calf Raise' don't become two different exercises.",
        ],
      },
      {
        id: "intensity",
        name: "Intensity range",
        kind: "logged",
        summary: "How loaded the exercise was, as a percentage range.",
        collection:
          "Entered as a minimum and maximum percentage on the Log page's Physio section — a range because prescriptions often give one (e.g. 20–25%).",
        unit: "%",
        notes: [
          "Optional. When it's missing, physio load treats the exercise as unweighted rather than dropping it.",
        ],
      },
    ],
  },
  {
    id: "derived-pain",
    title: "Derived — pain",
    blurb:
      "Calculated from the pain readings above. Nothing here is entered by hand.",
    variables: [
      {
        id: "daily-pain-average",
        name: "Daily pain average",
        kind: "derived",
        summary: "One number for how the whole day felt.",
        collection: "Computed from that day's recorded pain readings.",
        formula: "mean of the recorded morning, daytime and night readings",
        meaning:
          "Flattens the swing within a day so days can be compared to each other. It's what the calendar colours and the weekly averages use.",
        notes: [
          "Readings you didn't record are skipped, not counted as zero — a day with only a night reading averages to that reading.",
        ],
      },
      {
        id: "daily-pain-peak",
        name: "Daily pain peak",
        kind: "derived",
        summary: "The worst the day got.",
        collection: "Computed from that day's recorded pain readings.",
        formula: "highest of the recorded morning, daytime and night readings",
        meaning:
          "An average can hide a bad afternoon between two fine readings. The peak answers 'how bad did it actually get', which is the question that matters when judging whether a given day's activity was too much.",
      },
      {
        id: "pain-rolling-average",
        name: "7-day pain trend",
        kind: "derived",
        summary: "The smoothed line through day-to-day pain noise.",
        collection: "Computed across the daily pain averages.",
        formula: `mean of the last ${ACUTE_WINDOW_DAYS} days' pain averages, recomputed each day`,
        meaning:
          "Day-to-day pain bounces enough that two consecutive readings tell you almost nothing about direction. The trend is what answers 'am I actually getting better', which single days can't.",
        notes: [
          "Trailing, not centred — each point uses that day and the six before it, so it never uses future data.",
        ],
      },
      {
        id: "flare-day",
        name: "Flare day",
        kind: "derived",
        summary: "A day bad enough to count as a flare-up.",
        collection: "Tested against every recorded reading for the day.",
        formula: `any single reading at or above your flare threshold (default ${DEFAULT_FLARE_PAIN_THRESHOLD}/${PAIN_SCALE_MAX})`,
        meaning:
          "Turns a continuous scale into a countable event, so flares can be counted per week and reviewed alongside what preceded them.",
        notes: [
          "Any one reading is enough — a day that spikes at night still counts, even if the average looks fine.",
          "The threshold is yours to set, in Account → Preferences.",
        ],
      },
      {
        id: "days-since-flare",
        name: "Days since last flare",
        kind: "derived",
        summary: "How long you've gone without one.",
        collection: "Measured from the most recent flare day to today.",
        formula: "calendar days between the latest flare day and today",
        meaning:
          "A streak is easier to read than a chart when the question is simply 'how's it going lately', and it keeps improving on quiet days without needing new data.",
        notes: ["0 means today flared. Blank means no flare has ever been logged."],
      },
    ],
  },
  {
    id: "derived-load",
    title: "Derived — load",
    blurb:
      "How much work you did, and how that compares to what your body is used to.",
    variables: [
      {
        id: "physio-load",
        name: "Physio load",
        kind: "derived",
        summary: "One number for how much rehab work a day contained.",
        collection: "Computed from every exercise entry logged that day.",
        formula:
          "per exercise: sets × (hold seconds or reps) × mean intensity — where mean intensity is the midpoint of the intensity range as a fraction (25–35% → 0.30). Summed across the day's exercises.",
        meaning:
          "Sets, hold time and intensity all move independently — you can do fewer, longer, harder sets and be doing more work overall. Collapsing them into one number is what lets rehab work be charted against symptoms and compared week to week.",
        notes: [
          "With no intensity recorded, the multiplier is 1 — the entry counts as raw sets × time rather than being dropped.",
          "The number has no unit and isn't comparable to anyone else's. Only its movement relative to your own history means anything.",
          "A logged rest day is a genuine 0. A day you didn't log is unknown, and derived values skip it.",
        ],
      },
      {
        id: "hold-volume",
        name: "Hold volume",
        kind: "derived",
        summary: "Time under load, ignoring how hard it was.",
        collection: "Computed from every exercise entry logged that day.",
        formula: "sum of sets × (hold seconds or reps), with no intensity weighting",
        meaning:
          "Shown next to physio load because the two can move in opposite directions: longer holds at a lower percentage raise volume while lowering load. Seeing both makes it clear which lever the programme actually moved.",
      },
      {
        id: "acute-load",
        name: "Acute load",
        kind: "derived",
        summary: "What you've been doing lately.",
        collection: "A rolling average over the most recent days.",
        formula: `mean daily value over the last ${ACUTE_WINDOW_DAYS} days`,
        meaning:
          "The numerator of the workload ratio. On its own it's the recent-work figure the ratio compares against your baseline.",
        notes: [
          `Needs at least 3 logged days in the window; below that it stays blank rather than reporting an average built from almost nothing.`,
        ],
      },
      {
        id: "chronic-load",
        name: "Chronic load (baseline)",
        kind: "derived",
        summary: "What your body is currently adapted to.",
        collection: "A rolling average over a longer window.",
        formula: `mean daily value over the last ${CHRONIC_WINDOW_DAYS} days`,
        meaning:
          "Your moving normal. It's the reference every workload comparison is made against, and it rises as you train more — which is why the safe range moves with you rather than being a fixed target.",
        notes: [
          `Needs at least 14 logged days in the window, so a single session can't define a four-week baseline.`,
          "Unlogged days are skipped rather than counted as zero, so gaps in logging don't fake a drop in your baseline.",
        ],
      },
      {
        id: "acwr",
        name: "Workload ratio (ACWR)",
        kind: "derived",
        summary: "Recent work measured against what you're used to.",
        collection: "Computed for physio load and for steps, separately.",
        formula: `acute load ÷ chronic load — the ${ACUTE_WINDOW_DAYS}-day mean divided by the ${CHRONIC_WINDOW_DAYS}-day mean`,
        meaning:
          "A raw load of 450 is meaningless without knowing your normal. The ratio answers 'is this a lot for me, right now': 1.00× is training exactly at your baseline, 1.50× is half again more than your body has adapted to. It's the one number that flags a spike while it's happening rather than after the flare.",
        notes: [
          "Known in sports science as the acute:chronic workload ratio, if you want to read further.",
          "It bounds your weekly average, not any single day — one hard session is fine if the week's average stays in range.",
          "Blank until there's enough logged history, and blank rather than infinite when the baseline is zero.",
          "The bands it's read against are conventions, not facts — see Workload zones below.",
          "Both means here are flat: every day in the window counts the same, and drops out entirely once it falls off the end. The EWMA version below fades them instead.",
        ],
      },
      {
        id: "ewma-acwr",
        name: "Workload ratio, EWMA version",
        kind: "derived",
        summary: "The same ratio, with recent days counting for more than old ones.",
        collection:
          "Computed for physio load and for steps, separately, from the same logged days.",
        formula: `each day's average = today's value × λ + yesterday's average × (1 − λ), where λ = 2 ÷ (window + 1) — so ${SMOOTHING_ACUTE} for the ${ACUTE_WINDOW_DAYS}-day average and ${SMOOTHING_CHRONIC} for the ${CHRONIC_WINDOW_DAYS}-day one. The ratio is then acute ÷ chronic, exactly as above.`,
        meaning:
          "A flat 28-day baseline counts a session from four weeks ago exactly as much as yesterday's, and drops it entirely on day 29. That makes it slow to notice a fortnight of harder work — your baseline reads lower than what you're actually adapted to, so the ratio overstates a ramp. Weighting the recent days more heavily tracks that adaptation as it happens, and the older days fade out gradually instead of falling off a cliff.",
        notes: [
          "Read against the same zones as the flat version — they aren't recalibrated for it.",
          "The two ratios usually agree. When they disagree, the EWMA is the one reacting to something recent, which is worth a look rather than an alarm.",
          "Needs the same warm-up before it appears, but counts logged days in total rather than within a window: an exponential average never forgets a day, so intermittent logging still builds a baseline.",
          "An unlogged day carries both averages forward untouched rather than decaying them — same reasoning as everywhere else here.",
        ],
      },
      {
        id: "workload-zones",
        name: "Workload zones",
        kind: "derived",
        summary: "The bands the workload ratio is read against.",
        collection: "Fixed cut-offs applied to the workload ratio.",
        formula: `under ${WORKLOAD_STEADY_MIN}× · steady ${WORKLOAD_STEADY_MIN}–${WORKLOAD_STEADY_MAX}× · higher risk ${WORKLOAD_STEADY_MAX}–${WORKLOAD_DANGER_MIN}× · above ${WORKLOAD_DANGER_MIN}×`,
        meaning:
          "Turns the ratio into a read at a glance. Multiplied through your baseline they also become a range in real units — if your baseline is 1,900 steps, steady is roughly 1,520–2,470 steps a day.",
        notes: [
          "These cut-offs come from team-sport research and are not golden numbers. They have never been validated for one person's rehab, so treat a reading as a prompt to look, not a verdict — and worth raising with your physio before letting them steer decisions.",
          "Below the steady band isn't automatically bad: it's what deliberate rest weeks look like.",
          "On the zone charts, the bars are that day's own total, drawn for context — a tall bar is a big day, not a dangerous one, since the range bounds the week rather than the day.",
        ],
      },
    ],
  },
  {
    id: "derived-relationships",
    title: "Derived — relationships",
    blurb: "Values that compare two things rather than describing one.",
    variables: [
      {
        id: "next-day-lag",
        name: "Next-day pairing",
        kind: "derived",
        summary: "Today's activity lined up against tomorrow's pain.",
        collection:
          "Pairs each day's steps or physio load with the following day's pain readings.",
        formula: "day N's load paired with day N+1's morning, peak, or average pain",
        meaning:
          "Tendon pain often shows up the day after the work that caused it, so comparing load against the same day's pain would miss the effect entirely. Days where either side is missing are dropped from the pair.",
      },
      {
        id: "pearson-r",
        name: "Correlation (r)",
        kind: "derived",
        summary: "How strongly two things move together.",
        collection: "Computed across every complete pair of points on a scatter chart.",
        formula:
          "Pearson correlation coefficient, from −1 (perfect opposite) through 0 (no relationship) to +1 (perfect together)",
        meaning:
          "Puts a number on what a scatter plot only suggests. Strength is labelled from the size of r regardless of sign: strong from 0.7, moderate from 0.4, weak from 0.2, negligible below.",
        notes: [
          "Correlation is not cause. Two things can move together because a third drives both — a busy week raises steps and gym work at once.",
          "Blank below three paired days, or when one side never varies.",
          "The app shows several of these on the same data. With a few dozen days, some will look moderate by chance alone, so treat a single striking number with suspicion.",
        ],
      },
      {
        id: "weekly-averages",
        name: "Weekly averages",
        kind: "derived",
        summary: "One row per calendar week.",
        collection: "Groups logged days into Monday-to-Sunday weeks.",
        formula:
          "per week: mean daily pain average, mean daily steps, total physio load, and a count of flare days",
        meaning:
          "Weeks smooth out the day-level noise more aggressively than a rolling average, which makes 'is this month better than last' answerable at a glance.",
        notes: [
          "Physio load is a weekly total, while pain and steps are averages — a week with fewer logged days shows a lower total but an unaffected average.",
          "Weeks with nothing logged don't appear at all.",
        ],
      },
    ],
  },
];

// Anchor ids referenced from tooltips, so a typo fails the build rather than silently
// linking to nothing.
export const DEFINITION_IDS = {
  steps: "steps",
  painReadings: "pain-readings",
  sleepHours: "sleep-hours",
  physioLoad: "physio-load",
  holdVolume: "hold-volume",
  acwr: "acwr",
  ewmaAcwr: "ewma-acwr",
  workloadZones: "workload-zones",
  dailyPainAverage: "daily-pain-average",
  dailyPainPeak: "daily-pain-peak",
  painRollingAverage: "pain-rolling-average",
  flareDay: "flare-day",
  daysSinceFlare: "days-since-flare",
  pearson: "pearson-r",
  nextDayLag: "next-day-lag",
  weeklyAverages: "weekly-averages",
} as const;

export function definitionHref(id: string): string {
  return `/definitions#${id}`;
}
