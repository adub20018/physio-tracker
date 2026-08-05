// Tests for buildChartDataBundle — mostly wiring checks (the domain
// functions it calls have their own dedicated test files) confirming each bundle slice carries through.
import { describe, expect, it } from "vitest";
import { buildChartDataBundle } from "../dashboard-bundle";
import type { DomainDay } from "../types";

function day(date: string, overrides: Partial<DomainDay> = {}): DomainDay {
  return {
    date,
    steps: null,
    painMorning: null,
    painDaytime: null,
    painNight: null,
    sleepHours: null,
    exercises: [],
    ...overrides,
  };
}

describe("buildChartDataBundle", () => {
  it("computes stat-tile current/previous windows and the flare gap", () => {
    const days = [
      day("2026-07-06", { painMorning: 2, steps: 1000 }), // previous week
      day("2026-07-07", { painMorning: 4, steps: 3000 }), // previous week
      day("2026-07-13", { painMorning: 1, steps: 2000 }), // current week
      day("2026-07-14", { painMorning: 6, steps: 1000 }), // current week, flare
    ];
    const bundle = buildChartDataBundle(days, "2026-07-15", 3);

    expect(bundle.statCurrent.painAvg).toBe(3.5); // mean of 1 and 6
    expect(bundle.statPrevious.painAvg).toBe(3); // mean of 2 and 4
    expect(bundle.flareGap).toBe(1); // flare on 07-14, today is 07-15
  });

  it("is null flareGap when nothing ever crossed the threshold", () => {
    const days = [day("2026-07-01", { painMorning: 1 })];
    const bundle = buildChartDataBundle(days, "2026-07-02", 3);
    expect(bundle.flareGap).toBeNull();
  });

  it("fills sparklines for every day in the trailing window with formatted display text", () => {
    // Window ends the day before `today` (excluded so a partial day can't
    // bias the average) — so for today = 07-14, the last window day is 07-13.
    const days = [day("2026-07-13", { steps: 5000 })];
    const bundle = buildChartDataBundle(days, "2026-07-14", 3);
    const last = bundle.stepsSparkline[bundle.stepsSparkline.length - 1];
    expect(last).toEqual({
      date: "2026-07-13",
      value: 5000,
      display: "5,000 steps",
    });
    expect(bundle.stepsSparkline).toHaveLength(7); // STAT_WINDOW_DAYS
    expect(bundle.stepsSparkline[0].display).toBe("Not logged");
  });

  it("marks flare days on the pain timeline at the day's worst reading", () => {
    const days = [
      day("2026-07-01", { painMorning: 1, painDaytime: 4, painNight: 2 }),
    ];
    const bundle = buildChartDataBundle(days, "2026-07-01", 3);
    expect(bundle.fullTimeline[0].flareValue).toBe(4);
  });

  it("does not flag a flare when every reading stays under threshold", () => {
    const days = [day("2026-07-01", { painMorning: 1, painNight: 2 })];
    const bundle = buildChartDataBundle(days, "2026-07-01", 3);
    expect(bundle.fullTimeline[0].flareValue).toBeNull();
  });

  it("lags load-vs-symptoms to the following day's pain", () => {
    const days = [
      day("2026-07-01", { steps: 8000 }),
      day("2026-07-02", { painMorning: 5 }),
    ];
    const bundle = buildChartDataBundle(days, "2026-07-02", 3);
    expect(bundle.fullLoad[0].steps).toBe(8000);
    expect(bundle.fullLoad[0].nextMorningPain).toBe(5);
  });

  it("builds the heatmap across the full calendar range, unlogged days included", () => {
    const days = [
      day("2026-07-01", { painMorning: 2 }),
      day("2026-07-03", { painMorning: 4 }),
    ];
    const bundle = buildChartDataBundle(days, "2026-07-03", 3);
    expect(bundle.heatmap.map((h) => h.date)).toEqual([
      "2026-07-01",
      "2026-07-02",
      "2026-07-03",
    ]);
    expect(bundle.heatmap[1].avgPain).toBeNull(); // 07-02 wasn't logged
  });

  it("pairs steps against next-morning, peak, and average next-day pain", () => {
    const days = [
      day("2026-07-01", { steps: 8000 }),
      day("2026-07-02", { painMorning: 2, painDaytime: 6, painNight: 4 }),
    ];
    const bundle = buildChartDataBundle(days, "2026-07-02", 3);
    expect(bundle.fullStepsPoints).toEqual([
      { x: 8000, y: 2, label: "2026-07-01 → next morning", date: "2026-07-01" },
    ]);
    expect(bundle.fullStepsVsPeakPoints[0].y).toBe(6);
    expect(bundle.fullStepsVsAveragePoints[0].y).toBe(4); // (2+6+4)/3
  });

  it("builds the pain candlestick and same-day sleep-vs-pain series", () => {
    const days = [
      day("2026-07-01", {
        painMorning: 5,
        painDaytime: 7,
        painNight: 2,
        sleepHours: 6,
      }),
    ];
    const bundle = buildChartDataBundle(days, "2026-07-01", 3);
    expect(bundle.fullPainCandles).toEqual([
      { date: "2026-07-01", open: 5, high: 7, low: 2, close: 2 },
    ]);
    expect(bundle.fullSleepVsMorning).toEqual([
      { x: 6, y: 5, label: "2026-07-01", date: "2026-07-01" },
    ]);
  });

  it("returns empty series for an empty history without throwing", () => {
    const bundle = buildChartDataBundle([], "2026-07-01", 3);
    expect(bundle.fullTimeline).toEqual([]);
    expect(bundle.heatmap).toEqual([]);
    expect(bundle.fullStepsPoints).toEqual([]);
    expect(bundle.statCurrent.painAvg).toBeNull();
  });
});
