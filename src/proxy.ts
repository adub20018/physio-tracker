import { NextRequest } from "next/server";
import { auth } from "@/auth/server";

const middleware = auth.middleware({ loginUrl: "/login" });

// Workaround: @neondatabase/auth's beta middleware (^0.4.2-beta) reuses the request's HTTP
// method for its GET-only session check, so a POST 404s there and reads as logged-out. Feed it a GET clone.
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
    // Match all paths except API routes, static/image output, unauthenticated pages, and
    // public/ assets (by extension, so new assets are excluded automatically — else logos 404 to /login).
    // The leading `$` excludes "/" itself and nothing else — the landing page is public,
    // and it redirects signed-in visitors to /dashboard on its own.
    "/((?!$|api|_next/static|_next/image|login|sign-up|.*\\.(?:ico|svg|png|jpg|jpeg|gif|webp|avif|css|js|mjs|txt|xml|json|woff2?|ttf|map)$).*)",
  ],
};
