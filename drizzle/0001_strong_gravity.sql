DROP INDEX `os_cohort_scope`;--> statement-breakpoint
CREATE INDEX `os_cohort_scope_time` ON `os_cohort_contributions` (`cohort`,`source_mode`,`updated_at`);