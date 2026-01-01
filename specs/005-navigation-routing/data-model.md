# Data Model: Navigation, Routing, and Onboarding Orchestration

**Feature**: 005-navigation-routing
**Date**: 2025-12-31
**Status**: Final

---

## Overview

This feature introduces one new database table to track onboarding progress for server owners. The onboarding state determines which routes users can access and where they are redirected during the onboarding flow.

---

## New Table: onboarding_states

### Purpose

Track the progress of each server owner through the 3-step onboarding flow (Account Confirmation → Connect Bot → Configure Pricing).

### Schema

```sql
CREATE TABLE onboarding_states (
  id TEXT PRIMARY KEY,                    -- UUID v4
  user_id TEXT NOT NULL UNIQUE,           -- Foreign key to users.id
  bot_connected INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = false, 1 = true
  pricing_configured INTEGER NOT NULL DEFAULT 0, -- Boolean: 0 = false, 1 = true
  completed_at INTEGER,                   -- Unix timestamp (ms) or NULL
  created_at INTEGER NOT NULL,            -- Unix timestamp (ms)
  updated_at INTEGER NOT NULL             -- Unix timestamp (ms)
);

CREATE INDEX idx_onboarding_states_user_id ON onboarding_states(user_id);
```

### Drizzle Schema

```typescript
// packages/db/src/schema/onboarding-state.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { users } from './users';
import { relations } from 'drizzle-orm';

export const onboardingStates = sqliteTable('onboarding_states', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  botConnected: integer('bot_connected').notNull().default(0),
  pricingConfigured: integer('pricing_configured').notNull().default(0),
  completedAt: integer('completed_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const onboardingStatesRelations = relations(onboardingStates, ({ one }) => ({
  user: one(users, {
    fields: [onboardingStates.userId],
    references: [users.id],
  }),
}));
```

### Column Descriptions

| Column | Type | Description |
|--------|------|-------------|
| `id` | TEXT (UUID) | Primary key, uniquely identifies this onboarding state record |
| `user_id` | TEXT (FK) | Foreign key to `users.id`, one-to-one relationship (each user has one onboarding state) |
| `bot_connected` | INTEGER (Boolean) | `1` if Discord bot has been successfully connected, `0` otherwise |
| `pricing_configured` | INTEGER (Boolean) | `1` if at least one pricing tier has been created, `0` otherwise |
| `completed_at` | INTEGER (Timestamp) | Unix timestamp in milliseconds when onboarding was marked complete, or `NULL` if incomplete |
| `created_at` | INTEGER (Timestamp) | Unix timestamp in milliseconds when the record was created |
| `updated_at` | INTEGER (Timestamp) | Unix timestamp in milliseconds when the record was last updated |

---

## State Machine

### Onboarding Progression

```
┌─────────────────────────────────────────────────────────────────┐
│                        Onboarding Flow                          │
└─────────────────────────────────────────────────────────────────┘

   Step 1: Account Confirmation (Implicit via Feature 001-002)
   ┌─────────────────────┐
   │   bot_connected=0   │
   │ pricing_configured=0│
   │   completed_at=NULL │
   └─────────┬───────────┘
             │
             │ User clicks "Invite Bot" in /onboarding/bot
             │ Bot callback succeeds
             ▼
   Step 2: Connect Bot (Feature 003)
   ┌─────────────────────┐
   │   bot_connected=1   │  ← First milestone
   │ pricing_configured=0│
   │   completed_at=NULL │
   └─────────┬───────────┘
             │
             │ User creates first pricing tier in /onboarding/pricing
             ▼
   Step 3: Configure Pricing (Feature 004)
   ┌─────────────────────┐
   │   bot_connected=1   │
   │ pricing_configured=1│  ← Second milestone
   │   completed_at=NULL │
   └─────────┬───────────┘
             │
             │ User clicks "Complete Setup" OR auto-complete
             ▼
   Step 4: Complete (Dashboard Access)
   ┌─────────────────────┐
   │   bot_connected=1   │
   │ pricing_configured=1│
   │ completed_at=<ts>   │  ← Third milestone (onboarding done)
   └─────────────────────┘
             │
             ▼
      Redirect to /dashboard
```

### Rollback Scenarios

| Event | State Change | Behavior |
|-------|--------------|----------|
| Bot removed from Discord server | `bot_connected=0`, `completed_at=NULL` | User redirected to `/onboarding/bot` on next visit |
| All pricing tiers deleted | `pricing_configured=0`, `completed_at` stays set | User warned on dashboard, pricing remains accessible |

### Redirect Logic

| Current State | User Visits | Redirect To |
|---------------|-------------|-------------|
| Any | `/` (not authenticated) | Stay on landing page |
| Any | `/` (authenticated) | `/dashboard` (which may redirect to onboarding if incomplete) |
| `bot_connected=0`, `pricing_configured=0` | `/dashboard` | `/onboarding/bot` |
| `bot_connected=1`, `pricing_configured=0` | `/dashboard` | `/onboarding/pricing` |
| `bot_connected=0`, `pricing_configured=1` | `/dashboard` | `/onboarding/bot` (edge case: pricing configured via admin) |
| `bot_connected=1`, `pricing_configured=1`, `completed_at=NULL` | `/dashboard` | `/dashboard` (onboarding complete, mark completed) |
| `completed_at=<ts>` | Any onboarding route | `/dashboard` |

---

## Extended Entity: users

### Existing Table Modification

The `users` table (from Feature 001) will be extended with a relation to `onboarding_states`.

**No schema changes required** - the relation is virtual (defined in Drizzle ORM relations, not as a database column).

### Drizzle Relation Update

```typescript
// packages/db/src/schema/users.ts (existing file, add relation)

import { onboardingStates } from './onboarding-state';

export const usersRelations = relations(users, ({ one }) => ({
  // ... existing relations ...
  onboardingState: one(onboardingStates, {
    fields: [onboardingStates.userId],
    references: [users.id],
  }),
}));
```

---

## TypeScript Types

### OnboardingState Type

```typescript
// packages/shared/src/navigation.ts

export interface OnboardingState {
  id: string;
  userId: string;
  botConnected: boolean;
  pricingConfigured: boolean;
  completedAt: number | null;  // Unix timestamp in milliseconds or null
  createdAt: number;
  updatedAt: number;
}

export type OnboardingStep = 'account' | 'bot' | 'pricing' | 'complete';

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  isComplete: boolean;
  canAccessDashboard: boolean;
  nextStepRoute: string;
}
```

---

## Zod Validation Schemas

```typescript
// packages/shared/src/navigation.ts

import { z } from 'zod';

export const OnboardingStateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  botConnected: z.boolean(),
  pricingConfigured: z.boolean(),
  completedAt: z.number().nullable(),  // Unix timestamp in milliseconds
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const UpdateOnboardingStateSchema = z.object({
  botConnected: z.boolean().optional(),
  pricingConfigured: z.boolean().optional(),
});

export const CompleteOnboardingSchema = z.object({
  // No body required, just authenticated request
});
```

---

## Migration

### Filename

`0005_create_onboarding_states.sql`

### SQL Content

```sql
-- Migration: Create onboarding_states table
-- Feature: 005-navigation-routing
-- Date: 2025-12-31

CREATE TABLE onboarding_states (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  bot_connected INTEGER NOT NULL DEFAULT 0,
  pricing_configured INTEGER NOT NULL DEFAULT 0,
  completed_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_onboarding_states_user_id ON onboarding_states(user_id);

-- Insert trigger for automatic timestamp management
CREATE TRIGGER update_onboarding_states_timestamp
AFTER UPDATE ON onboarding_states
FOR EACH ROW
BEGIN
  UPDATE onboarding_states SET updated_at = (strftime('%s', 'now') * 1000)
  WHERE id = NEW.id;
END;
```

---

## Database Operations

### Create Onboarding State (called during user registration)

```typescript
import { db } from '@membran-app/db';
import { onboardingStates } from '@membran-app/db/schema';
import { generateId } from '@membran-app/shared/lib/id';

async function createOnboardingState(userId: string) {
  const now = Date.now();
  const state = {
    id: generateId(),
    userId,
    botConnected: false,
    pricingConfigured: false,
    completedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(onboardingStates).values(state);
  return state;
}
```

### Get Onboarding State by User ID

```typescript
async function getOnboardingState(userId: string) {
  const state = await db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.userId, userId),
  });
  return state;
}
```

### Update Onboarding State (called after bot connection or pricing tier creation)

```typescript
async function updateOnboardingState(
  userId: string,
  updates: { botConnected?: boolean; pricingConfigured?: boolean }
) {
  const now = Date.now();
  await db.update(onboardingStates)
    .set({
      ...updates,
      updatedAt: now,
    })
    .where(eq(onboardingStates.userId, userId));
}
```

### Complete Onboarding (called when user clicks "Complete Setup")

```typescript
async function completeOnboarding(userId: string) {
  const now = Date.now();
  await db.update(onboardingStates)
    .set({
      completedAt: now,
      updatedAt: now,
    })
    .where(eq(onboardingStates.userId, userId));
}
```

---

## Indexes and Performance

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `PRIMARY` | `id` | Primary key lookup |
| `idx_onboarding_states_user_id` | `user_id` | Fast lookup by user ID (unique constraint) |

### Query Patterns

| Query | Index Used | Frequency |
|-------|------------|-----------|
| Get by user ID | `idx_onboarding_states_user_id` | Very high (every page load for auth users) |
| Update by user ID | `idx_onboarding_states_user_id` | High (after bot connection, tier creation) |

---

## Constraints and Validations

### Database Constraints

| Constraint | Rule | Enforcement |
|------------|------|--------------|
| Primary Key | `id` is unique | Database level |
| Foreign Key | `user_id` references `users.id` | Database level (CASCADE delete) |
| Unique | `user_id` is unique (one-to-one) | Database level |
| Not Null | All columns except `completed_at` | Database level |
| Default | `bot_connected=0`, `pricing_configured=0` | Database level |

### Application Validations

| Validation | Rule | Layer |
|------------|------|-------|
| User must exist | `user_id` must reference valid user | API layer (before insert) |
| Completion requires both steps | `completed_at` only set if `bot_connected=true` AND `pricing_configured=true` | API layer (on update) |
| Timestamps | Must be valid Unix timestamps | Zod schema validation |
