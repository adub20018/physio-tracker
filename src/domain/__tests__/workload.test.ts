import { describe, expect, it } from "vitest";
import {
  latestRatio,
  workloadSeries,
  workloadZone,
  WORKLOAD_DANGER_MIN,
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

const ratiosOf = (values: (number | null)[]) => workloadSeries(series(values)).ratio;

describe("workloadZone", () => {
  it("splits at each band edge", () => {
    expect(workloadZone(1)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MIN)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MAX)).toBe("steady");
    expect(workloadZone(WORKLOAD_STEADY_MIN - 0.01)).toBe("under");
    expect(workloadZone(WORKLOAD_STEADY_MAX + 0.01)).toBe("caution");
    expect(workloadZone(WORKLOAD_DANGER_MIN)).toBe("caution");
    expect(workloadZone(WORKLOAD_DANGER_MIN + 0.01)).toBe("danger");
  });
});

describe("workloadSeries ratio", () => {
  it("returns 1 when load has been flat", () => {
    expect(ratiosOf(Array(40).fill(100))[39]).toBeCloseTo(1, 10);
  });

  it("rises above 1 when recent load exceeds the baseline", () => {
    const ratios = ratiosOf([...Array(28).fill(100), ...Array(7).fill(200)]);
    expect(ratios[34]!).toBeGreaterThan(WORKLOAD_STEADY_MAX);
  });

  it("drops below 1 when recent load falls off", () => {
    const ratios = ratiosOf([...Array(28).fill(100), ...Array(7).fill(20)]);
    expect(ratios[34]!).toBeLessThan(WORKLOAD_STEADY_MIN);
  });

  it("is null until the chronic window has enough logged days", () => {
    const ratios = ratiosOf(Array(40).fill(100));
    // 14 logged days required, so the first ratio lands on the 14th slot.
    expect(ratios[12]).toBeNull();
    expect(ratios[13]).not.toBeNull();
  });

  it("is null when too few days were logged to be meaningful", () => {
    const sparse: (number | null)[] = Array(40).fill(null);
    for (let i = 0; i < 5; i++) sparse[i * 2] = 100;
    expect(ratiosOf(sparse).every((r) => r === null)).toBe(true);
  });

  it("skips unlogged days rather than counting them as zero load", () => {
    // Every other day logged at 100: the mean is 100, not 50, so a steady
    // routine recorded intermittently still reads as steady.
    const gappy = Array(40)
      .fill(null)
      .map((_, i) => (i % 2 === 0 ? 100 : null));
    expect(ratiosOf(gappy)[39]).toBeCloseTo(1, 10);
  });

  it("returns null rather than NaN when nothing has been done at all", () => {
    // The acute window sits inside the chronic one, so a zero baseline means
    // zero recent load too — 0/0, not a spike.
    expect(ratiosOf(Array(40).fill(0))[39]).toBeNull();
  });

  it("reports a restart after a long layoff as a large spike", () => {
    const ratios = ratiosOf([...Array(28).fill(0), ...Array(7).fill(50)]);
    expect(ratios[34]!).toBeGreaterThan(WORKLOAD_DANGER_MIN);
  });
});

describe("workloadSeries dayRatio", () => {
  it("is 1 on a day matching the baseline", () => {
    expect(workloadSeries(series(Array(40).fill(100))).dayRatio[39]).toBeCloseTo(1, 10);
  });

  it("shows a single hard day the rolling ratio flattens", () => {
    // One 400 day against a 100 baseline: the day reads 4x, while the 7-day
    // ratio barely moves — which is the whole reason for showing both.
    const values = Array(40).fill(100);
    values[39] = 400;
    const { ratio, dayRatio } = workloadSeries(series(values));
    // The 28-day baseline spans slots 12–39, so it includes the spike itself.
    const chronicMean = (27 * 100 + 400) / 28;
    expect(dayRatio[39]!).toBeCloseTo(400 / chronicMean, 10);
    expect(dayRatio[39]!).toBeGreaterThan(3);
    expect(ratio[39]!).toBeLessThan(1.5);
  });

  it("is null on unlogged days", () => {
    const values: (number | null)[] = Array(40).fill(100);
    values[39] = null;
    expect(workloadSeries(series(values)).dayRatio[39]).toBeNull();
  });
});

describe("latestRatio", () => {
  it("takes the most recent non-null value", () => {
    expect(latestRatio([1, 2, null, 3, null])).toBe(3);
    expect(latestRatio([null, null])).toBeNull();
    expect(latestRatio([])).toBeNull();
  });
});
