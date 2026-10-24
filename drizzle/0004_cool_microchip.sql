CREATE TABLE `customer_sessions` (
	`session_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`project_id` text NOT NULL,
	`email` text NOT NULL,
	`full_name` text,
	`firebase_token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `customer_sessions_firebase_token_hash_unique` ON `customer_sessions` (`firebase_token_hash`);--> statement-breakpoint
CREATE INDEX `customer_sessions_expiry` ON `customer_sessions` (`expires_at`);