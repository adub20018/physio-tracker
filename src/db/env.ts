// Database connection settings, read from environment variables in one place
// so the app client (client.ts) and drizzle-kit (drizzle.config.ts) never
// drift apart. Falls back to a local SQLite file for development.
export const dbCredentials = {
  // Local dev: "file:./dev.db". Production (Vercel): a Turso libsql:// URL.
  url: process.env.DATABASE_URL ?? "file:./dev.db",
  // Only required for remote Turso databases; undefined for local files.
  authToken: process.env.DATABASE_AUTH_TOKEN,
};
