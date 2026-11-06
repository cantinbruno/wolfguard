CREATE TABLE `user_invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`ticket_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_invitations_ticket_hash_unique` ON `user_invitations` (`ticket_hash`);