// Tests for lagged series helpers.
import { describe, expect, it } from "vitest";
import { addDays, nextMorningPain } from "../lag";
import type { DomainDay } from "../types";

function day(date: string, painMorning: number | null): DomainDay {
  return {
    date,
    steps: null,
    painMorning,
    painDaytime: null,
    painNight: null,
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
