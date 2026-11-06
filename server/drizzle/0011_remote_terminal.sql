CREATE TABLE `terminal_commands` (
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`created_at` integer NOT NULL,
	`status` text NOT NULL,
	`spec_cipher` text NOT NULL,
	`result_cipher` text,
	`revision` integer DEFAULT 0 NOT NULL,
	`cancel_requested` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`session_id`, `seq`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `terminal_one_pending_command` ON `terminal_commands` (`session_id`) WHERE "terminal_commands"."status" IN ('queued','running');--> statement-breakpoint
ALTER TABLE `remote_sessions` ADD `mode` text DEFAULT 'desktop' NOT NULL;--> statement-breakpoint
ALTER TABLE `remote_sessions` ADD `terminal_cipher` text;