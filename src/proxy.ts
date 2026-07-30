import { NextRequest } from "next/server";
import { auth } from "@/auth/server";

const middleware = auth.middleware({ loginUrl: "/login" });

// Second workaround for @neondatabase/auth's beta middleware (as of
// ^0.4.2-beta), alongside the GET-cloning one below: its "is there a valid
// session?" check treats ANY failure of its own upstream get-session call
// (a network blip, a slow "cold" connection after the auth service has sat
// idle) the same as "not authenticated" and redirects to /login — even
// though the session itself is perfectly valid. That's exactly what shows
// up as "opening the site after a few hours sometimes bounces me to
// /login, but clicking Home right after gets me straight to the dashboard
// with no login needed": the retry (a fresh request, its own fresh
// upstream call) just happens to succeed where the first one didn't.
//
// Only worth retrying when the visitor actually has some Neon Auth cookie
// state — a genuinely logged-out visitor never reaches the upstream call
// at all (no session token to check), so retrying them would just add
// latency to the correct, ordinary "please log in" redirect for no
// benefit. `__Secure-neon-auth` is the library's own cookie prefix
// (undocumented/private — see NEON_AUTH_COOKIE_PREFIX in its bundled
// source — so this is a heuristic, not a stable public API; re-check on
// upgrade).
const NEON_AUTH_COOKIE_PREFIX = "__Secure-neon-auth";
const LOGIN_REDIRECT_RETRY_DELAY_MS = 300;

function isRedirectToLogin(response: Response, request: NextRequest): boolean {
  if (response.status < 300 || response.status >= 400) return false;
  const location = response.headers.get("location");
  if (!location) return false;
  return new URL(location, request.url).pathname === "/login";
}

// Workaround for a bug in @neondatabase/auth's beta middleware (as of
// ^0.4.2-beta): its internal "is there a valid session?" check reuses the
// incoming request's own HTTP method when it calls the upstream get-session
// endpoint (which only accepts GET). That's harmless for page GETs (method
// already matches), but a POST — e.g. any /log section's Server Action save —
// gets forwarded upstream as "POST get-session", which 404s and is read as
// "not authenticated", redirecting an already-signed-in save to /login.
// The auth decision should never depend on the request's method, only on
// its cookies, so we feed the middleware a GET-cloned request purely for
// that decision; NextResponse.next()'s `request` option only carries
// headers forward, so this doesn't change how Next.js routes the real
// request afterward. Remove once upstream fixes this.
export default async function proxy(request: NextRequest) {
  const authCheckRequest =
    request.method === "GET"
      ? request
      : new NextRequest(request.url, { headers: request.headers, method: "GET" });

  const response = await middleware(authCheckRequest);
  const hasNeonAuthCookie = (request.headers.get("cookie") ?? "").includes(
    NEON_AUTH_COOKIE_PREFIX,
  );
  if (!hasNeonAuthCookie || !isRedirectToLogin(response, request)) {
    return response;
  }

  // One retry, after a short pause — enough for a transient blip or a
  // cold connection to clear without meaningfully slowing down the rare
  // case that does need it, and without ever showing the login page.
  await new Promise((resolve) => setTimeout(resolve, LOGIN_REDIRECT_RETRY_DELAY_MS));
  return middleware(authCheckRequest);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!api|_next/static|_next/image|favicon.ico|login|sign-up).*)",
  ],
};
