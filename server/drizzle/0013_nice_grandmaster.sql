CREATE TABLE `ai_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`user_id` text NOT NULL,
	`user_version` integer NOT NULL,
	`session_hash` text NOT NULL,
	`generation` integer NOT NULL,
	`status` text NOT NULL,
	`request_cipher` text NOT NULL,
	`result_cipher` text,
	`lease_hash` text,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ai_jobs_one_active_agent` ON `ai_jobs` (`agent_id`) WHERE "ai_jobs"."status" IN ('queued','running');