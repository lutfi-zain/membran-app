-- Migration: 0009_payment_subscription_tables.sql
-- Description: Add tables for payment and subscription flow

-- Subscriptions table
CREATE TABLE IF NOT EXISTS `subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`member_id` text NOT NULL,
	`server_id` text NOT NULL,
	`tier_id` text NOT NULL,
	`status` text NOT NULL,
	`start_date` integer NOT NULL,
	`expiry_date` integer,
	`last_payment_amount` integer,
	`last_payment_date` integer,
	`grace_period_until` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`member_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`server_id`) REFERENCES `discord_servers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`tier_id`) REFERENCES `pricing_tiers`(`id`) ON UPDATE no action ON DELETE no action
);
CREATE INDEX IF NOT EXISTS `member_server_idx` ON `subscriptions` (`member_id`,`server_id`);
CREATE INDEX IF NOT EXISTS `status_idx` ON `subscriptions` (`status`);
CREATE INDEX IF NOT EXISTS `expiry_idx` ON `subscriptions` (`expiry_date`);

-- Transactions table
CREATE TABLE IF NOT EXISTS `transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text NOT NULL,
	`midtrans_order_id` text NOT NULL,
	`midtrans_transaction_id` text,
	`amount` integer NOT NULL,
	`currency` text DEFAULT 'IDR' NOT NULL,
	`status` text NOT NULL,
	`payment_method` text,
	`payment_date` integer,
	`gross_amount` integer,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	`updated_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `order_id_unique` ON `transactions` (`midtrans_order_id`);
CREATE INDEX IF NOT EXISTS `transaction_subscription_idx` ON `transactions` (`subscription_id`);
CREATE INDEX IF NOT EXISTS `transaction_status_idx` ON `transactions` (`status`);

-- Webhook events table
CREATE TABLE IF NOT EXISTS `webhook_events` (
	`id` text PRIMARY KEY NOT NULL,
	`midtrans_order_id` text NOT NULL,
	`payload` text NOT NULL,
	`signature` text NOT NULL,
	`verified` integer NOT NULL,
	`processed` integer DEFAULT false NOT NULL,
	`processing_error` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL
);
CREATE INDEX IF NOT EXISTS `webhook_order_id_idx` ON `webhook_events` (`midtrans_order_id`);
CREATE INDEX IF NOT EXISTS `webhook_created_idx` ON `webhook_events` (`created_at`);

-- Activity logs table
CREATE TABLE IF NOT EXISTS `activity_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`subscription_id` text,
	`actor_type` text NOT NULL,
	`actor_id` text,
	`action` text NOT NULL,
	`details` text,
	`created_at` integer DEFAULT (strftime('%s', 'now')) NOT NULL,
	FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON UPDATE no action ON DELETE set null
);
CREATE INDEX IF NOT EXISTS `activity_subscription_idx` ON `activity_logs` (`subscription_id`);
CREATE INDEX IF NOT EXISTS `actor_idx` ON `activity_logs` (`actor_type`,`actor_id`);
CREATE INDEX IF NOT EXISTS `activity_created_idx` ON `activity_logs` (`created_at`);
