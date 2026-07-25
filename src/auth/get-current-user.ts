import { cache } from "react";
import { auth } from "@/auth/server";

export const getCurrentUser = cache(async () => {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    throw new Error("getCurrentUser() called without an authenticated session");
  }

  return session.user;
});
