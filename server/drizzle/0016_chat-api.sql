CREATE TABLE `chat_api_config` (
	`id` integer PRIMARY KEY NOT NULL,
	`key_cipher` text,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `chat_api_usage` (
	`user_id` text PRIMARY KEY NOT NULL,
	`window_start` integer NOT NULL,
	`requests` integer NOT NULL,
	`lease` text NOT NULL,
	`lease_until` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);

--> statement-breakpoint
INSERT INTO chat_api_config (id,revision) VALUES (1,0);
