// Tests for the pain-candle (OHLC) domain helpers.
import { describe, expect, it } from "vitest";
import { dailyPainCandles, painCandleTrend } from "../candle";
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

describe("dailyPainCandles", () => {
  it("builds open/high/low/close from the day's three readings", () => {
    const days = [
      day("2026-07-01", { painMorning: 4, painDaytime: 7, painNight: 2 }),
    ];
    expect(dailyPainCandles(days)).toEqual([
      { date: "2026-07-01", open: 4, high: 7, low: 2, close: 2 },
    ]);
  });

  it("still resolves high/low correctly when daytime wasn't logged", () => {
    const days = [
      day("2026-07-01", { painMorning: 5, painDaytime: null, painNight: 3 }),
    ];
    expect(dailyPainCandles(days)).toEqual([
      { date: "2026-07-01", open: 5, high: 5, low: 3, close: 3 },
    ]);
  });

  it("drops days missing a morning or night reading — no candle body", () => {
    const days = [
      day("2026-07-01", { painMorning: 4, painDaytime: 5, painNight: null }),
      day("2026-07-02", { painMorning: null, painDaytime: 5, painNight: 3 }),
      day("2026-07-03", { painMorning: 4, painDaytime: 5, painNight: 3 }),
    ];
    expect(dailyPainCandles(days).map((c) => c.date)).toEqual(["2026-07-03"]);
  });
});

describe("painCandleTrend", () => {
  it("is improved when night pain is lower than morning", () => {
    expect(painCandleTrend({ open: 5, close: 2 })).toBe("improved");
  });
  it("is worsened when night pain is higher than morning", () => {
    expect(painCandleTrend({ open: 2, close: 5 })).toBe("worsened");
  });
  it("is unchanged when night pain equals morning", () => {
    expect(painCandleTrend({ open: 3, close: 3 })).toBe("unchanged");
  });
});
