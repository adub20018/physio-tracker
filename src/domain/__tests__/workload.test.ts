import { describe, expect, it } from "vitest";
import {
  latestRatio,
  workloadSeries,
  workloadZone,
  zoneBoundsFor,
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

describe("workloadSeries acute and chronic", () => {
  it("reports both means in the original units", () => {
    const { acute, chronic } = workloadSeries(series(Array(40).fill(100)));
    expect(acute[39]).toBeCloseTo(100, 10);
    expect(chronic[39]).toBeCloseTo(100, 10);
  });

  it("moves the acute mean ahead of the baseline after a step up", () => {
    const { acute, chronic } = workloadSeries(
      series([...Array(28).fill(100), ...Array(7).fill(200)]),
    );
    expect(acute[34]!).toBeGreaterThan(chronic[34]!);
  });

  it("nulls the baseline when it would be zero", () => {
    expect(workloadSeries(series(Array(40).fill(0))).chronic[39]).toBeNull();
  });
});

describe("zoneBoundsFor", () => {
  it("scales the ratio thresholds into the metric's own units", () => {
    const bounds = zoneBoundsFor(2000)!;
    expect(bounds.steadyMin).toBeCloseTo(1600, 10);
    expect(bounds.steadyMax).toBeCloseTo(2600, 10);
    expect(bounds.dangerMin).toBeCloseTo(3000, 10);
  });

  it("round-trips against workloadZone", () => {
    // A 7-day average sitting exactly on the steady ceiling is still steady.
    const baseline = 1900;
    const { steadyMax } = zoneBoundsFor(baseline)!;
    expect(workloadZone(steadyMax / baseline)).toBe("steady");
  });

  it("returns null without a baseline", () => {
    expect(zoneBoundsFor(null)).toBeNull();
  });
});

describe("latestRatio", () => {
  it("takes the most recent non-null value", () => {
    expect(latestRatio([1, 2, null, 3, null])).toBe(3);
    expect(latestRatio([null, null])).toBeNull();
    expect(latestRatio([])).toBeNull();
  });
});
