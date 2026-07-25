CREATE TABLE "daily_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"date" text NOT NULL,
	"steps" integer,
	"pain_morning" real,
	"pain_daytime" real,
	"pain_night" real,
	"activity_tags" jsonb,
	"pain_types" jsonb,
	"activity_notes" text,
	"general_notes" text,
	"sleep_hours" real,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise_entries" (
	"id" text PRIMARY KEY NOT NULL,
	"daily_log_id" text NOT NULL,
	"exercise_name" text NOT NULL,
	"sets" integer NOT NULL,
	"duration_or_reps" integer NOT NULL,
	"unit" text DEFAULT 'seconds' NOT NULL,
	"intensity_min" real,
	"intensity_max" real,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_logs" ADD CONSTRAINT "daily_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise_entries" ADD CONSTRAINT "exercise_entries_daily_log_id_daily_logs_id_fk" FOREIGN KEY ("daily_log_id") REFERENCES "public"."daily_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "daily_logs_user_date_unique" ON "daily_logs" USING btree ("user_id","date");