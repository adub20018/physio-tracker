import { cache } from "react";
import { auth } from "@/auth/server";
import { redirect } from "next/navigation";

export const getCurrentUser = cache(async () => {
  const { data: session } = await auth.getSession();

  if (!session) {
    console.log("Not logged in. Redirecting to login...");
    redirect("/login");
  }

  return session.user;
});
