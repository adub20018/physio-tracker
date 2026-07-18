// Root layout: HTML shell, the app's three typographic voices, global styles,
// and the app-wide provider stack (PrimeReact theme). Pages render inside
// <AppProviders>.
//
// Type system: Fraunces (warm serif) for display, Instrument Sans (sleek
// modern grotesque) for body/UI, IBM Plex Mono for data.
import type { Metadata } from "next";
import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/components/ui/app-providers";
import { AppNav } from "@/components/ui/app-nav";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  axes: ["SOFT", "WONK", "opsz"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Physio Tracker",
  description: "Personal rehab progress dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // .app-dark commits the PrimeReact theme to its dark scheme, matching the
    // app's own always-dark palette (see darkModeSelector in AppProviders).
    <html
      lang="en"
      className={`app-dark ${fraunces.variable} ${instrument.variable} ${plexMono.variable}`}
    >
      <body>
        <AppProviders>
          <AppNav />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
