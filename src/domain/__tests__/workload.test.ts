import { describe, expect, it } from "vitest";
import {
  latestRatio,
  workloadRatios,
  workloadZone,
  WORKLOAD_STEADY_MAX,
  WORKLOAD_STEADY_MIN,
} from "../workload";
import type { DatedValue } from "../aggregate";

// Calendar-dense series starting 2026-01-01; `values` is one slot per day.
function series(values: (number | null)[]): DatedValue<number>[] {
  return values.map((value, i) => {
    const d = new Date(Date.UTC(2026, 0, 1 + i));
    return { date: d.toISOString().slice(0, 10), value };
  });
}

describe("workloadZone", () => {
  it("splits at the steady band's edges", () => {
    expect(workloadZone(1)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MIN)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MAX)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MAX + 0.01)).toBe("over");
    expect(workloadZone(WORKLOAD_STEADY_MIN - 0.01)).toBe("under");
  });
});

describe("workloadRatios", () => {
  it("returns 1 when load has been flat", () => {
    const ratios = workloadRatios(series(Array(40).fill(100)));
    expect(ratios[39]).toBeCloseTo(1, 10);
  });

  it("rises above 1 when recent load exceeds the baseline", () => {
    // 28 days at 100, then a week at 200.
    const ratios = workloadRatios(
      series([...Array(28).fill(100), ...Array(7).fill(200)]),
    );
    const latest = ratios[34];
    expect(latest).not.toBeNull();
    expect(latest!).toBeGreaterThan(1.3);
  });

  it("drops below 1 when recent load falls off", () => {
    const ratios = workloadRatios(
      series([...Array(28).fill(100), ...Array(7).fill(20)]),
    );
    expect(ratios[34]!).toBeLessThan(0.8);
  });

  it("is null until the chronic window has enough logged days", () => {
    const ratios = workloadRatios(series(Array(40).fill(100)));
    // 14 logged days required, so the first ratio lands on the 14th slot.
    expect(ratios[12]).toBeNull();
    expect(ratios[13]).not.toBeNull();
  });

  it("is null when too few days were logged to be meaningful", () => {
    // Dense calendar, but only 5 days actually recorded.
    const sparse = Array(40).fill(null);
    for (let i = 0; i < 5; i++) sparse[i * 2] = 100;
    expect(workloadRatios(series(sparse)).every((r) => r === null)).toBe(true);
  });

  it("skips unlogged days rather than counting them as zero load", () => {
    // Every other day logged at 100: the mean is 100, not 50, so a steady
    // routine recorded intermittently still reads as steady.
    const gappy = Array(40)
      .fill(null)
      .map((_, i) => (i % 2 === 0 ? 100 : null));
    expect(workloadRatios(series(gappy))[39]).toBeCloseTo(1, 10);
  });

  it("returns null rather than NaN when nothing has been done at all", () => {
    // The acute window sits inside the chronic one, so a zero baseline means
    // zero recent load too — 0/0, not a spike.
    expect(workloadRatios(series(Array(40).fill(0)))[39]).toBeNull();
  });

  it("reports a restart after a long layoff as a large spike", () => {
    // Four weeks of logged rest then a week of real sessions: the baseline is
    // near zero, so the ratio is genuinely huge — which is the point.
    const ratios = workloadRatios(
      series([...Array(28).fill(0), ...Array(7).fill(50)]),
    );
    expect(ratios[34]!).toBeGreaterThan(WORKLOAD_STEADY_MAX);
  });
});

describe("latestRatio", () => {
  it("takes the most recent non-null value", () => {
    expect(latestRatio([1, 2, null, 3, null])).toBe(3);
    expect(latestRatio([null, null])).toBeNull();
    expect(latestRatio([])).toBeNull();
  });
});
