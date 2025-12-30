CREATE TABLE `discord_servers` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_id` text NOT NULL,
	`name` text NOT NULL,
	`icon` text,
	`member_count` integer DEFAULT 0 NOT NULL,
	`bot_status` text DEFAULT 'Pending' NOT NULL CHECK(bot_status IN ('Connected', 'Disconnected', 'Pending')),
	`bot_added_at` integer NOT NULL,
	`permissions` text NOT NULL,
	`access_token` text NOT NULL,
	`refresh_token` text NOT NULL,
	`token_expires_at` integer NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `discord_servers_discord_id_unique` ON `discord_servers` (`discord_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `discord_servers_user_id_unique` ON `discord_servers` (`user_id`);