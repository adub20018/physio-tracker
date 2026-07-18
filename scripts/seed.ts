// One-off seed script: creates the single app user if none exists.
// Run with `npm run db:seed` (after `npm run db:migrate`).
// Idempotent — running it twice never creates a second user.
import { db } from "../src/db/client";
import { users } from "../src/db/schema";

async function seed() {
  const existing = await db.select().from(users).limit(1);
  if (existing.length > 0) {
    console.log(`User already seeded: ${existing[0].name} (${existing[0].id})`);
    return;
  }

  const name = process.env.SEED_USER_NAME ?? "Alex";
  const [user] = await db.insert(users).values({ name }).returning();
  console.log(`Seeded user: ${user.name} (${user.id})`);
}

seed().then(
  () => process.exit(0),
  (err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  }
);
