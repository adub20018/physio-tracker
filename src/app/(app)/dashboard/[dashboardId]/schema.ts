// Zod schemas for the dashboard actions. Structural validation only, not an enum check against
// the widget registry: an unrecognized widgetType just fails to render (dashboard-grid.tsx filters it).
import { z } from "zod";
import { TIME_RANGES } from "@/lib/time-range";

export const dashboardWidgetInputSchema = z.object({
  widgetType: z.string().trim().min(1).max(60),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(100),
  // The phone grid's own placement; null until arranged there.
  mobileX: z.number().int().min(0).nullable(),
  mobileY: z.number().int().min(0).nullable(),
  mobileW: z.number().int().min(1).max(12).nullable(),
  mobileH: z.number().int().min(1).max(100).nullable(),
});

export const saveDashboardLayoutSchema = z.array(dashboardWidgetInputSchema).max(100);

// A dashboard's display name — trimmed, non-empty, and bounded so nobody pastes a paragraph in.
export const dashboardNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(40, "Keep it under 40 characters");

// A dashboard's persisted time-range selection — must be one of the
// presets lib/time-range.ts defines, not an arbitrary string.
export const dashboardTimeRangeSchema = z.enum(TIME_RANGES);
