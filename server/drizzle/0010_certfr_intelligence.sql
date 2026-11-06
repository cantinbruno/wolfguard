CREATE TABLE `scan_intelligence` (
	`job_id` text PRIMARY KEY NOT NULL,
	`report_revision` integer NOT NULL,
	`result_cipher` text NOT NULL,
	`checked_at` integer NOT NULL
);
