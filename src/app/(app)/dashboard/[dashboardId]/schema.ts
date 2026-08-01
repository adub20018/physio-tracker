// Zod schema for the edit-mode Save action. Structural validation only —
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
