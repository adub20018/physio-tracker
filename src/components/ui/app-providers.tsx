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
import Aura from "@primeuix/themes/aura";

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
      theme={{ preset: Aura }}
      stylesheet={styledStyleSheet}
      // Free Community license key (see AGENTS.md); public by nature — it
      // ships to the browser in any PrimeReact app.
      license={process.env.NEXT_PUBLIC_PRIMEUI_LICENSE_KEY}
    >
      {children}
    </PrimeReactProvider>
  );
}
