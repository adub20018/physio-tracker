// Tests for lagged series helpers.
import { describe, expect, it } from "vitest";
import { addDays, nextDaytimePain, nextMorningPain, nextNightPain } from "../lag";
import type { DomainDay } from "../types";

function day(
  date: string,
  painMorning: number | null,
  painDaytime: number | null = null,
  painNight: number | null = null,
): DomainDay {
  return {
    date,
    steps: null,
    painMorning,
    painDaytime,
    painNight,
    sleepHours: null,
    exercises: [],
  };
}

describe("addDays", () => {
  it("crosses month and year boundaries", () => {
    expect(addDays("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-07-01", -1)).toBe("2026-06-30");
  });
});

describe("nextMorningPain", () => {
  it("pairs each day with the following morning's pain", () => {
    const days = [day("2026-07-01", 1), day("2026-07-02", 4), day("2026-07-03", 2)];
    expect(nextMorningPain(days)).toEqual([4, 2, null]);
  });
  it("yields null across gaps in logging", () => {
    const days = [day("2026-07-01", 1), day("2026-07-03", 5)];
    expect(nextMorningPain(days)).toEqual([null, null]);
  });
});

describe("nextDaytimePain", () => {
  it("pairs each day with the following day's daytime pain", () => {
    const days = [
      day("2026-07-01", 1, 2, 3),
      day("2026-07-02", 4, 5, 6),
      day("2026-07-03", 7, 8, 9),
    ];
    expect(nextDaytimePain(days)).toEqual([5, 8, null]);
  });
});

describe("nextNightPain", () => {
  it("pairs each day with the following day's night pain", () => {
    const days = [
      day("2026-07-01", 1, 2, 3),
      day("2026-07-02", 4, 5, 6),
      day("2026-07-03", 7, 8, 9),
    ];
    expect(nextNightPain(days)).toEqual([6, 9, null]);
  });
});
