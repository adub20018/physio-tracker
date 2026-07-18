// Tests for rolling averages over gappy series.
import { describe, expect, it } from "vitest";
import { average, rollingAverage } from "../rolling";

describe("average", () => {
  it("averages non-null values", () => {
    expect(average([1, 2, 3])).toBe(2);
  });
  it("ignores nulls", () => {
    expect(average([1, null, 3])).toBe(2);
  });
  it("returns null for an empty or all-null series", () => {
    expect(average([])).toBeNull();
    expect(average([null, null])).toBeNull();
  });
});

describe("rollingAverage", () => {
  it("computes a trailing window", () => {
    expect(rollingAverage([1, 2, 3, 4], 2)).toEqual([1, 1.5, 2.5, 3.5]);
  });
  it("shrinks the window at the start of the series", () => {
    expect(rollingAverage([2, 4, 6], 7)).toEqual([2, 3, 4]);
  });
  it("skips nulls inside the window", () => {
    expect(rollingAverage([2, null, 4], 3)).toEqual([2, 2, 3]);
  });
  it("yields null where the window holds no values", () => {
    expect(rollingAverage([null, null, 6], 2)).toEqual([null, null, 6]);
  });
  it("rejects a window below 1", () => {
    expect(() => rollingAverage([1], 0)).toThrow();
  });
});
