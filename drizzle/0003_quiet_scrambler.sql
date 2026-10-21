CREATE TABLE `os_strategy_contributions` (
	`organization_id` text NOT NULL,
	`source_mode` text NOT NULL,
	`cohort` text NOT NULL,
	`strategy` text NOT NULL,
	`control_q` integer NOT NULL,
	`candidate_q` integer NOT NULL,
	`observed_at` text NOT NULL,
	PRIMARY KEY(`organization_id`, `source_mode`, `strategy`)
);
--> statement-breakpoint
CREATE INDEX `os_strategy_cohort_time` ON `os_strategy_contributions` (`source_mode`,`cohort`,`observed_at`,`strategy`);