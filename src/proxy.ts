import { auth } from "@/auth/server";

export default auth.middleware({ loginUrl: "/login" });

export const config = {
  matcher: [
    // Match all paths except static files
    "/((?!api|_next/static|_next/image|favicon.ico|login|sign-up).*)",
  ],
};
