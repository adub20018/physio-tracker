CREATE TABLE "user_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"flare_threshold" real DEFAULT 3 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Hand-written, same reason as 0001_repoint-user-fk.sql: neon_auth.user is
-- owned/migrated by Neon Auth itself, not represented in our Drizzle schema,
-- so drizzle-kit's normal diffing can't generate this FK.
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_id_neon_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;
