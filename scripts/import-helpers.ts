// Pure parsing helpers for the one-off spreadsheet import. Each function
// converts one quirky spreadsheet format into the structured shape the
// database stores. Kept dependency-free so they can be tested or reused
// without touching the DB.
import type { ActivityTag } from "../src/db/schema";

// Pain cell → number 0–10, or null. Accepts "2/10", "4.5/10", plain numbers,
// and numeric strings ("2", "1.5") so the import works whether or not the
// spreadsheet has been converted away from the "/10" format.
export function parsePain(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = String(value).trim();
  const match = text.match(/^(\d+(?:\.\d+)?)(?:\s*\/\s*10)?$/);
  if (!match) return null;
  const num = Number(match[1]);
  return num >= 0 && num <= 10 ? num : null;
}

// "3x15" → [{sets: 3, duration: 15}]; "3x20, 1x30" → two groups. Each group
// becomes its own ExerciseEntry so mixed-duration days (e.g. a longer test
// hold) are preserved exactly.
export function parseSetGroups(value: unknown): { sets: number; duration: number }[] {
  if (value == null || value === "") return [];
  const groups: { sets: number; duration: number }[] = [];
  for (const part of String(value).split(",")) {
    const match = part.trim().match(/^(\d+)\s*x\s*(\d+)$/i);
    if (match) groups.push({ sets: Number(match[1]), duration: Number(match[2]) });
  }
  return groups;
}

// "Light-Medium (20-25% weight)" → {min: 20, max: 25}; "Medium (25%)" →
// {min: 25, max: 25}. The label (Light/Medium) is redundant with the numbers
// and is not stored. Returns null when no percentage is present.
export function parseIntensity(value: unknown): { min: number; max: number } | null {
  if (value == null || value === "") return null;
  const match = String(value).match(/(\d+(?:\.\d+)?)\s*(?:-\s*(\d+(?:\.\d+)?))?\s*%/);
  if (!match) return null;
  const min = Number(match[1]);
  const max = match[2] ? Number(match[2]) : min;
  return { min, max };
}

// Activity notes → structured tags by keyword ("Gym + physio + walking at
// cafe" → gym, physio, walking). "phy" catches the "phyio" typo present in
// the source data. The original text is preserved separately as notes.
export function deriveActivityTags(value: unknown): ActivityTag[] {
  if (value == null || value === "") return [];
  const text = String(value).toLowerCase();
  const tags: ActivityTag[] = [];
  if (text.includes("gym")) tags.push("gym");
  if (text.includes("phy")) tags.push("physio");
  if (text.includes("rest")) tags.push("rest");
  if (text.includes("walk")) tags.push("walking");
  return tags;
}

// Normalizes inconsistent casing ("standing ankle raise" vs "Standing ankle
// raise") to a single canonical form: trimmed, first letter capitalized.
export function normalizeExerciseName(value: unknown): string | null {
  if (value == null || value === "") return null;
  const text = String(value).trim().replace(/\s+/g, " ");
  if (!text) return null;
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

// Date cell → ISO "YYYY-MM-DD" using local date parts (xlsx gives local-time
// Date objects; toISOString would shift days across the UTC boundary).
export function toIsoDate(value: unknown): string | null {
  if (!(value instanceof Date) || isNaN(value.getTime())) return null;
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Free-text cell → trimmed string or null.
export function parseText(value: unknown): string | null {
  if (value == null) return null;
  const text = String(value).trim();
  return text.length > 0 ? text : null;
}

// Steps cell → non-negative integer or null.
export function parseSteps(value: unknown): number | null {
  if (value == null || value === "") return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? Math.round(num) : null;
}
