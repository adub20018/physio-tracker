import { cache } from "react";
import { auth } from "@/auth/server";

export const getCurrentUser = cache(async () => {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    throw new Error("getCurrentUser() called without an authenticated session");
  }

  return session.user;
});

// Non-throwing variant for chrome that renders on both signed-in and
// signed-out pages (e.g. the nav's account menu, mounted in the root
// layout above /login and /sign-up). Wrapped in try/catch specifically
// because /login and /sign-up are excluded from proxy.ts's matcher, so
// there's no middleware pass to pre-warm the session-cache cookie there —
// auth.getSession() then tries to mint/clear that cookie itself, which
// Next.js disallows from a Server Component (layout) render.
export const getOptionalCurrentUser = cache(async () => {
  try {
    const { data: session } = await auth.getSession();
    return session?.user ?? null;
  } catch {
    return null;
  }
});
