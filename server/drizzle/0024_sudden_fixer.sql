CREATE TABLE `object_chunks` (
	`key` text NOT NULL,
	`rev` text NOT NULL,
	`idx` integer NOT NULL,
	`data` text NOT NULL,
	PRIMARY KEY(`key`, `rev`, `idx`)
);
--> statement-breakpoint
CREATE TABLE `objects` (
	`key` text PRIMARY KEY NOT NULL,
	`rev` text NOT NULL,
	`size` integer NOT NULL,
	`meta_json` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `objects_created` ON `objects` (`created_at`);