// Root layout: HTML shell, the app's typographic voices, global styles,
// and the app-wide provider stack (PrimeReact theme). Shared by both the
// authenticated app and the auth pages, since both use styled PrimeReact
// components and the same dark theme — but neither the nav nor any
// user-fetching lives here. The nav only makes sense on authenticated
// routes and lives in (app)/layout.tsx instead; (auth)/layout.tsx has its
// own minimal chrome. See PLAN.md §5.
//
// Type system: Instrument Sans (sleek modern grotesque) for both display
// (headings) and body/UI — weight and size carry the hierarchy instead of a
// separate serif — plus IBM Plex Mono for data.
import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/components/ui/app-providers";
import "./globals.css";

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
  title: "PhysiMate",
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
      className={`app-dark ${instrument.variable} ${plexMono.variable}`}
    >
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
