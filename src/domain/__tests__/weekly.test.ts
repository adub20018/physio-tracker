// Tests for weekly grouping and summaries.
import { describe, expect, it } from "vitest";
import { weeklyReport, weekStartOf } from "../weekly";
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

describe("weekStartOf", () => {
  it("returns the Monday of the containing week", () => {
    expect(weekStartOf("2026-07-15")).toBe("2026-07-13"); // Wed → Mon
    expect(weekStartOf("2026-07-13")).toBe("2026-07-13"); // Mon → itself
    expect(weekStartOf("2026-07-19")).toBe("2026-07-13"); // Sun → prior Mon
  });
});

describe("weeklyReport", () => {
  it("groups days into Monday-started weeks with stats", () => {
    const days = [
      day("2026-07-10", { painMorning: 4, steps: 1000 }), // week of 07-06, flare
      day("2026-07-13", { painMorning: 1, steps: 2000 }), // week of 07-13
      day("2026-07-15", { painMorning: 2, steps: 3000 }), // week of 07-13
    ];
    const report = weeklyReport(days);
    expect(report.map((w) => w.weekStart)).toEqual(["2026-07-06", "2026-07-13"]);
    expect(report[0].flareDays).toBe(1);
    expect(report[0].weekEnd).toBe("2026-07-12");
    expect(report[1].loggedDays).toBe(2);
    expect(report[1].painAvg).toBe(1.5);
    expect(report[1].stepsAvg).toBe(2500);
    expect(report[1].flareDays).toBe(0);
  });
});
