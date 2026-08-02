CREATE TABLE "dashboard_widgets" (
	"id" text PRIMARY KEY NOT NULL,
	"dashboard_id" text NOT NULL,
	"widget_type" text NOT NULL,
	"x" integer NOT NULL,
	"y" integer NOT NULL,
	"w" integer NOT NULL,
	"h" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dashboards" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "dashboard_widgets" ADD CONSTRAINT "dashboard_widgets_dashboard_id_dashboards_id_fk" FOREIGN KEY ("dashboard_id") REFERENCES "public"."dashboards"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
-- Hand-written, same reason as 0002_mature_imperial_guard.sql: neon_auth.user is
-- owned/migrated by Neon Auth itself, not represented in our Drizzle schema, so
-- drizzle-kit's normal diffing can't generate this FK.
ALTER TABLE "dashboards" ADD CONSTRAINT "dashboards_user_id_neon_auth_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "neon_auth"."user"("id") ON DELETE CASCADE;