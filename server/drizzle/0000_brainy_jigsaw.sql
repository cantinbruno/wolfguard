CREATE TABLE `rotations` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`pin_salt` text NOT NULL,
	`pin_hash` text NOT NULL,
	`generation` integer NOT NULL,
	`version` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`active_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `vault` (
	`id` integer PRIMARY KEY NOT NULL,
	`pin_salt` text NOT NULL,
	`pin_hash` text NOT NULL,
	`generation` integer NOT NULL,
	`version` integer NOT NULL,
	`object_key` text,
	`failures` integer NOT NULL,
	`blocked_until` integer NOT NULL,
	`lease` text,
	`lease_until` integer NOT NULL
);
