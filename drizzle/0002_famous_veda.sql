CREATE TABLE `os_background_settings` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL,
	`next_run_at` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `os_background_due` ON `os_background_settings` (`enabled`,`next_run_at`);--> statement-breakpoint
CREATE TABLE `os_jobs` (
	`sequence` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`id` text NOT NULL,
	`organization_id` text NOT NULL,
	`partition_key` text NOT NULL,
	`request_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`actor_id` text NOT NULL,
	`kind` text NOT NULL,
	`payload_json` text NOT NULL,
	`status` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`total_attempts` integer DEFAULT 0 NOT NULL,
	`available_at` integer NOT NULL,
	`lease_token` text,
	`lease_until` integer,
	`error_code` text,
	`result_json` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `os_jobs_id` ON `os_jobs` (`id`);--> statement-breakpoint
CREATE UNIQUE INDEX `os_jobs_request` ON `os_jobs` (`organization_id`,`request_key`);--> statement-breakpoint
CREATE INDEX `os_jobs_ready` ON `os_jobs` (`status`,`available_at`,`sequence`);--> statement-breakpoint
CREATE INDEX `os_jobs_lease` ON `os_jobs` (`status`,`lease_until`);--> statement-breakpoint
CREATE INDEX `os_jobs_partition` ON `os_jobs` (`organization_id`,`partition_key`,`sequence`,`status`);--> statement-breakpoint
CREATE INDEX `os_jobs_org` ON `os_jobs` (`organization_id`,`sequence`);--> statement-breakpoint
CREATE TABLE `os_source_cursors` (
	`organization_id` text NOT NULL,
	`source` text NOT NULL,
	`managed_account_id` text NOT NULL,
	`received_cursor` text,
	`received_revision` integer DEFAULT 0 NOT NULL,
	`applied_cursor` text,
	`applied_revision` integer DEFAULT 0 NOT NULL,
	`last_job_id` text,
	`updated_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `source`, `managed_account_id`)
);
