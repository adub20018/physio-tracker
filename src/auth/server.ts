import { createNeonAuth } from "@neondatabase/auth/next/server";

export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
    // The library's own default is "strict" (see prepareResponseHeaders in
    // its bundled next/server output — it forces this SameSite value onto
    // every cookie it mints or re-writes, including the session token
    // itself, not just its own internal cache cookie). Strict cookies are
    // withheld on a browser's first request of what it considers a new
    // top-level navigation — iOS Safari treats reopening/relaunching a tab
    // this way more readily than Chrome does — so the session looked
    // logged-out on that one request even though the cookie was still
    // perfectly valid, and worked again the instant any in-page navigation
    // (e.g. tapping Home) sent it normally. Lax is the standard choice for
    // an auth session cookie specifically to avoid this: it still blocks
    // the cookie on cross-site POSTs/embeds (the actual CSRF protection
    // SameSite exists for), just not on ordinary top-level GETs like this.
    sameSite: "lax",
  },
});
