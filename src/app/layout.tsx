// Root layout: HTML shell, global styles, and provider stack — shared by both the authenticated
// app and auth pages (both use styled PrimeReact + the dark theme). Nav lives in (app)/layout.tsx instead.
import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/components/app-providers";
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
