CREATE TABLE `permission_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` integer NOT NULL,
	`details_cipher` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `scan_jobs` ADD `created_by` text;--> statement-breakpoint
ALTER TABLE `user_invitations` ADD `permissions_cipher` text;--> statement-breakpoint
ALTER TABLE `users` ADD `permissions_cipher` text;--> statement-breakpoint
ALTER TABLE `users` ADD `permission_revision` integer DEFAULT 1 NOT NULL;