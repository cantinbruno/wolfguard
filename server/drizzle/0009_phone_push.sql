CREATE TABLE `push_devices` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`subscription_cipher` text NOT NULL,
	`public_key` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_devices_user_id_unique` ON `push_devices` (`user_id`);--> statement-breakpoint
CREATE TABLE `push_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_hash` text NOT NULL,
	`user_id` text NOT NULL,
	`user_version` integer NOT NULL,
	`device_id` text NOT NULL,
	`generation` integer NOT NULL,
	`nonce` text NOT NULL,
	`state` text NOT NULL,
	`display_code` text NOT NULL,
	`details_cipher` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_requests_ticket_hash_unique` ON `push_requests` (`ticket_hash`);--> statement-breakpoint
CREATE UNIQUE INDEX `push_requests_one_pending_user` ON `push_requests` (`user_id`) WHERE "push_requests"."state" = 'pending';