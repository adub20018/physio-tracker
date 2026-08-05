// Fabricated data for the Add-widget picker's live previews (60 days of steps/pain/sleep/exercises,
// run through the same buildChartDataBundle real dashboards use), built from sine waves so it's deterministic.
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

// Builds the 60-day fake history: a slow recovery trend plus periodic flare spikes and rest
// days, so charts needing variation (candlestick, scatters) have something to show.
function buildMockDays(): DomainDay[] {
  const days: DomainDay[] = [];

  for (let i = 0; i < MOCK_DAY_COUNT; i++) {
    const date = addDays(MOCK_START_DATE, i);
    const recovery = i / MOCK_DAY_COUNT; // 0 → 1 across the whole window
    const isFlareDay = i % 17 === 8;
    const isRestDay = i % 4 === 3;

    // 2.8 → 0.8: stays under the flare threshold (3) past the first couple
    // weeks, so flare days read as real exceptions against a calm baseline.
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

    // Correlated with pain so the sleep-vs-pain preview shows a relationship.
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
export const MOCK_TODAY = addDays(MOCK_START_DATE, MOCK_DAY_COUNT - 1);

// Computed once at module load — buildChartDataBundle is pure and MOCK_DAYS
// never changes, so there's nothing to recompute on render.
export const MOCK_CHART_DATA_BUNDLE = buildChartDataBundle(
  MOCK_DAYS,
  MOCK_TODAY,
  DEFAULT_FLARE_PAIN_THRESHOLD,
);

// Trial flag: whether preview thumbnails show each chart's legend, independent of `compact`'s
// other behavior (Y-axis tick density, animation) — flip alone to compare with/without.
const PREVIEW_HIDE_LEGENDS = false;

// Render context for a preview thumbnail: full history, not editable, compact (drops Y-axis
// ticks/animation/r-value captions — no room at thumbnail size). `today` is a param since mock/real previews share this.
export function previewRenderContext(
  widgetType: string,
  today: string,
): WidgetRenderContext {
  return {
    widgetId: `preview-${widgetType}`,
    today,
    rangeDays: Infinity,
    autoScaleYAxis: false,
    fillHeight: true,
    compact: true,
    hideLegend: PREVIEW_HIDE_LEGENDS,
  };
}
