// Zod schemas for the dashboard actions. Structural validation only —
// not an enum check against the widget registry: an unrecognized
// widgetType just fails to render (dashboard-grid.tsx already filters
// unknown types defensively), it isn't a security or data-integrity risk
// worth duplicating the registry's type list into a server-safe module for.
import { z } from "zod";

export const dashboardWidgetInputSchema = z.object({
  widgetType: z.string().trim().min(1).max(60),
  x: z.number().int().min(0),
  y: z.number().int().min(0),
  w: z.number().int().min(1).max(12),
  h: z.number().int().min(1).max(100),
});

export const saveDashboardLayoutSchema = z.array(dashboardWidgetInputSchema).max(100);

// A dashboard's display name — trimmed, non-empty, and bounded so nobody
// pastes a paragraph into the switcher. Same shape as the tag/name limits
// used elsewhere in the app (see log/schema.ts).
export const dashboardNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name")
  .max(40, "Keep it under 40 characters");
