CREATE TABLE `oauth_states` (
	`id` text PRIMARY KEY NOT NULL,
	`state` text NOT NULL,
	`user_id` text NOT NULL,
	`metadata` text,
	`expires_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_states_state_unique` ON `oauth_states` (`state`);