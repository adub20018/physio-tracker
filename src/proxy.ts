import { NextRequest } from "next/server";
import { auth } from "@/auth/server";

const middleware = auth.middleware({ loginUrl: "/login" });

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
      : new NextRequest(request.url, {
          headers: request.headers,
          method: "GET",
        });

  return middleware(authCheckRequest);
}

export const config = {
  matcher: [
    // Match all paths except API routes, Next's own static/image output,
    // the two unauthenticated pages, and anything in public/ — matched
    // generically by file extension (favicon.ico, PhysiMate-logo.svg/png,
    // …) rather than by name, so a newly added public/ asset is excluded
    // automatically instead of needing its own matcher entry. Without
    // this, a logged-out request for the logo itself hit this same
    // middleware, got redirected to /login (an HTML page, not an image),
    // and rendered as a broken image — exactly what happens once nothing
    // has it cached from an already-authenticated visit.
    "/((?!api|_next/static|_next/image|login|sign-up|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp|avif|css|js|mjs|txt|xml|json|woff2?|ttf|map)$).*)",
  ],
};
