PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_pricing_tiers` (
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
	FOREIGN KEY (`discord_role_id`) REFERENCES `discord_roles`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_pricing_tiers`("id", "discord_server_id", "discord_role_id", "name", "description", "price_cents", "currency", "duration", "is_featured", "is_active", "display_order", "version", "needs_sync", "created_at", "updated_at") SELECT "id", "discord_server_id", "discord_role_id", "name", "description", "price_cents", "currency", "duration", "is_featured", "is_active", "display_order", "version", "needs_sync", "created_at", "updated_at" FROM `pricing_tiers`;--> statement-breakpoint
DROP TABLE `pricing_tiers`;--> statement-breakpoint
ALTER TABLE `__new_pricing_tiers` RENAME TO `pricing_tiers`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `server_order_idx` ON `pricing_tiers` (`discord_server_id`,`display_order`);--> statement-breakpoint
CREATE INDEX `server_active_idx` ON `pricing_tiers` (`discord_server_id`,`is_active`);--> statement-breakpoint
CREATE UNIQUE INDEX `unique_server_name` ON `pricing_tiers` (`discord_server_id`,`name`);