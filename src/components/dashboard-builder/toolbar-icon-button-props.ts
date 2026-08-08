import type { ComponentProps } from "react";
import type { Button } from "@primereact/ui/button";

// Shared prop bundle for the dashboard toolbar's icon-only buttons (time
// range, edit dashboard, settings) — one place to keep them uniform and
// square instead of each button's own file redeclaring the same values.
export const TOOLBAR_ICON_BUTTON_PROPS = {
  iconOnly: true,
  variant: "outlined",
  severity: "secondary",
  size: "small",
} satisfies Partial<ComponentProps<typeof Button>>;
