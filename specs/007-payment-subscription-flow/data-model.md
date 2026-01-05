# Data Model: Payment & Subscription Flow

**Feature**: 007-payment-subscription-flow
**Date**: 2026-01-03
**Status**: Complete

## Overview

This document defines the database schema for payment and subscription functionality, including entities for subscriptions, transactions, webhook events, activity logs, and member-server relationships.

---

## Entity Relationship Diagram

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│  discord_   │         │ subscriptions│         │pricing_tiers│
│   servers   │────┬────┤              │────┬────┤             │
└─────────────┘    │    │              │    │    └─────────────┘
                   │    │ - id (PK)    │    │
                   │    │ - member_id  │    │
                   │    │ - server_id  │    │
┌─────────────┐    │    │ - tier_id (FK)   │
│  members    │────┘    │ - status     │    │
└─────────────┘         │ - start_date │    │
│ - id (PK)  │         │ - expiry_date│    │
│ - discord_ │         └──────────────┘    │
│   user_id  │                  │          │
│ - email    │                  │          │
│ - email_   │         ┌────────▼──────────┘
│   verified │         │
└─────────────┘    ┌─────────┐
                   │transactions│
                   │            │
                   │ - id (PK)  │
                   │ - sub_id(FK)│
                   │ - amount   │
                   │ - status   │
                   │ - midtrans_│
                   │   order_id │
                   └────────────┘

┌──────────────┐         ┌─────────────┐
│webhook_events│         │activity_logs│
└──────────────┘         └─────────────┘
│ - id (PK)    │         │ - id (PK)   │
│ - payload    │         │ - actor     │
│ - signature  │         │ - action    │
│ - verified   │         │ - timestamp │
└──────────────┘         └─────────────┘
```

---

## Tables

### 1. `members`

Stores Discord member information with email verification status.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `discord_user_id` | TEXT | UNIQUE, NOT NULL | Discord snowflake ID |
| `discord_username` | TEXT | NOT NULL | Discord username (for display) |
| `email` | TEXT | UNIQUE, NULLABLE | Member email address |
| `email_verified` | BOOLEAN | DEFAULT false | Email verification status |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Registration timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_members_discord_id` on `discord_user_id` (for OAuth lookup)
- `idx_members_email` on `email` (for verification)

**Validation Rules**:
- `email` must be valid email format if present
- `email_verified` can only be `true` if `email` is not null
- `discord_user_id` must be numeric string (Discord snowflake)

---

### 2. `subscriptions`

Core entity for member subscriptions to pricing tiers on specific servers.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `member_id` | TEXT | FK → members.id, NOT NULL | Member reference |
| `server_id` | TEXT | FK → discord_servers.id, NOT NULL | Server reference |
| `tier_id` | TEXT | FK → pricing_tiers.id, NOT NULL | Pricing tier reference |
| `status` | TEXT | NOT NULL, CHECK | Status: Active/Pending/Expired/Cancelled/Failed |
| `start_date` | TIMESTAMP | NOT NULL | Subscription start date |
| `expiry_date` | TIMESTAMP | NULLABLE | Subscription expiry (null for Pending/Failed) |
| `last_payment_amount` | INTEGER | NULLABLE | Last payment amount in cents |
| `last_payment_date` | TIMESTAMP | NULLABLE | Last payment timestamp |
| `grace_period_until` | TIMESTAMP | NULLABLE | Grace period end (Level 2 feature) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_subscriptions_member_server` on `(member_id, server_id)` WHERE `status = 'Active'` (UNIQUE for one-subscription constraint)
- `idx_subscriptions_status` on `status` (for querying active/expired)
- `idx_subscriptions_expiry` on `expiry_date` (for expiry checking)

**Validation Rules**:
- `status` must be one of: 'Active', 'Pending', 'Expired', 'Cancelled', 'Failed'
- `expiry_date` must be > `start_date` when not null
- Only one Active subscription per `(member_id, server_id)` (enforced by unique index)

**State Transitions**:
```
Pending → Active    (payment successful)
Pending → Cancelled (timeout after 1 hour)
Active → Expired    (past expiry_date)
Active → Cancelled  (refund or manual cancellation)
Failed → (terminal state)
Cancelled → (terminal state)
```

---

### 3. `transactions`

Midtrans payment transaction records.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `subscription_id` | TEXT | FK → subscriptions.id, NOT NULL | Subscription reference |
| `midtrans_order_id` | TEXT | UNIQUE, NOT NULL | Midtrans order ID (for idempotency) |
| `midtrans_transaction_id` | TEXT | NULLABLE | Midtrans transaction ID (after payment) |
| `amount` | INTEGER | NOT NULL | Amount in cents |
| `currency` | TEXT | NOT NULL, DEFAULT 'IDR' | Currency code (ISO 4217) |
| `status` | TEXT | NOT NULL | Status: Pending/Success/Failed/Refunded |
| `payment_method` | TEXT | NULLABLE | Payment method: gopay/ovo/mandiri/etc |
| `payment_date` | TIMESTAMP | NULLABLE | Payment completion timestamp |
| `gross_amount` | INTEGER | NULLABLE | Original amount (before adjustments) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last update timestamp |

**Indexes**:
- `idx_transactions_order_id` on `midtrans_order_id` (UNIQUE for idempotency)
- `idx_transactions_subscription` on `subscription_id` (for subscription history)
- `idx_transactions_status` on `status` (for reconciliation)

**Validation Rules**:
- `midtrans_order_id` must be unique (idempotency)
- `amount` must be > 0
- `currency` must be valid ISO 4217 code
- `status` must be one of: 'Pending', 'Success', 'Failed', 'Refunded'

---

### 4. `webhook_events`

Audit log for received Midtrans webhooks.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `midtrans_order_id` | TEXT | NOT NULL | Associated transaction order ID |
| `payload` | JSON | NOT NULL | Full webhook payload |
| `signature` | TEXT | NOT NULL | X-Signature header value |
| `verified` | BOOLEAN | NOT NULL | Signature verification result |
| `processed` | BOOLEAN | DEFAULT false | Whether webhook was processed |
| `processing_error` | TEXT | NULLABLE | Error message if processing failed |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Receipt timestamp |

**Indexes**:
- `idx_webhooks_order_id` on `midtrans_order_id` (for duplicate detection)
- `idx_webhooks_created` on `created_at` (for cleanup)

**Validation Rules**:
- `verified` must be true before `processed` can be true

---

### 5. `activity_logs`

Audit trail for all system actions (payment received, role assigned, manual intervention).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | UUID v4 |
| `subscription_id` | TEXT | FK → subscriptions.id, NULLABLE | Related subscription |
| `actor_type` | TEXT | NOT NULL | Actor: system/server_owner |
| `actor_id` | TEXT | NULLABLE | Actor ID (discord_user_id for server_owner) |
| `action` | TEXT | NOT NULL | Action type |
| `details` | JSON | NULLABLE | Additional context |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Action timestamp |

**Indexes**:
- `idx_activity_subscription` on `subscription_id` (for subscription history)
- `idx_activity_actor` on `(actor_type, actor_id)` (for audit queries)
- `idx_activity_created` on `created_at` (for time-range queries)

**Validation Rules**:
- `action` must be one of: 'payment_received', 'role_assigned', 'role_removed', 'manual_role_assigned', 'manual_role_removed', 'subscription_created', 'subscription_cancelled', 'email_verification_sent'

---

## Foreign Key Relationships

```sql
-- subscriptions → members
ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_member
FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE;

-- subscriptions → discord_servers
ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_server
FOREIGN KEY (server_id) REFERENCES discord_servers(id) ON DELETE CASCADE;

-- subscriptions → pricing_tiers
ALTER TABLE subscriptions
ADD CONSTRAINT fk_subscriptions_tier
FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id);

-- transactions → subscriptions
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_subscription
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE;

-- activity_logs → subscriptions
ALTER TABLE activity_logs
ADD CONSTRAINT fk_activity_subscription
FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL;
```

---

## Database Migrations

### Migration: `001_create_payment_subscription_tables.sql`

```sql
-- Members table (extends existing if needed)
CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  discord_user_id TEXT UNIQUE NOT NULL,
  discord_username TEXT NOT NULL,
  email TEXT UNIQUE,
  email_verified BOOLEAN DEFAULT false NOT NULL,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX idx_members_discord_id ON members(discord_user_id);
CREATE INDEX idx_members_email ON members(email);

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  server_id TEXT NOT NULL,
  tier_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Active', 'Pending', 'Expired', 'Cancelled', 'Failed')),
  start_date TEXT NOT NULL,
  expiry_date TEXT,
  last_payment_amount INTEGER,
  last_payment_date TEXT,
  grace_period_until TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  FOREIGN KEY (server_id) REFERENCES discord_servers(id) ON DELETE CASCADE,
  FOREIGN KEY (tier_id) REFERENCES pricing_tiers(id)
);

CREATE INDEX idx_subscriptions_member_server ON subscriptions(member_id, server_id);
CREATE UNIQUE INDEX idx_active_subscription ON subscriptions(member_id, server_id)
  WHERE status = 'Active';
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_expiry ON subscriptions(expiry_date);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  subscription_id TEXT NOT NULL,
  midtrans_order_id TEXT UNIQUE NOT NULL,
  midtrans_transaction_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'IDR' NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('Pending', 'Success', 'Failed', 'Refunded')),
  payment_method TEXT,
  payment_date TEXT,
  gross_amount INTEGER,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  updated_at TEXT DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);

CREATE INDEX idx_transactions_order_id ON transactions(midtrans_order_id);
CREATE INDEX idx_transactions_subscription ON transactions(subscription_id);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Webhook events table
CREATE TABLE IF NOT EXISTS webhook_events (
  id TEXT PRIMARY KEY,
  midtrans_order_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  signature TEXT NOT NULL,
  verified BOOLEAN NOT NULL,
  processed BOOLEAN DEFAULT false NOT NULL,
  processing_error TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL
);

CREATE INDEX idx_webhooks_order_id ON webhook_events(midtrans_order_id);
CREATE INDEX idx_webhooks_created ON webhook_events(created_at);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id TEXT PRIMARY KEY,
  subscription_id TEXT,
  actor_type TEXT NOT NULL CHECK(actor_type IN ('system', 'server_owner')),
  actor_id TEXT,
  action TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')) NOT NULL,
  FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL
);

CREATE INDEX idx_activity_subscription ON activity_logs(subscription_id);
CREATE INDEX idx_activity_actor ON activity_logs(actor_type, actor_id);
CREATE INDEX idx_activity_created ON activity_logs(created_at);
```

---

## Drizzle ORM Schema

```typescript
// packages/db/drizzle/schema/subscriptions.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';
import { members } from './members';
import { discordServers } from './discord-servers';
import { pricingTiers } from './pricing-tiers';

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  memberId: text('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
  serverId: text('server_id').notNull().references(() => discordServers.id, { onDelete: 'cascade' }),
  tierId: text('tier_id').notNull().references(() => pricingTiers.id),
  status: text('status').notNull(), // 'Active' | 'Pending' | 'Expired' | 'Cancelled' | 'Failed'
  startDate: integer('start_date', { mode: 'timestamp' }).notNull(),
  expiryDate: integer('expiry_date', { mode: 'timestamp' }),
  lastPaymentAmount: integer('last_payment_amount'),
  lastPaymentDate: integer('last_payment_date', { mode: 'timestamp' }),
  gracePeriodUntil: integer('grace_period_until', { mode: 'timestamp' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
});

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  member: one(members, {
    fields: [subscriptions.memberId],
    references: [members.id],
  }),
  server: one(discordServers, {
    fields: [subscriptions.serverId],
    references: [discordServers.id],
  }),
  tier: one(pricingTiers, {
    fields: [subscriptions.tierId],
    references: [pricingTiers.id],
  }),
  transactions: many(transactions),
  activityLogs: many(activityLogs),
}));

// Similar schema for transactions, webhookEvents, activityLogs...
```

---

## Summary

**Total Tables**: 5
**Total Relationships**: 7 foreign keys
**Total Indexes**: 17 (including unique constraints)

**Key Design Decisions**:
1. UUID v4 for all primary keys (distributed system compatibility)
2. Timestamps stored as Unix epoch (INTEGER) for Cloudflare D1 compatibility
3. Cascade deletion for data consistency
4. Unique constraint for one-active-subscription-per-member-per-server business rule
5. Audit trail (webhook_events, activity_logs) for compliance and debugging

**Next Step**: Generate API contracts (contracts/api.yaml, contracts/webhooks.yaml)
