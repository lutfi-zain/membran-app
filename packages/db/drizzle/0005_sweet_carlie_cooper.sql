CREATE TABLE `discord_roles` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_server_id` text NOT NULL,
	`discord_role_id` text NOT NULL,
	`role_name` text NOT NULL,
	`bot_can_manage` integer DEFAULT false NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`color` integer,
	`hoist` integer DEFAULT false NOT NULL,
	`permissions` text,
	`synced_at` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`discord_server_id`) REFERENCES `discord_servers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `server_manageable_idx` ON `discord_roles` (`discord_server_id`,`bot_can_manage`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_server_role` ON `discord_roles` (`discord_server_id`,`discord_role_id`);--> statement-breakpoint
CREATE TABLE `pricing_tiers` (
	`id` text PRIMARY KEY NOT NULL,
	`discord_server_id` text NOT NULL,
	`discord_role_id` text,
	`name` text NOT NULL,
	`description` text,
	`price_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`duration` text NOT NULL,
	`is_featured` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`display_order` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`needs_sync` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`discord_server_id`) REFERENCES `discord_servers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`discord_role_id`) REFERENCES `discord_roles`(`discord_role_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `server_order_idx` ON `pricing_tiers` (`discord_server_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `server_active_idx` ON `pricing_tiers` (`discord_server_id`,`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_server_name` ON `pricing_tiers` (`discord_server_id`,`name`);--> statement-breakpoint
CREATE TABLE `tier_features` (
	`id` text PRIMARY KEY NOT NULL,
	`tier_id` text NOT NULL,
	`description` text NOT NULL,
	`display_order` integer NOT NULL,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`tier_id`) REFERENCES `pricing_tiers`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `tier_order_idx` ON `tier_features` (`tier_id`,`display_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_tier_order` ON `tier_features` (`tier_id`,`display_order`);