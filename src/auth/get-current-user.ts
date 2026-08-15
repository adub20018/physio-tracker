import { cache } from "react";
import { auth } from "@/auth/server";

export const getCurrentUser = cache(async () => {
  const user = await getOptionalUser();

  if (!user) {
    throw new Error("getCurrentUser() called without an authenticated session");
  }

  return user;
});

// For the public routes, where "signed out" is a normal state rather than a bug —
// the landing page shows itself to visitors and bounces members to their dashboard.
export const getOptionalUser = cache(async () => {
  const { data: session } = await auth.getSession();
  return session?.user ?? null;
});
