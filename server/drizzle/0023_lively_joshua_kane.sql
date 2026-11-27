CREATE TABLE `shared_secrets` (
	`id_hash` text PRIMARY KEY NOT NULL,
	`cipher` text NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `shared_secrets_owner` ON `shared_secrets` (`created_by`,`expires_at`);--> statement-breakpoint
CREATE INDEX `shared_secrets_expiry` ON `shared_secrets` (`expires_at`);