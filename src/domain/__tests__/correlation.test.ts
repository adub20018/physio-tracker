// Tests for pairing and Pearson correlation.
import { describe, expect, it } from "vitest";
import { correlationStrength, pairSeries, pearson } from "../correlation";

describe("pairSeries", () => {
  const dates = ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-04"];

  it("keeps only positions where both values exist", () => {
    const pairs = pairSeries([1, null, 3, 4], [10, 20, null, 40], ["a", "b", "c", "d"], dates);
    expect(pairs).toEqual([
      { x: 1, y: 10, label: "a", date: "2026-07-01" },
      { x: 4, y: 40, label: "d", date: "2026-07-04" },
    ]);
  });
  it("rejects mismatched lengths", () => {
    expect(() => pairSeries([1], [1, 2], ["a", "b"], ["2026-07-01", "2026-07-02"])).toThrow();
  });
});

describe("pearson", () => {
  it("finds perfect positive and negative correlation", () => {
    const up = [1, 2, 3, 4].map((x) => ({ x, y: 2 * x + 1 }));
    const down = [1, 2, 3, 4].map((x) => ({ x, y: -x }));
    expect(pearson(up)).toBeCloseTo(1);
    expect(pearson(down)).toBeCloseTo(-1);
  });
  it("is ~0 for uncorrelated data", () => {
    const pairs = [
      { x: 1, y: 2 },
      { x: 2, y: 9 },
      { x: 3, y: 1 },
      { x: 4, y: 8 },
      { x: 5, y: 2 },
    ];
    expect(Math.abs(pearson(pairs)!)).toBeLessThan(0.35);
  });
  it("returns null for tiny samples or constant series", () => {
    expect(pearson([{ x: 1, y: 1 }, { x: 2, y: 2 }])).toBeNull();
    expect(pearson([{ x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }])).toBeNull();
  });
});

describe("correlationStrength", () => {
  it("buckets |r| into words", () => {
    expect(correlationStrength(0.85)).toBe("strong");
    expect(correlationStrength(-0.5)).toBe("moderate");
    expect(correlationStrength(0.25)).toBe("weak");
    expect(correlationStrength(0.05)).toBe("negligible");
  });
});
