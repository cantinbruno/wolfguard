CREATE TABLE `remote_file_commands` (
	`session_id` text NOT NULL,
	`seq` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`spec_cipher` text NOT NULL,
	`result_cipher` text,
	PRIMARY KEY(`session_id`, `seq`)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `remote_files_one_pending` ON `remote_file_commands` (`session_id`) WHERE "remote_file_commands"."status" IN ('queued','running');--> statement-breakpoint
DROP INDEX `users_pin_lookup_unique`;--> statement-breakpoint
CREATE INDEX `users_pin_lookup_index` ON `users` (`pin_lookup`);--> statement-breakpoint
ALTER TABLE `remote_sessions` ADD `transfer_seq` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `scan_agents` ADD `restricted` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `sessions` ADD `token_cipher` text;--> statement-breakpoint
UPDATE sessions SET expires_at=9007199254740991;--> statement-breakpoint
DELETE FROM sessions WHERE user_id IS NOT NULL AND rowid NOT IN (SELECT MAX(rowid) FROM sessions WHERE user_id IS NOT NULL GROUP BY user_id);--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_one_account` ON `sessions` (`user_id`) WHERE "sessions"."user_id" IS NOT NULL;