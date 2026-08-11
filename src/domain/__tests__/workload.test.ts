import { describe, expect, it } from "vitest";
import {
  ewmaWorkloadSeries,
  latestRatio,
  smoothingFactor,
  acwrWorkloadSeries,
  workloadZone,
  zoneBoundsFor,
  ACUTE_WINDOW_DAYS,
  CHRONIC_WINDOW_DAYS,
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

const ratiosOf = (values: (number | null)[]) =>
  acwrWorkloadSeries(series(values)).ratio;
const ewmaRatiosOf = (values: (number | null)[]) =>
  ewmaWorkloadSeries(series(values)).ratio;

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

describe("acwrWorkloadSeries ratio", () => {
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

describe("acwrWorkloadSeries acute and chronic", () => {
  it("reports both means in the original units", () => {
    const { acute, chronic } = acwrWorkloadSeries(series(Array(40).fill(100)));
    expect(acute[39]).toBeCloseTo(100, 10);
    expect(chronic[39]).toBeCloseTo(100, 10);
  });

  it("moves the acute mean ahead of the baseline after a step up", () => {
    const { acute, chronic } = acwrWorkloadSeries(
      series([...Array(28).fill(100), ...Array(7).fill(200)]),
    );
    expect(acute[34]!).toBeGreaterThan(chronic[34]!);
  });

  it("nulls the baseline when it would be zero", () => {
    expect(
      acwrWorkloadSeries(series(Array(40).fill(0))).chronic[39],
    ).toBeNull();
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

describe("smoothingFactor", () => {
  it("uses the conventional 2/(N+1)", () => {
    expect(smoothingFactor(ACUTE_WINDOW_DAYS)).toBeCloseTo(0.25, 10);
    expect(smoothingFactor(CHRONIC_WINDOW_DAYS)).toBeCloseTo(2 / 29, 10);
  });
});

describe("ewmaWorkloadSeries", () => {
  it("returns 1 when load has been flat", () => {
    expect(ewmaRatiosOf(Array(60).fill(100))[59]).toBeCloseTo(1, 10);
  });

  it("applies the recursion from the first logged value", () => {
    // Seeded at 100, then 200×0.25 + 100×0.75 = 125, then 300×0.25 + 125×0.75 = 168.75.
    const { acute } = ewmaWorkloadSeries(series([100, 200, 300]));
    expect(acute[0]).toBeNull(); // below the 3-logged-day warm-up
    expect(acute[2]).toBeCloseTo(168.75, 10);
  });

  it("weights the newest day more heavily than a flat mean does", () => {
    // One spike day after a long flat run. The 7-day mean spreads it over seven
    // slots; the EWMA puts a quarter of it on the day itself.
    const spike = [...Array(40).fill(100), 300];
    const flat = acwrWorkloadSeries(series(spike)).acute[40]!;
    const ewma = ewmaWorkloadSeries(series(spike)).acute[40]!;
    expect(ewma).toBeGreaterThan(flat);
  });

  it("tracks a sustained two-week block faster than the 28-day mean", () => {
    // The motivation for having this at all: a flat 28-day baseline still counts
    // weeks 1-2 at full weight, so it lags a fortnight of harder training.
    const ramp = [...Array(28).fill(100), ...Array(14).fill(200)];
    const flat = acwrWorkloadSeries(series(ramp)).chronic[41]!;
    const ewma = ewmaWorkloadSeries(series(ramp)).chronic[41]!;
    expect(ewma).toBeGreaterThan(flat);
  });

  it("rises above the steady band when recent load exceeds the baseline", () => {
    const ratios = ewmaRatiosOf([
      ...Array(28).fill(100),
      ...Array(7).fill(200),
    ]);
    expect(ratios[34]!).toBeGreaterThan(WORKLOAD_STEADY_MAX);
  });

  it("drops below the steady band when recent load falls off", () => {
    const ratios = ewmaRatiosOf([...Array(28).fill(100), ...Array(7).fill(20)]);
    expect(ratios[34]!).toBeLessThan(WORKLOAD_STEADY_MIN);
  });

  it("is null until enough days have been logged in total", () => {
    const ratios = ewmaRatiosOf(Array(40).fill(100));
    expect(ratios[12]).toBeNull();
    expect(ratios[13]).not.toBeNull();
  });

  it("counts logged days cumulatively, not within a window", () => {
    // Twenty logged days spread over forty: a windowed rule would never see 14 at
    // once, but an EWMA never forgets them, so the baseline is established.
    const gappy = Array(40)
      .fill(null)
      .map((_, i) => (i % 2 === 0 ? 100 : null));
    expect(ewmaRatiosOf(gappy)[39]).toBeCloseTo(1, 10);
  });

  it("carries the average forward on unlogged days rather than decaying it", () => {
    // A week off doesn't move either average, so the ratio is unchanged when
    // logging resumes — "didn't record" is not "did nothing".
    const withGap = [...Array(20).fill(100), ...Array(7).fill(null)];
    const ratios = ewmaWorkloadSeries(series(withGap)).ratio;
    expect(ratios[26]).toBeCloseTo(ratios[19]!, 10);
  });

  it("returns null rather than NaN when nothing has been done at all", () => {
    expect(ewmaRatiosOf(Array(40).fill(0))[39]).toBeNull();
  });

  it("reports a restart after a long layoff as a large spike", () => {
    const ratios = ewmaRatiosOf([...Array(28).fill(0), ...Array(7).fill(50)]);
    expect(ratios[34]!).toBeGreaterThan(WORKLOAD_DANGER_MIN);
  });
});
