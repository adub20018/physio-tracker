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

// ─── Try out color schemes here ──────────────────────────────────────────
// Change this one word and save — the app hot-reloads with the new scheme.
// Everything follows automatically: PrimeReact components read the theme
// tokens, and the app's own CSS variables (globals.css) alias them.
// (Exception by design: pain severity colors stay lime/amber/red.)
//
// Built-in palettes: "emerald" | "green" | "lime" | "teal" | "cyan" | "sky"
//   | "blue" | "indigo" | "violet" | "purple" | "fuchsia" | "pink" | "rose"
//   | "red" | "orange" | "amber" | "yellow"
// Special: "noir" — monochrome, primary becomes white-on-black.
const COLOR_SCHEME: string = "emerald";
// ─────────────────────────────────────────────────────────────────────────

// Builds a primary scale of token references like {sky.500}, which the
// preset system resolves against the chosen palette.
const SHADES = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const;
function paletteRef(name: string): Record<number, string> {
  return Object.fromEntries(SHADES.map((s) => [s, `{${name}.${s}}`]));
}

// Noir maps primary onto the surface (neutral) scale and inverts the
// primary/highlight tokens so buttons and accents render white-on-black —
// the standard Noir recipe from the Prime theming docs.
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
      // Free Community license key (see AGENTS.md); public by nature — it
      // ships to the browser in any PrimeReact app.
      license={process.env.NEXT_PUBLIC_PRIMEUI_LICENSE_KEY}
    >
      {children}
    </PrimeReactProvider>
  );
}
