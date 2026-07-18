// Tests for physio volume computation.
import { describe, expect, it } from "vitest";
import { dailyPhysioVolume, exerciseVolume } from "../volume";

describe("exerciseVolume", () => {
  it("multiplies sets × duration × mean intensity fraction", () => {
    // 3 sets × 20s at 20–30% → 3 × 20 × 0.25 = 15
    expect(
      exerciseVolume({ sets: 3, durationOrReps: 20, intensityMin: 20, intensityMax: 30 })
    ).toBe(15);
  });
  it("uses the single value when min equals max or max is missing", () => {
    expect(
      exerciseVolume({ sets: 4, durationOrReps: 15, intensityMin: 25, intensityMax: null })
    ).toBe(15);
  });
  it("defaults intensity to 1 when unrecorded", () => {
    expect(
      exerciseVolume({ sets: 3, durationOrReps: 15, intensityMin: null, intensityMax: null })
    ).toBe(45);
  });
});

describe("dailyPhysioVolume", () => {
  it("sums entries and returns 0 for a rest day", () => {
    const day = {
      exercises: [
        { sets: 3, durationOrReps: 20, intensityMin: 30, intensityMax: 30 }, // 18
        { sets: 1, durationOrReps: 30, intensityMin: 30, intensityMax: 30 }, // 9
      ],
    };
    expect(dailyPhysioVolume(day)).toBe(27);
    expect(dailyPhysioVolume({ exercises: [] })).toBe(0);
  });
});
