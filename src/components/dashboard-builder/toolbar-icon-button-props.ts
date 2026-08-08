import type { ComponentProps } from "react";
import type { Button } from "@primereact/ui/button";

// Shared height for every dashboard toolbar button (icon-only or not), so
// the time-range button's text+chevron shape still lines up with its
// square neighbors instead of reading a different size.
export const TOOLBAR_BUTTON_HEIGHT = "2rem";

// Shared prop bundle for the dashboard toolbar's icon-only buttons (edit
// dashboard, settings) — one place to keep them uniform and square instead
// of each button's own file redeclaring the same values.
//
// PrimeReact's own `.p-button-icon-only` CSS pins only the button's WIDTH
// (to a token sized for its own ~1rem icons, e.g. 1.75rem at size="small")
// and clips overflow — height is left to grow with content. So a bigger
// icon just made the button taller while getting clipped to the same
// visible width, never actually looking larger. An inline `style` beats
// that external stylesheet rule regardless of specificity, so pin both
// dimensions ourselves to a square that comfortably fits a bigger icon.
export const TOOLBAR_ICON_BUTTON_PROPS = {
  iconOnly: true,
  variant: "outlined",
  severity: "secondary",
  size: "small",
  style: { width: TOOLBAR_BUTTON_HEIGHT, height: TOOLBAR_BUTTON_HEIGHT },
} satisfies Partial<ComponentProps<typeof Button>>;
