import { cache } from "react";
import { auth } from "@/auth/server";

export const getCurrentUser = cache(async () => {
  const { data: session } = await auth.getSession();

  if (!session) {
    throw new Error("Unauthenticated user");
  }

  return session.user;
});
