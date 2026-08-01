// A pain "candle" for one day, in the same OHLC terms as a stock
// candlestick: Open = morning pain, High/Low = the day's highest/lowest
// reading, Close = night pain (the last reading before bed) — visualizing
// how pain actually moved across the day, not just where it started and
// ended.
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

// Only days with both a morning AND a night reading become a candle — a
// body needs both ends, and a high/low without one is a guess, not data.
// High/low are then guaranteed non-null too: they're the max/min of the
// same three readings that already include those two.
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

// Lower pain is always the improvement here (unlike steps/sleep, where
// "up" is good) — night pain below morning pain means the day got better;
// above means it got worse.
export function painCandleTrend(
  candle: Pick<PainCandle, "open" | "close">,
): PainCandleTrend {
  if (candle.close < candle.open) return "improved";
  if (candle.close > candle.open) return "worsened";
  return "unchanged";
}
