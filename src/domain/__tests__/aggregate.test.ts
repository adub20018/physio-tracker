// Tests for daily/window aggregation stats.
import { describe, expect, it } from "vitest";
import { dailyPainAverage, filterWindow, windowComparison, windowStats } from "../aggregate";
import type { DomainDay } from "../types";

// Day builder with overridable fields.
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

describe("dailyPainAverage", () => {
  it("averages recorded readings only", () => {
    expect(dailyPainAverage({ painMorning: 2, painDaytime: null, painNight: 1 })).toBe(1.5);
  });
  it("is null when nothing was recorded", () => {
    expect(dailyPainAverage({ painMorning: null, painDaytime: null, painNight: null })).toBeNull();
  });
});

describe("filterWindow", () => {
  const days = ["2026-07-01", "2026-07-05", "2026-07-08", "2026-07-10"].map((d) => day(d));
  it("keeps days inside the trailing calendar window", () => {
    const win = filterWindow(days, "2026-07-10", 7); // 07-04 .. 07-10
    expect(win.map((d) => d.date)).toEqual(["2026-07-05", "2026-07-08", "2026-07-10"]);
  });
  it("excludes days after the end date", () => {
    const win = filterWindow(days, "2026-07-09", 7);
    expect(win.map((d) => d.date)).toEqual(["2026-07-05", "2026-07-08"]);
  });
});

describe("windowStats / windowComparison", () => {
  const days = [
    day("2026-07-06", { painMorning: 2, steps: 1000, exercises: [{ sets: 2, durationOrReps: 10, intensityMin: 50, intensityMax: 50 }] }), // vol 10
    day("2026-07-07", { painMorning: 4, steps: 3000 }),
    day("2026-07-13", { painMorning: 1, steps: 2000, exercises: [{ sets: 4, durationOrReps: 10, intensityMin: 100, intensityMax: 100 }] }), // vol 40
    day("2026-07-14", { painMorning: 2, steps: 1000 }),
  ];

  it("summarizes a window", () => {
    const stats = windowStats(days.slice(2));
    expect(stats.loggedDays).toBe(2);
    expect(stats.painAvg).toBe(1.5);
    expect(stats.stepsAvg).toBe(1500);
    expect(stats.physioVolume).toBe(40);
  });

  it("splits current vs previous week cleanly", () => {
    // Current week: 07-08..07-14; previous week: 07-01..07-07.
    const { current, previous } = windowComparison(days, "2026-07-14", 7);
    expect(current.loggedDays).toBe(2); // 07-13, 07-14
    expect(previous.loggedDays).toBe(2); // 07-06, 07-07
    expect(current.physioVolume).toBe(40);
    expect(previous.physioVolume).toBe(10);
    expect(previous.painAvg).toBe(3);
  });
});
