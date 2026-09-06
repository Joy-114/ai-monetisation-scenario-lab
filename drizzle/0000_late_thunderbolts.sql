CREATE TABLE `analysis_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`language` text NOT NULL,
	`under_threshold` real NOT NULL,
	`over_threshold` real NOT NULL,
	`current_revenue` real NOT NULL,
	`current_profit` real NOT NULL,
	`summary` text,
	`summary_source` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_analysis_runs_dataset_id` ON `analysis_runs` (`dataset_id`);--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`dataset_id` text NOT NULL,
	`customer_name` text NOT NULL,
	`segment` text NOT NULL,
	`monthly_usage` real NOT NULL,
	`current_price` real NOT NULL,
	`willingness_to_pay` real NOT NULL,
	`variable_cost` real NOT NULL,
	FOREIGN KEY (`dataset_id`) REFERENCES `datasets`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_customers_dataset_id` ON `customers` (`dataset_id`);--> statement-breakpoint
CREATE INDEX `idx_customers_dataset_segment` ON `customers` (`dataset_id`,`segment`);--> statement-breakpoint
CREATE TABLE `datasets` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`source_filename` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `pricing_scenarios` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_run_id` text NOT NULL,
	`name` text NOT NULL,
	`model` text NOT NULL,
	`fixed_monthly_price` real,
	`price_per_unit` real,
	`base_monthly_fee` real,
	`total_revenue` real NOT NULL,
	`total_variable_cost` real NOT NULL,
	`gross_profit` real NOT NULL,
	`gross_margin` real,
	`arpu` real,
	`revenue_uplift` real,
	`profit_uplift` real,
	FOREIGN KEY (`analysis_run_id`) REFERENCES `analysis_runs`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_pricing_scenarios_analysis_run_id` ON `pricing_scenarios` (`analysis_run_id`);