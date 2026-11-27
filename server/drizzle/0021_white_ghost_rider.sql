CREATE TABLE `app_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`level` text NOT NULL,
	`kind` text NOT NULL,
	`details_cipher` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `app_logs_time` ON `app_logs` (`created_at`);--> statement-breakpoint
CREATE TABLE `login_throttle` (
	`key` text PRIMARY KEY NOT NULL,
	`failures` integer DEFAULT 0 NOT NULL,
	`blocked_until` integer DEFAULT 0 NOT NULL,
	`lease` text,
	`lease_until` integer DEFAULT 0 NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `sessions` ADD `created_at` integer;