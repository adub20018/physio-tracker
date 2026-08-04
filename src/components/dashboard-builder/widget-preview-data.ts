// Fabricated data for the Add-widget picker's live previews. A new account
// has little or no logged history, so every widget would render its empty
// state in the picker — not useful for judging what a chart looks like.
// Instead every preview renders against this fixed, made-up "example
// account": 60 days of steps/pain/sleep/exercises with a gentle recovery
// trend, a couple of flare spikes, and rest days, run through the exact
// same buildChartDataBundle every real dashboard uses.
//
// Deterministic on purpose — hand-built from sine waves, not Math.random()
// — so the preview grid renders identically every time rather than
// reshuffling on each visit, and needs no seeded-RNG dependency.
import type { DomainDay, DomainExercise } from "@/domain/types";
import { buildChartDataBundle } from "@/domain/dashboard-bundle";
import { addDays } from "@/domain/lag";
import {
  DEFAULT_FLARE_PAIN_THRESHOLD,
  PAIN_SCALE_MIN,
  PAIN_SCALE_MAX,
  PAIN_SCALE_STEP,
} from "@/domain/constants";
import type { WidgetRenderContext } from "./widget-registry";

const MOCK_DAY_COUNT = 60;
const MOCK_START_DATE = "2024-01-01";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

// Rounds to the app's real pain step (0.5) so mock readings look like
// something a user could actually have logged.
function roundPain(value: number): number {
  const stepped = Math.round(value / PAIN_SCALE_STEP) * PAIN_SCALE_STEP;
  return clamp(stepped, PAIN_SCALE_MIN, PAIN_SCALE_MAX);
}

function wave(i: number, period: number, amplitude: number, phase = 0): number {
  return amplitude * Math.sin((i / period) * 2 * Math.PI + phase);
}

// Builds the 60-day fake history once. A slow recovery trend (pain drifts
// down, exercise intensity drifts up) plus periodic flare spikes and rest
// days, so every chart type has something to show — including the ones
// that only mean anything with variation, like the candlestick and the
// correlation scatters.
function buildMockDays(): DomainDay[] {
  const days: DomainDay[] = [];

  for (let i = 0; i < MOCK_DAY_COUNT; i++) {
    const date = addDays(MOCK_START_DATE, i);
    const recovery = i / MOCK_DAY_COUNT; // 0 → 1 across the whole window
    const isFlareDay = i % 17 === 8;
    const isRestDay = i % 4 === 3;

    // 2.8 → 0.8 across the window: mild and clearly under the flare
    // threshold (3) past the first week or two, so a flare day reads as a
    // real exception against a calm baseline. (An earlier version started
    // this at 4.5 → 1.3, which kept the +0.4 daytime offset above 3 for
    // roughly the first month — measured at 41 of 60 days flagged as
    // flares, the opposite of the intended "periodic spike" story.)
    const basePain = 2.8 - recovery * 2;
    const flareBump = isFlareDay ? 3 : 0;
    const painMorning = roundPain(basePain + wave(i, 6, 0.4) + flareBump * 0.6);
    const painDaytime = roundPain(
      basePain + 0.4 + wave(i, 6, 0.5, 1) + flareBump,
    );
    const painNight = roundPain(basePain - 0.3 + wave(i, 6, 0.4, 2) + flareBump * 0.3);

    const steps = isRestDay
      ? Math.round(clamp(2500 + wave(i, 10, 400), 1000, 4000))
      : Math.round(clamp(7500 + wave(i, 9, 1800) + recovery * 1500, 3000, 14000));

    // Worse pain days correlate with worse sleep, so the sleep-vs-pain
    // preview actually shows a relationship rather than a random scatter.
    const sleepHours = Number(
      clamp(7.4 - basePain * 0.15 + wave(i, 5, 0.5, 1), 4.5, 9).toFixed(1),
    );

    const exercises: DomainExercise[] = isRestDay
      ? []
      : [
          {
            sets: 3 + (i % 6 === 0 ? 1 : 0),
            durationOrReps: Math.round(clamp(25 + wave(i, 8, 6), 10, 45)),
            intensityMin: Math.round(clamp(35 + recovery * 25 + wave(i, 12, 5), 10, 90)),
            intensityMax: Math.round(clamp(48 + recovery * 25 + wave(i, 12, 5), 20, 100)),
          },
        ];

    days.push({
      date,
      steps,
      painMorning,
      painDaytime,
      painNight,
      sleepHours,
      exercises,
    });
  }

  return days;
}

const MOCK_DAYS = buildMockDays();
const MOCK_TODAY = addDays(MOCK_START_DATE, MOCK_DAY_COUNT - 1);

// Computed once at module load — buildChartDataBundle is pure and MOCK_DAYS
// never changes, so there's nothing to recompute on render.
export const MOCK_CHART_DATA_BUNDLE = buildChartDataBundle(
  MOCK_DAYS,
  MOCK_TODAY,
  DEFAULT_FLARE_PAIN_THRESHOLD,
);

// Trial flag: whether preview thumbnails show each chart's legend. Doesn't
// affect `compact`'s other behavior (Y-axis tick density, animation) — flip
// this on its own to compare with/without while everything else stays put.
const PREVIEW_HIDE_LEGENDS = false;

// A render context for showing `widgetType` in the preview grid: the full
// made-up history (rangeDays: Infinity, matching the "All" time-range
// preset — see lib/time-range.ts), not editable, sized to fill whatever
// box the picker puts it in. compact: true drops Y-axis ticks that don't
// fit and skips animation — the thumbnail box is too small to spare the
// room, and that detail is one click away on the real dashboard. rList
// (correlation r-value) captions are also stripped under compact, since
// that's the same "not enough room" call as the axis ticks.
export function mockRenderContext(widgetType: string): WidgetRenderContext {
  return {
    widgetId: `preview-${widgetType}`,
    today: MOCK_TODAY,
    rangeDays: Infinity,
    autoScaleYAxis: false,
    fillHeight: true,
    compact: true,
    hideLegend: PREVIEW_HIDE_LEGENDS,
  };
}
