CREATE TABLE `onboarding_states` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`bot_connected` integer DEFAULT false NOT NULL,
	`pricing_configured` integer DEFAULT false NOT NULL,
	`completed_at` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `onboarding_states_user_id_unique` ON `onboarding_states` (`user_id`);