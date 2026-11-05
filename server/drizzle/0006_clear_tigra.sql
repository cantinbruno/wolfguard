ALTER TABLE `users` ADD `credential_pending` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `invite_hash` text;--> statement-breakpoint
ALTER TABLE `users` ADD `invite_expires_at` integer;