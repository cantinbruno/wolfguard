CREATE TABLE `scan_agents` (
	`id` text PRIMARY KEY NOT NULL,
	`name_cipher` text NOT NULL,
	`token_hash` text NOT NULL,
	`generation` integer NOT NULL,
	`created_at` integer NOT NULL,
	`last_seen` integer NOT NULL,
	`revoked_at` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scan_agents_token_hash_unique` ON `scan_agents` (`token_hash`);--> statement-breakpoint
CREATE TABLE `scan_jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`generation` integer NOT NULL,
	`strategy` text NOT NULL,
	`status` text NOT NULL,
	`spec_cipher` text NOT NULL,
	`result_cipher` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`revision` integer NOT NULL,
	`completed` integer NOT NULL,
	`total` integer NOT NULL,
	`lease_hash` text,
	`lease_until` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `scan_jobs_one_active_agent` ON `scan_jobs` (`agent_id`) WHERE "scan_jobs"."status" IN ('queued','running');--> statement-breakpoint
CREATE TABLE `scan_pairings` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL,
	`expires_at` integer NOT NULL
);
