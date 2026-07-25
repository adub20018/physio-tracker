// Root layout: HTML shell, the app's typographic voices, global styles,
// and the app-wide provider stack (PrimeReact theme). Pages render inside
// <AppProviders>.
//
// Type system: Instrument Sans (sleek modern grotesque) for both display
// (headings) and body/UI — weight and size carry the hierarchy instead of a
// separate serif — plus IBM Plex Mono for data.
import type { Metadata } from "next";
import { Instrument_Sans, IBM_Plex_Mono } from "next/font/google";
import { AppProviders } from "@/components/ui/app-providers";
import { AppNav } from "@/components/ui/app-nav";
import { getOptionalCurrentUser } from "@/auth/get-current-user";
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
  title: "Physio Tracker",
  description: "Personal rehab progress dashboard",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Optional — this layout also wraps /login and /sign-up, which have no
  // session at all, so it can't use the throwing getCurrentUser() here.
  const user = await getOptionalCurrentUser();

  return (
    // .app-dark commits the PrimeReact theme to its dark scheme, matching the
    // app's own always-dark palette (see darkModeSelector in AppProviders).
    <html
      lang="en"
      className={`app-dark ${instrument.variable} ${plexMono.variable}`}
    >
      <body>
        <AppProviders>
          <AppNav user={user ? { name: user.name, email: user.email } : null} />
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
