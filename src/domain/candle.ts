// A pain "candle" for one day, OHLC-style: Open = morning pain, High/Low = the day's
// highest/lowest reading, Close = night pain.
import type { DomainDay } from "./types";
import { dailyPainPeak, dailyPainMin } from "./aggregate";

export type PainCandle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type PainCandleTrend = "improved" | "worsened" | "unchanged";

// Only days with both a morning AND a night reading become a candle (high/low then
// guaranteed non-null too, since they're the max/min of the same three readings).
export function dailyPainCandles(days: DomainDay[]): PainCandle[] {
  return days
    .filter(
      (d): d is DomainDay & { painMorning: number; painNight: number } =>
        d.painMorning != null && d.painNight != null,
    )
    .map((d) => ({
      date: d.date,
      open: d.painMorning,
      high: dailyPainPeak(d)!,
      low: dailyPainMin(d)!,
      close: d.painNight,
    }));
}

// Lower pain is always the improvement here (unlike steps/sleep, where "up" is good).
export function painCandleTrend(
  candle: Pick<PainCandle, "open" | "close">,
): PainCandleTrend {
  if (candle.close < candle.open) return "improved";
  if (candle.close > candle.open) return "worsened";
  return "unchanged";
}
