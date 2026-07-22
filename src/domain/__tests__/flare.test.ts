// Tests for flare detection and date arithmetic.
import { describe, expect, it } from "vitest";
import { daysBetween, daysSinceLastFlare, flareEpisodes, isFlareDay } from "../flare";
import type { DomainDay } from "../types";

// Minimal day builder for tests.
function day(date: string, pains: [number | null, number | null, number | null]): DomainDay {
  return {
    date,
    steps: null,
    painMorning: pains[0],
    painDaytime: pains[1],
    painNight: pains[2],
    sleepHours: null,
    exercises: [],
  };
}

describe("isFlareDay", () => {
  it("flags any reading at or above 3", () => {
    expect(isFlareDay(day("2026-07-01", [1, 3, 0]))).toBe(true);
    expect(isFlareDay(day("2026-07-01", [4.5, null, null]))).toBe(true);
  });
  it("does not flag pain below 3 or unrecorded days", () => {
    expect(isFlareDay(day("2026-07-01", [2.5, 2.5, 2.5]))).toBe(false);
    expect(isFlareDay(day("2026-07-01", [null, null, null]))).toBe(false);
  });
});

describe("daysBetween", () => {
  it("counts whole days across month boundaries", () => {
    expect(daysBetween("2026-06-28", "2026-07-02")).toBe(4);
    expect(daysBetween("2026-07-02", "2026-07-02")).toBe(0);
  });
});

describe("flareEpisodes", () => {
  const days = [
    day("2026-07-01", [1, 1, 1]),
    day("2026-07-02", [2, 1, 1]),
    day("2026-07-04", [4, 1, 1]), // flare
    day("2026-07-05", [1, 1, 1]),
    day("2026-07-07", [3, 0, 0]), // flare
  ];
  it("returns flares newest-first with lookback context", () => {
    const episodes = flareEpisodes(days, 3);
    expect(episodes.map((e) => e.day.date)).toEqual(["2026-07-07", "2026-07-04"]);
    // 07-07 looks back to 07-04..07-06: logged days are 07-04 and 07-05
    expect(episodes[0].precedingDays.map((d) => d.date)).toEqual(["2026-07-04", "2026-07-05"]);
    // 07-04 looks back to 07-01..07-03: logged days are 07-01 and 07-02
    expect(episodes[1].precedingDays.map((d) => d.date)).toEqual(["2026-07-01", "2026-07-02"]);
  });
});

describe("daysSinceLastFlare", () => {
  const days = [
    day("2026-07-01", [4, 1, 1]), // flare
    day("2026-07-02", [1, 1, 1]),
    day("2026-07-04", [3, 0, 0]), // flare (most recent)
    day("2026-07-05", [2, 2, 2]),
  ];
  it("measures from the most recent flare", () => {
    expect(daysSinceLastFlare(days, "2026-07-10")).toBe(6);
  });
  it("returns 0 when today flared", () => {
    expect(daysSinceLastFlare(days, "2026-07-04")).toBe(0);
  });
  it("returns null when no flare exists", () => {
    expect(daysSinceLastFlare([day("2026-07-01", [1, 1, 1])], "2026-07-10")).toBeNull();
  });
});
