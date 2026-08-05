// Client-side provider stack for the whole app, mounted once in the root layout — the only
// place that knows how PrimeReact is configured (theme, SSR styling, license; PLAN.md §5).
"use client";

import { PrimeReactProvider, PrimeReactStyleSheet } from "@primereact/core";
import { useServerInsertedHTML } from "next/navigation";
import { definePreset } from "@primeuix/themes";
import Aura from "@primeuix/themes/aura";

// Try a color scheme: change this word and save (hot-reloads via globals.css's CSS-var aliases;
// pain severity colors stay fixed). Palettes: emerald/green/lime/teal/cyan/sky/blue/indigo/violet/purple/fuchsia/pink/rose/red/orange/amber/yellow, or "noir" (monochrome).
const COLOR_SCHEME: string = "emerald";
// ─────────────────────────────────────────────────────────────────────────

// Builds a primary scale of token references like {sky.500}, which the
// preset system resolves against the chosen palette.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
function paletteRef(name: string): Record<number, string> {
  return Object.fromEntries(SHADES.map((s) => [s, `{${name}.${s}}`]));
}

// Noir maps primary onto the surface (neutral) scale and inverts primary/highlight tokens
// so buttons and accents render white-on-black — the standard Prime theming docs recipe.
const preset =
  COLOR_SCHEME === "noir"
    ? definePreset(Aura, {
        semantic: {
          primary: paletteRef("surface"),
          colorScheme: {
            light: {
              primary: {
                color: "{primary.950}",
                contrastColor: "#ffffff",
                hoverColor: "{primary.800}",
                activeColor: "{primary.700}",
              },
              highlight: {
                background: "{primary.950}",
                focusBackground: "{primary.700}",
                color: "#ffffff",
                focusColor: "#ffffff",
              },
            },
            dark: {
              primary: {
                color: "{primary.50}",
                contrastColor: "{primary.950}",
                hoverColor: "{primary.200}",
                activeColor: "{primary.300}",
              },
              highlight: {
                background: "{primary.50}",
                focusBackground: "{primary.300}",
                color: "{primary.950}",
                focusColor: "{primary.950}",
              },
            },
          },
        },
      })
    : definePreset(Aura, {
        semantic: { primary: paletteRef(COLOR_SCHEME) },
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
      theme={{ preset, options: { darkModeSelector: ".app-dark" } }}
      stylesheet={styledStyleSheet}
      // Free Community license key (see AGENTS.md); public by nature — ships to the browser.
      license={process.env.NEXT_PUBLIC_PRIMEUI_LICENSE_KEY}
    >
      {children}
    </PrimeReactProvider>
  );
}
