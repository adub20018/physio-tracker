-- Hand-written: neon_auth.user (Neon Auth's own table, owned/migrated by
-- Neon Auth itself, not represented in our Drizzle schema) is the FK
-- target, so drizzle-kit's normal diffing can't generate this. See the
-- comment on dailyLogs.userId in src/db/schema.ts.
--
-- daily_logs and users are both empty in every environment this has run
-- against so far, so this is a safe, non-destructive schema change.
ALTER TABLE "daily_logs" DROP CONSTRAINT "daily_logs_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_logs" ALTER COLUMN "user_id" TYPE uuid USING "user_id"::uuid;
--> statement-breakpoint
DROP TABLE "users";
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_neon_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
