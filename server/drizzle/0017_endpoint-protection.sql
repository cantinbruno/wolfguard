CREATE TABLE `endpoint_commands` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`generation` integer NOT NULL,
	`requested_by` text NOT NULL,
	`user_version` integer NOT NULL,
	`action` text NOT NULL,
	`status` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`lease_hash` text,
	`result_cipher` text,
	FOREIGN KEY (`agent_id`) REFERENCES `scan_agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `endpoint_commands_agent_status` ON `endpoint_commands` (`agent_id`,`status`);--> statement-breakpoint
CREATE TABLE `endpoint_events` (
	`agent_id` text NOT NULL,
	`event_key` text NOT NULL,
	`occurred_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`status` text NOT NULL,
	`severity` text NOT NULL,
	`event_cipher` text NOT NULL,
	`acknowledged_at` integer,
	`acknowledged_by` text,
	PRIMARY KEY(`agent_id`, `event_key`),
	FOREIGN KEY (`agent_id`) REFERENCES `scan_agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `endpoint_events_agent_time` ON `endpoint_events` (`agent_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `endpoint_events_open` ON `endpoint_events` (`agent_id`,`status`,`acknowledged_at`);--> statement-breakpoint
CREATE TABLE `endpoint_policies` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`policy_cipher` text NOT NULL,
	`updated_by` text NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `scan_agents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `endpoint_states` (
	`agent_id` text PRIMARY KEY NOT NULL,
	`generation` integer NOT NULL,
	`collected_at` integer NOT NULL,
	`received_at` integer NOT NULL,
	`snapshot_cipher` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `scan_agents`(`id`) ON UPDATE no action ON DELETE cascade
);
