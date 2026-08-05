import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // "strict" made iOS Safari withhold the cookie on first request of a new top-level nav
    // (looked logged out). "lax" still blocks cross-site POSTs/embeds, just not top-level GETs.
    sameSite: "lax",
  },
});
