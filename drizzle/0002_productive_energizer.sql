CREATE TABLE `product_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`author_key` text NOT NULL,
	`dedupe_key` text NOT NULL,
	`display_name` text NOT NULL,
	`rating` integer NOT NULL,
	`comment` text NOT NULL,
	`photo_key` text,
	`verified` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `product_reviews_dedupe_key_unique` ON `product_reviews` (`dedupe_key`);