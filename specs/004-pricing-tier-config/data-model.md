# Data Model: Pricing Tier Configuration

**Feature**: 004-pricing-tier-config
**Date**: 2025-12-31
**Phase**: Phase 1 - Design & Contracts

---

## Overview

This document defines the database schema for the pricing tier configuration feature. The schema extends the existing database with three new tables: `discord_roles`, `pricing_tiers`, and `tier_features`. A stub `subscriptions` table is also defined for future reference.

---

## Entity Relationship Diagram

```text
┌─────────────────────┐     ┌─────────────────────┐
│   discord_servers   │     │   discord_roles     │
├─────────────────────┤     ├─────────────────────┤
│ id (PK)             │<─┐──│ id (PK)             │
│ discord_id          │   │  │ discord_role_id     │
│ name                │   │  │ discord_server_id   │
│ bot_status          │   │  │ role_name           │
│ ...                 │   │  │ bot_can_manage      │
└─────────────────────┘   │  └─────────────────────┘
                          │
                          │  ┌─────────────────────┐
                          │  │   pricing_tiers     │
                          │  ├─────────────────────┤
                          └──│ id (PK)             │
                             │ discord_server_id   │
                             │ discord_role_id     │──┐
                             │ name                │  │
                             │ price_cents         │  │
                             │ duration            │  │
                             │ is_featured         │  │
                             │ is_active           │  │
                             │ display_order       │  │
                             │ version             │  │
                             │ ...                 │  │
                             └─────────────────────┘  │
                                                       │
                              ┌─────────────────────┐  │
                              │   tier_features     │  │
                              ├─────────────────────┤  │
                              │ id (PK)             │  │
                              │ tier_id             │<─┘
                              │ description         │
                              │ display_order       │
                              └─────────────────────┘
```

---

## Tables

### 1. discord_roles

Stores Discord roles synced from connected servers. Tracks which roles the bot can manage.

**Purpose**: Cache Discord roles for validation and selection during tier configuration.

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PRIMARY KEY | Unique identifier |
| `discord_server_id` | text | NOT NULL, FOREIGN KEY | Reference to discord_servers.id |
| `discord_role_id` | text | NOT NULL | Discord role snowflake ID |
| `role_name` | text | NOT NULL | Role name from Discord |
| `bot_can_manage` | integer | NOT NULL, DEFAULT 0 (boolean) | Whether bot has permission to manage this role |
| `position` | integer | NOT NULL, DEFAULT 0 | Discord role position (for ordering) |
| `color` | integer | NULL | Discord role color (decimal) |
| `hoist` | integer | NOT NULL, DEFAULT 0 (boolean) | Whether role is hoisted (displayed separately) |
| `permissions` | text | NULL | Comma-separated permission flags |
| `synced_at` | integer | timestamp | Last sync timestamp |
| `created_at` | integer | timestamp | Auto-generated |
| `updated_at` | integer | timestamp | Auto-generated |

**Indexes**:
- `UNIQUE(discord_server_id, discord_role_id)` - One record per role per server
- `INDEX(discord_server_id, bot_can_manage)` - For filtering manageable roles

**Relationships**:
- Belongs to: `discord_servers` (many-to-one)

**Validation Rules**:
- `discord_role_id` must be a valid Discord snowflake
- `bot_can_manage` is derived from bot's permissions relative to role's position

---

### 2. pricing_tiers

Stores subscription tier configurations for each server.

**Purpose**: Define what members can purchase, including price, duration, and linked Discord role.

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PRIMARY KEY | Unique identifier |
| `discord_server_id` | text | NOT NULL, FOREIGN KEY | Reference to discord_servers.id |
| `discord_role_id` | text | NULL, FOREIGN KEY | Reference to discord_roles.discord_role_id (nullable for graceful degradation) |
| `name` | text | NOT NULL | Tier display name (e.g., "Basic", "Premium") |
| `description` | text | NULL | Optional tier description |
| `price_cents` | integer | NOT NULL | Price in cents (0-99900 → $0-$999) |
| `currency` | text | NOT NULL, DEFAULT "USD" | Currency code (USD only for MVP) |
| `duration` | text | NOT NULL | Billing duration: "monthly", "yearly", "lifetime" |
| `is_featured` | integer | NOT NULL, DEFAULT 0 (boolean) | Whether this is the featured tier |
| `is_active` | integer | NOT NULL, DEFAULT 1 (boolean) | Whether tier is visible to new subscribers |
| `display_order` | integer | NOT NULL | Display position (10, 20, 30...) |
| `version` | integer | NOT NULL, DEFAULT 1 | Optimistic locking version |
| `needs_sync` | integer | NOT NULL, DEFAULT 0 (boolean) | Whether role validation needs retry |
| `created_at` | integer | timestamp | Auto-generated |
| `updated_at` | integer | timestamp | Auto-generated |

**Indexes**:
- `UNIQUE(discord_server_id, name)` - Tier names must be unique per server (case-insensitive via CHECK)
- `INDEX(discord_server_id, display_order)` - For listing tiers in order
- `UNIQUE(discord_server_id, is_featured) WHERE is_featured = 1` - At most one featured tier per server
- `INDEX(discord_server_id, is_active)` - For filtering active tiers

**Relationships**:
- Belongs to: `discord_servers` (many-to-one)
- Belongs to: `discord_roles` (many-to-one, optional)
- Has many: `tier_features` (one-to-many, cascade delete)
- Will have many: `subscriptions` (one-to-many, future feature)

**Validation Rules**:
- `price_cents` must be between 0 and 99900 (inclusive)
- `duration` must be one of: "monthly", "yearly", "lifetime"
- Maximum 5 active tiers per `discord_server_id` (application-level check)
- Minimum 1 active tier required before server can accept payments
- At most one tier with `is_featured = 1` per server

**Constraints**:
```sql
CHECK (price_cents >= 0 AND price_cents <= 99900)
CHECK (duration IN ('monthly', 'yearly', 'lifetime'))
CHECK (is_featured IN (0, 1))
CHECK (is_active IN (0, 1))
CHECK (display_order > 0)
```

---

### 3. tier_features

Stores individual feature descriptions for each tier.

**Purpose**: Define what benefits are included in each tier (0-20 features per tier).

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PRIMARY KEY | Unique identifier |
| `tier_id` | text | NOT NULL, FOREIGN KEY | Reference to pricing_tiers.id |
| `description` | text | NOT NULL | Feature description (max 200 chars) |
| `display_order` | integer | NOT NULL | Display position within tier (1-20) |
| `created_at` | integer | timestamp | Auto-generated |
| `updated_at` | integer | timestamp | Auto-generated |

**Indexes**:
- `INDEX(tier_id, display_order)` - For loading features in order
- `UNIQUE(tier_id, display_order)` - No duplicate order positions per tier

**Relationships**:
- Belongs to: `pricing_tiers` (many-to-one, cascade delete)

**Validation Rules**:
- `description` max 200 characters
- Maximum 20 features per `tier_id` (application-level check)
- `display_order` must be positive

**Constraints**:
```sql
CHECK (length(description) <= 200)
CHECK (display_order > 0 AND display_order <= 20)
```

---

### 4. subscriptions (Stub)

Placeholder for future subscription feature. Tier configuration references this for grandfathered pricing.

**Purpose**: Track member subscriptions with price paid at time of purchase.

| Column | Type | Attributes | Description |
|--------|------|------------|-------------|
| `id` | text | PRIMARY KEY | Unique identifier |
| `discord_server_id` | text | NOT NULL, FOREIGN KEY | Reference to discord_servers.id |
| `tier_id` | text | NOT NULL, FOREIGN KEY | Reference to pricing_tiers.id |
| `user_id` | text | NOT NULL, FOREIGN KEY | Reference to users.id |
| `discord_user_id` | text | NOT NULL | Discord user snowflake |
| `status` | text | NOT NULL | "active", "cancelled", "expired" |
| `price_paid_cents` | integer | NOT NULL | Price at subscription time (grandfathered) |
| `start_date` | integer | timestamp | Subscription start |
| `expiry_date` | integer | timestamp | Subscription expiry (null for lifetime) |
| `created_at` | integer | timestamp | Auto-generated |
| `updated_at` | integer | timestamp | Auto-generated |

**Note**: This table is defined for reference only. Implementation is in a future feature.

---

## Drizzle Schema Definitions

### discord_roles.ts

```typescript
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { discordServers } from "./discord-servers";

export const discordRoles = sqliteTable("discord_roles", {
  id: text("id").primaryKey(),
  discordServerId: text("discord_server_id")
    .notNull()
    .references(() => discordServers.id, { onDelete: "cascade" }),
  discordRoleId: text("discord_role_id").notNull(),
  roleName: text("role_name").notNull(),
  botCanManage: integer("bot_can_manage", { mode: "boolean" })
    .notNull()
    .default(false),
  position: integer("position").notNull().default(0),
  color: integer("color"),
  hoist: integer("hoist", { mode: "boolean" }).notNull().default(false),
  permissions: text("permissions"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  uniqueServerRole: unique("unique_server_role").on(table.discordServerId, table.discordRoleId),
  serverManageableIdx: index("server_manageable_idx").on(table.discordServerId, table.botCanManage),
}));

export const discordRolesRelations = relations(discordRoles, ({ one }) => ({
  discordServer: one(discordServers, {
    fields: [discordRoles.discordServerId],
    references: [discordServers.id],
  }),
}));

export type DiscordRole = typeof discordRoles.$inferSelect;
export type NewDiscordRole = typeof discordRoles.$inferInsert;
```

### pricing_tiers.ts

```typescript
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { discordServers } from "./discord-servers";
import { discordRoles } from "./discord-roles";

export const pricingTiers = sqliteTable("pricing_tiers", {
  id: text("id").primaryKey(),
  discordServerId: text("discord_server_id")
    .notNull()
    .references(() => discordServers.id, { onDelete: "cascade" }),
  discordRoleId: text("discord_role_id").references(() => discordRoles.discordRoleId),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  duration: text("duration", { enum: ["monthly", "yearly", "lifetime"] }).notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  displayOrder: integer("display_order").notNull(),
  version: integer("version").notNull().default(1),
  needsSync: integer("needs_sync", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  uniqueServerName: unique("unique_server_name").on(table.discordServerId, table.name),
  serverOrderIdx: index("server_order_idx").on(table.discordServerId, table.displayOrder),
  serverActiveIdx: index("server_active_idx").on(table.discordServerId, table.isActive),
  featuredIdx: unique("featured_idx").on(table.discordServerId).where(sql`is_featured = 1`),
}));

export const pricingTiersRelations = relations(pricingTiers, ({ one, many }) => ({
  discordServer: one(discordServers, {
    fields: [pricingTiers.discordServerId],
    references: [discordServers.id],
  }),
  discordRole: one(discordRoles, {
    fields: [pricingTiers.discordRoleId],
    references: [discordRoles.discordRoleId],
  }),
  features: many(tierFeatures),
}));

export type PricingTier = typeof pricingTiers.$inferSelect;
export type NewPricingTier = typeof pricingTiers.$inferInsert;
```

### tier_features.ts

```typescript
import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { pricingTiers } from "./pricing-tiers";

export const tierFeatures = sqliteTable("tier_features", {
  id: text("id").primaryKey(),
  tierId: text("tier_id")
    .notNull()
    .references(() => pricingTiers.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  displayOrder: integer("display_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  tierOrderIdx: index("tier_order_idx").on(table.tierId, table.displayOrder),
  uniqueTierOrder: unique("unique_tier_order").on(table.tierId, table.displayOrder),
}));

export const tierFeaturesRelations = relations(tierFeatures, ({ one }) => ({
  tier: one(pricingTiers, {
    fields: [tierFeatures.tierId],
    references: [pricingTiers.id],
  }),
}));

export type TierFeature = typeof tierFeatures.$inferSelect;
export type NewTierFeature = typeof tierFeatures.$inferInsert;
```

---

## State Transitions

### Tier Lifecycle

```
┌─────────┐  create   ┌──────────┐  delete   ┌──────────┐
│  None   │──────────>│  Active  │──────────>│ Inactive│
└─────────┘           └──────────┘           └──────────┘
                           │                       │
                           │ edit                  │ delete
                           ▼                       ▼
                      ┌──────────┐           ┌──────────┐
                      │  Active  │           │ Deleted  │
                      │(updated) │           │(hard del)│
                      └──────────┘           └──────────┘

Legend:
  Active   = is_active = 1 (visible to new subscribers)
  Inactive = is_active = 0 (hidden from new, existing subscribers keep access)
  Deleted  = Record removed from database (only if no active subscribers)
```

**Transitions**:
1. **Create**: New tier starts as Active
2. **Edit**: Update any field, increment `version`
3. **Soft Delete**: Set `is_active = 0` if active subscribers exist
4. **Hard Delete**: Remove record if no subscribers
5. **Reactivate**: Set `is_active = 1` (optional, not in spec)

---

## Query Patterns

### Common Queries

```sql
-- Get all active tiers for a server, ordered
SELECT * FROM pricing_tiers
WHERE discord_server_id = ? AND is_active = 1
ORDER BY display_order ASC;

-- Get featured tier for a server
SELECT * FROM pricing_tiers
WHERE discord_server_id = ? AND is_featured = 1 AND is_active = 1
LIMIT 1;

-- Get tier with features
SELECT pt.*, tf.id as feature_id, tf.description, tf.display_order as feature_order
FROM pricing_tiers pt
LEFT JOIN tier_features tf ON pt.id = tf.tier_id
WHERE pt.id = ?
ORDER BY tf.display_order ASC;

-- Count tiers per server (for limit validation)
SELECT COUNT(*) as tier_count
FROM pricing_tiers
WHERE discord_server_id = ? AND is_active = 1;

-- Get manageable roles for a server
SELECT * FROM discord_roles
WHERE discord_server_id = ? AND bot_can_manage = 1
ORDER BY position ASC;

-- Optimistic locking update
UPDATE pricing_tiers
SET name = ?, price_cents = ?, version = version + 1, updated_at = strftime('%s', 'now')
WHERE id = ? AND version = ?
RETURNING *;
```

---

## Migration Strategy

### New Tables

```sql
-- Migration: 004_create_pricing_tiers.sql
CREATE TABLE discord_roles (
  id TEXT PRIMARY KEY,
  discord_server_id TEXT NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  discord_role_id TEXT NOT NULL,
  role_name TEXT NOT NULL,
  bot_can_manage INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  color INTEGER,
  hoist INTEGER NOT NULL DEFAULT 0,
  permissions TEXT,
  synced_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  UNIQUE(discord_server_id, discord_role_id)
);

CREATE INDEX idx_discord_roles_server_manageable ON discord_roles(discord_server_id, bot_can_manage);

CREATE TABLE pricing_tiers (
  id TEXT PRIMARY KEY,
  discord_server_id TEXT NOT NULL REFERENCES discord_servers(id) ON DELETE CASCADE,
  discord_role_id TEXT REFERENCES discord_roles(discord_role_id),
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  duration TEXT NOT NULL,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  display_order INTEGER NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  needs_sync INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  CHECK (price_cents >= 0 AND price_cents <= 99900),
  CHECK (duration IN ('monthly', 'yearly', 'lifetime')),
  UNIQUE(discord_server_id, name)
);

CREATE INDEX idx_pricing_tiers_server_order ON pricing_tiers(discord_server_id, display_order);
CREATE INDEX idx_pricing_tiers_server_active ON pricing_tiers(discord_server_id, is_active);
CREATE UNIQUE INDEX idx_pricing_tiers_featured ON pricing_tiers(discord_server_id) WHERE is_featured = 1;

CREATE TABLE tier_features (
  id TEXT PRIMARY KEY,
  tier_id TEXT NOT NULL REFERENCES pricing_tiers(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  updated_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
  CHECK (length(description) <= 200),
  UNIQUE(tier_id, display_order)
);

CREATE INDEX idx_tier_features_tier_order ON tier_features(tier_id, display_order);
```

---

## Summary

The data model introduces three new tables:
1. **discord_roles** - Cache of Discord roles with manageability flags
2. **pricing_tiers** - Subscription tier configurations with optimistic locking
3. **tier_features** - Individual tier benefits (0-20 per tier)

Key design decisions:
- Integer cents for price storage (avoids floating-point issues)
- Soft delete (`is_active`) for subscriber preservation
- Optimistic locking (`version`) for concurrent edit detection
- Separate features table for structured benefit lists
- Unique constraints for business rules (tier names, featured tier)
