// drizzle-kit configuration: where the schema lives, where generated SQL
// migrations go, and how to reach the database.
import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED!,
  },
  // Neon Auth owns and migrates its own neon_auth schema (user/session/
  // account/verification) in this same database — explicit so drizzle-kit
  // never touches it, even though "public" is already its default.
  schemaFilter: ["public"],
});
