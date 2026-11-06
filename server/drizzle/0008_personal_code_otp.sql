ALTER TABLE `users` ADD `pin_lookup` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `users_pin_lookup_unique` ON `users` (`pin_lookup`);
--> statement-breakpoint
ALTER TABLE `users` ADD `otp_secret_cipher` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `otp_pending_cipher` text;
--> statement-breakpoint
ALTER TABLE `users` ADD `otp_pending_until` integer;
--> statement-breakpoint
ALTER TABLE `users` ADD `otp_last_step` integer DEFAULT -1 NOT NULL;
--> statement-breakpoint
ALTER TABLE `users` ADD `otp_recovery_cipher` text;
