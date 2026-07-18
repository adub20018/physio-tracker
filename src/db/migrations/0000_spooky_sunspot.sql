CREATE TABLE `daily_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date` text NOT NULL,
	`steps` integer,
	`pain_morning` real,
	`pain_daytime` real,
	`pain_night` real,
	`activity_tags` text,
	`pain_types` text,
	`activity_notes` text,
	`general_notes` text,
	`sleep_hours` real,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_logs_user_date_unique` ON `daily_logs` (`user_id`,`date`);--> statement-breakpoint
CREATE TABLE `exercise_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`daily_log_id` text NOT NULL,
	`exercise_name` text NOT NULL,
	`sets` integer NOT NULL,
	`duration_or_reps` integer NOT NULL,
	`unit` text DEFAULT 'seconds' NOT NULL,
	`intensity_min` real,
	`intensity_max` real,
	`notes` text,
	FOREIGN KEY (`daily_log_id`) REFERENCES `daily_logs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
