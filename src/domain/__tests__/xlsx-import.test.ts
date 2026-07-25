// Tests for the spreadsheet-cell parsing helpers used by the in-app import.
import { describe, expect, it } from "vitest";
import {
  deriveActivityTags,
  normalizeExerciseName,
  parseIntensity,
  parsePain,
  parseSetGroups,
  parseSleepHours,
  parseSteps,
  parseText,
  toIsoDate,
} from "../xlsx-import";

describe("parsePain", () => {
  it("accepts \"x/10\" strings, plain numbers, and numeric strings", () => {
    expect(parsePain("2/10")).toBe(2);
    expect(parsePain("1.5/10")).toBe(1.5);
    expect(parsePain(4)).toBe(4);
    expect(parsePain("3")).toBe(3);
  });
  it("returns null for empty, out-of-range, or unparseable values", () => {
    expect(parsePain(null)).toBeNull();
    expect(parsePain("")).toBeNull();
    expect(parsePain("12/10")).toBeNull();
    expect(parsePain("ouch")).toBeNull();
  });
});

describe("parseSetGroups", () => {
  it("parses a single group and multiple comma-separated groups", () => {
    expect(parseSetGroups("3x15")).toEqual([{ sets: 3, duration: 15 }]);
    expect(parseSetGroups("3x20, 1x30")).toEqual([
      { sets: 3, duration: 20 },
      { sets: 1, duration: 30 },
    ]);
  });
  it("returns an empty array for empty or unparseable input", () => {
    expect(parseSetGroups(null)).toEqual([]);
    expect(parseSetGroups("rest day")).toEqual([]);
  });
});

describe("parseIntensity", () => {
  it("parses a range and a single percentage", () => {
    expect(parseIntensity("Light-Medium (20-25% weight)")).toEqual({ min: 20, max: 25 });
    expect(parseIntensity("Medium (25%)")).toEqual({ min: 25, max: 25 });
  });
  it("returns null when no percentage is present", () => {
    expect(parseIntensity("Light")).toBeNull();
    expect(parseIntensity(null)).toBeNull();
  });
});

describe("deriveActivityTags", () => {
  it("matches keywords including the phyio typo", () => {
    expect(deriveActivityTags("Gym + phyio + walking at cafe")).toEqual([
      "gym",
      "physio",
      "walking",
    ]);
  });
  it("returns an empty array when nothing matches", () => {
    expect(deriveActivityTags("Nothing today")).toEqual([]);
    expect(deriveActivityTags(null)).toEqual([]);
  });
});

describe("normalizeExerciseName", () => {
  it("trims, collapses whitespace, and normalizes casing", () => {
    expect(normalizeExerciseName("  standing  ankle RAISE ")).toBe("Standing ankle raise");
  });
  it("returns null for empty input", () => {
    expect(normalizeExerciseName(null)).toBeNull();
    expect(normalizeExerciseName("   ")).toBeNull();
  });
});

describe("toIsoDate", () => {
  it("formats a local Date without UTC shifting", () => {
    expect(toIsoDate(new Date(2026, 6, 5))).toBe("2026-07-05");
  });
  it("returns null for non-Date or invalid values", () => {
    expect(toIsoDate("2026-07-05")).toBeNull();
    expect(toIsoDate(new Date(NaN))).toBeNull();
  });
});

describe("parseText", () => {
  it("trims and returns null for blank/empty values", () => {
    expect(parseText("  hello  ")).toBe("hello");
    expect(parseText("   ")).toBeNull();
    expect(parseText(null)).toBeNull();
  });
});

describe("parseSteps", () => {
  it("rounds to a non-negative integer", () => {
    expect(parseSteps(1234.6)).toBe(1235);
    expect(parseSteps("5000")).toBe(5000);
  });
  it("returns null for negative or unparseable values", () => {
    expect(parseSteps(-5)).toBeNull();
    expect(parseSteps("many")).toBeNull();
    expect(parseSteps(null)).toBeNull();
  });
});

describe("parseSleepHours", () => {
  it("accepts values up to 24, unlike pain's 0-10 clamp", () => {
    expect(parseSleepHours(9.5)).toBe(9.5);
    expect(parseSleepHours("7")).toBe(7);
  });
  it("returns null outside 0-24 or unparseable", () => {
    expect(parseSleepHours(25)).toBeNull();
    expect(parseSleepHours(-1)).toBeNull();
    expect(parseSleepHours(null)).toBeNull();
  });
});
