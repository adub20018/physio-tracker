// Client-side provider stack for the whole app, mounted once in the root
// layout. This is the only place that knows how PrimeReact is configured —
// theme preset, SSR style injection, license — so swapping or reconfiguring
// the UI kit happens here, not in the layout or pages (PLAN.md §5).
//
// PrimeReact v11 styled mode on Next.js needs three things (per the official
// Next.js guide): a theme preset, a PrimeReactStyleSheet that collects
// component CSS during server rendering (flushed into the HTML via
// useServerInsertedHTML), and a PrimeUI license key.
"use client";

import { PrimeReactProvider, PrimeReactStyleSheet } from "@primereact/core";
import { useServerInsertedHTML } from "next/navigation";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

// App theme: Aura restyled to the "evening journal" palette in globals.css —
// sage-green primary, green-tinted ink surfaces. Kept next to the provider
// because they are configured together.
const EveningJournal = definePreset(Aura, {
  semantic: {
    primary: {
      50: "#f0f7f2",
      100: "#dcece1",
      200: "#bcd9c6",
      300: "#9bc7ab",
      400: "#8fc7a6",
      500: "#5f9d7c",
      600: "#4c8065",
      700: "#3c6450",
      800: "#2e4c3d",
      900: "#243a30",
      950: "#162420",
    },
    colorScheme: {
      dark: {
        surface: {
          0: "#ffffff",
          50: "#f2f5f3",
          100: "#e2e7e4",
          200: "#c4cdc8",
          300: "#9aa79f",
          400: "#6b756e",
          500: "#4b554f",
          600: "#333d38",
          700: "#252d29",
          800: "#1a201d",
          900: "#141917",
          950: "#0e1210",
        },
      },
    },
  },
});

// Module-level singleton: collects the CSS of every styled component that
// renders during SSR so the markup arrives already styled (no flash).
const styledStyleSheet = new PrimeReactStyleSheet();

export function AppProviders({ children }: { children: React.ReactNode }) {
  // Flush collected component styles into the server-rendered HTML head.
  useServerInsertedHTML(() => {
    const styleElements = styledStyleSheet.getAllElements();
    styledStyleSheet.clear();
    return <>{styleElements}</>;
  });

  return (
    <PrimeReactProvider
      // .app-dark is set on <html> permanently — the app commits to dark.
      theme={{ preset: EveningJournal, options: { darkModeSelector: ".app-dark" } }}
      stylesheet={styledStyleSheet}
      // Free Community license key (see AGENTS.md); public by nature — it
      // ships to the browser in any PrimeReact app.
      license={process.env.NEXT_PUBLIC_PRIMEUI_LICENSE_KEY}
    >
      {children}
    </PrimeReactProvider>
  );
}
