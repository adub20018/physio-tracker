// The single source of "who is using the app". Pages, server actions, and
// route handlers call getCurrentUser() and never inspect cookies or sessions
// themselves — so upgrading to real multi-user auth later means reimplementing
// this helper (plus a login page) and nothing else (PLAN.md §3).
//
// Current behaviour: returns the seeded single user. The password gate
// (Phase 5) will deny access before this code runs; once real auth exists,
// this will resolve the user from the session instead.
//
// Server-side only — it touches the database via the repository layer.
import { cache } from "react";
import type { User } from "@/db/schema";
import { userRepository } from "@/repositories";

// React.cache keeps this to one DB lookup per request no matter how many
// components call it.
export const getCurrentUser = cache(async (): Promise<User> => {
  const user = await userRepository.findFirst();
  if (!user) {
    throw new Error("No user in database — run `npm run db:migrate` then `npm run db:seed`.");
  }
  return user;
});
