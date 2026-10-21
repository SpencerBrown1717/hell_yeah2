CREATE TABLE `os_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`organization_id` text NOT NULL,
	`operation_key` text NOT NULL,
	`actor_id` text NOT NULL,
	`event_type` text NOT NULL,
	`payload_json` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `os_audit_org_time` ON `os_audit` (`organization_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `os_cohort_contributions` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`cohort` text NOT NULL,
	`source_mode` text NOT NULL,
	`eligible` integer NOT NULL,
	`qualified` integer NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `os_cohort_scope` ON `os_cohort_contributions` (`cohort`,`source_mode`);--> statement-breakpoint
CREATE TABLE `os_operations` (
	`organization_id` text NOT NULL,
	`operation_key` text NOT NULL,
	`request_hash` text NOT NULL,
	`response_json` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `operation_key`)
);
--> statement-breakpoint
CREATE TABLE `os_workspaces` (
	`organization_id` text PRIMARY KEY NOT NULL,
	`revision` integer NOT NULL,
	`state_json` text NOT NULL,
	`last_operation` text NOT NULL,
	`updated_at` text NOT NULL
);
