CREATE TABLE `duo_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`config_cipher` text,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `duo_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`state_hash` text NOT NULL,
	`ticket_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`user_version` integer NOT NULL,
	`generation` integer NOT NULL,
	`config_revision` integer NOT NULL,
	`otp_binding` text NOT NULL,
	`nonce` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `duo_requests_state_hash_unique` ON `duo_requests` (`state_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `duo_requests_ticket_hash_unique` ON `duo_requests` (`ticket_hash`);--> statement-breakpoint
CREATE INDEX `duo_requests_user_created` ON `duo_requests` (`user_id`,`created_at`);
--> statement-breakpoint
INSERT INTO `duo_config` (`id`, `enabled`, `revision`) VALUES (1, 0, 0);
