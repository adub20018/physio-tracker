// Drizzle/libSQL implementation of UserRepository.
// The only user lookup logic in the app — auth's getCurrentUser() builds on it.
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users, type User } from "@/db/schema";
import type { UserRepository } from "@/repositories/types";

export class DrizzleUserRepository implements UserRepository {
  // Returns the first (and currently only) user, or null on an unseeded DB.
  async findFirst(): Promise<User | null> {
    const rows = await db.select().from(users).limit(1);
    return rows[0] ?? null;
  }

  async findById(id: string): Promise<User | null> {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0] ?? null;
  }
}
