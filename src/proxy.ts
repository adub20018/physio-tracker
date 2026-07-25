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
      : new NextRequest(request.url, { headers: request.headers, method: "GET" });
  return middleware(authCheckRequest);
}

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!api|_next/static|_next/image|favicon.ico|login|sign-up).*)",
  ],
};
