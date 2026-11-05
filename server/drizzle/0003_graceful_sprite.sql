CREATE TABLE `access_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`ip_hash` text NOT NULL,
	`ip_cipher` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_blocks_ip_hash_unique` ON `access_blocks` (`ip_hash`);--> statement-breakpoint
CREATE TABLE `access_connections` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`id` text NOT NULL,
	`created_at` integer NOT NULL,
	`ip_hash` text,
	`ip_cipher` text,
	`device_cipher` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `access_connections_id_unique` ON `access_connections` (`id`);