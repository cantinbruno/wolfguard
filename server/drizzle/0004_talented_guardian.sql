CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name_hash` text NOT NULL,
	`name_cipher` text NOT NULL,
	`role` text NOT NULL,
	`pin_salt` text NOT NULL,
	`pin_hash` text NOT NULL,
	`code_version` integer DEFAULT 1 NOT NULL,
	`disabled_at` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`last_login` integer
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_name_hash_unique` ON `users` (`name_hash`);--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_id` text;--> statement-breakpoint
ALTER TABLE `sessions` ADD `user_version` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vault` ADD `users_enabled` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `vault` ADD `workspace_key_cipher` text;