CREATE TABLE `remote_inputs` (
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`created_at` integer NOT NULL,
	`input_cipher` text NOT NULL,
	PRIMARY KEY(`session_id`, `seq`)
);
--> statement-breakpoint
CREATE TABLE `remote_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`generation` integer NOT NULL,
	`owner_hash` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`viewer_until` integer NOT NULL,
	`agent_until` integer NOT NULL,
	`lease_hash` text,
	`frame_revision` integer DEFAULT 0 NOT NULL,
	`input_seq` integer DEFAULT 0 NOT NULL,
	`input_ack` integer DEFAULT 0 NOT NULL,
	`message_cipher` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `remote_one_active_agent` ON `remote_sessions` (`agent_id`) WHERE "remote_sessions"."status" IN ('requested','preparing','active');