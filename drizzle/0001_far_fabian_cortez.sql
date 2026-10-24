CREATE TABLE `delivery_policies` (
	`variant_id` text PRIMARY KEY NOT NULL,
	`enabled` integer DEFAULT 0 NOT NULL,
	`duration_days` integer,
	`instructions` text DEFAULT '' NOT NULL,
	`download_url` text DEFAULT '' NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `digital_stock` (
	`id` text PRIMARY KEY NOT NULL,
	`variant_id` text NOT NULL,
	`environment` text NOT NULL,
	`payload` text NOT NULL,
	`fingerprint` text NOT NULL,
	`order_id` text,
	`unit_ref` text,
	`delivered_at` text,
	`expires_at` text,
	`instructions` text DEFAULT '' NOT NULL,
	`download_url` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `digital_stock_fingerprint_unique` ON `digital_stock` (`fingerprint`);--> statement-breakpoint
CREATE UNIQUE INDEX `digital_stock_unit_ref_unique` ON `digital_stock` (`unit_ref`);