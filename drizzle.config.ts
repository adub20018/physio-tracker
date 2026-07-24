// drizzle-kit configuration: where the schema lives, where generated SQL
// migrations go, and how to reach the database. Shares connection settings
// with the app via src/db/env.ts so the two can never disagree.
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
});
