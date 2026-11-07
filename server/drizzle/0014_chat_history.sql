CREATE TABLE `chat_conversations` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`epoch` integer NOT NULL,
	`revision` integer NOT NULL,
	`title_cipher` text NOT NULL,
	`content_cipher` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chat_conversations_user_updated` ON `chat_conversations` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `chat_history_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`epoch` integer DEFAULT 0 NOT NULL
);

--> statement-breakpoint
INSERT INTO `chat_history_state` (`id`, `epoch`) VALUES (1, 0);
