CREATE TABLE `access_groups` (
	`id` integer PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL,
	`revision` integer NOT NULL,
	`config_cipher` text NOT NULL,
	`updated_at` integer NOT NULL
);
