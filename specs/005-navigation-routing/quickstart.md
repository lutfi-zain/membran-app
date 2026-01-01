# Quickstart: Navigation, Routing, and Onboarding Orchestration

**Feature**: 005-navigation-routing
**Date**: 2025-12-31

---

## Overview

This guide will help you set up and implement the navigation backbone for membran.app, including landing page, dashboard, onboarding orchestration, and route registration.

---

## Prerequisites

- **Feature 001 (Server Owner Auth)**: Authentication system functional
- **Feature 003 (Discord Bot Connection)**: Bot connection endpoints available
- **Feature 004 (Pricing Tier Configuration)**: Pricing tier endpoints available
- **Bun 1.x** runtime installed
- **Node modules** installed (`bun install` in repo root)

---

## Setup Steps

### Step 1: Generate and Apply Database Migration

```bash
# Navigate to API directory
cd apps/api

# Generate migration for onboarding_states table
bun run db:generate

# Apply migration locally (for development)
npx wrangler d1 migrations apply membran-db --local

# For production (when ready)
npx wrangler d1 migrations apply membran-db
```

**Expected Output**:
```
┌───────────────────────────────────────────────────┐
│ Pending migrations:                                │
│ ─────────────────────────────────────────────────  │
│ 0005_create_onboarding_states.sql                 │
└───────────────────────────────────────────────────┘

? Do you want to apply these migrations? yes
✅ 0005_create_onboarding_states.sql applied
```

---

### Step 2: Create Database Schema File

Create `packages/db/src/schema/onboarding-state.ts`:

```typescript
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

Update `packages/db/src/schema/index.ts` to export the new schema:

```typescript
export * from './onboarding-state';
```

---

### Step 3: Create Shared Types and Zod Schemas

Create `packages/shared/src/navigation.ts`:

```typescript
import { z } from 'zod';

// Types
export interface OnboardingState {
  id: string;
  userId: string;
  botConnected: boolean;
  pricingConfigured: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export type OnboardingStep = 'account' | 'bot' | 'pricing' | 'complete';

// Zod Schemas
export const OnboardingStateSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  botConnected: z.boolean(),
  pricingConfigured: z.boolean(),
  completedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
});

export const UpdateOnboardingStateSchema = z.object({
  botConnected: z.boolean().optional(),
  pricingConfigured: z.boolean().optional(),
}).refine(data => data.botConnected !== undefined || data.pricingConfigured !== undefined, {
  message: "At least one field must be provided",
});
```

---

### Step 4: Create API Endpoints

Create `apps/api/src/routes/onboarding.ts`:

```typescript
import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { sessionMiddleware } from '../middleware/session';
import { db } from '@membran-app/db';
import { onboardingStates } from '@membran-app/db/schema';
import { eq } from 'drizzle-orm';
import { UpdateOnboardingStateSchema } from '@membran-app/shared/navigation';

const app = new Hono();

// All routes require authentication
app.use('*', sessionMiddleware);

// GET /api/onboarding/state - Fetch onboarding state
app.get('/', async (c) => {
  const userId = c.get('user').id;

  let state = await db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.userId, userId),
  });

  // Auto-create if doesn't exist
  if (!state) {
    const now = Date.now();
    const newState = {
      id: crypto.randomUUID(),
      userId,
      botConnected: false,
      pricingConfigured: false,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };
    await db.insert(onboardingStates).values(newState);
    state = newState;
  }

  // Convert integer booleans to actual booleans
  return c.json({
    ...state,
    botConnected: Boolean(state.botConnected),
    pricingConfigured: Boolean(state.pricingConfigured),
  });
});

// PUT /api/onboarding/state - Update onboarding progress
app.put('/', zValidator('json', UpdateOnboardingStateSchema), async (c) => {
  const userId = c.get('user').id;
  const updates = c.req.valid('json');

  const now = Date.now();
  await db.update(onboardingStates)
    .set({
      ...(updates.botConnected !== undefined && { botConnected: updates.botConnected ? 1 : 0 }),
      ...(updates.pricingConfigured !== undefined && { pricingConfigured: updates.pricingConfigured ? 1 : 0 }),
      updatedAt: now,
    })
    .where(eq(onboardingStates.userId, userId));

  const state = await db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.userId, userId),
  });

  return c.json({
    ...state,
    botConnected: Boolean(state.botConnected),
    pricingConfigured: Boolean(state.pricingConfigured),
  });
});

// POST /api/onboarding/complete - Mark onboarding as complete
app.post('/', async (c) => {
  const userId = c.get('user').id;

  const state = await db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.userId, userId),
  });

  if (!state || !state.botConnected || !state.pricingConfigured) {
    return c.json({ error: 'ONBOARDING_INCOMPLETE', message: 'Cannot complete onboarding. Both bot connection and pricing configuration are required.' }, 400);
  }

  const now = Date.now();
  await db.update(onboardingStates)
    .set({ completedAt: now, updatedAt: now })
    .where(eq(onboardingStates.userId, userId));

  const updated = await db.query.onboardingStates.findFirst({
    where: eq(onboardingStates.userId, userId),
  });

  return c.json({
    ...updated,
    botConnected: Boolean(updated.botConnected),
    pricingConfigured: Boolean(updated.pricingConfigured),
  });
});

export default app;
```

Update `apps/api/src/index.ts` to register the router:

```typescript
import onboardingRouter from './routes/onboarding';

app.route('/api/onboarding', onboardingRouter);
```

---

### Step 5: Create Frontend Hooks

Create `apps/web/src/hooks/useOnboarding.ts`:

```typescript
import { useQuery } from '@tanstack/react-query';

export interface OnboardingState {
  id: string;
  userId: string;
  botConnected: boolean;
  pricingConfigured: boolean;
  completedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export function useOnboarding() {
  return useQuery<OnboardingState>({
    queryKey: ['onboarding', 'state'],
    queryFn: async () => {
      const res = await fetch('/api/onboarding/state');
      if (!res.ok) throw new Error('Failed to fetch onboarding state');
      return res.json();
    },
    staleTime: 30_000, // Revalidate every 30 seconds
    revalidateOnFocus: true,
    revalidateOnWindowFocus: true,
  });
}

export function useOnboardingProgress() {
  const { data } = useOnboarding();

  if (!data) {
    return {
      currentStep: 'account' as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: '/onboarding/bot',
    };
  }

  if (data.completedAt) {
    return {
      currentStep: 'complete' as const,
      isComplete: true,
      canAccessDashboard: true,
      nextStepRoute: '/dashboard',
    };
  }

  if (!data.botConnected) {
    return {
      currentStep: 'bot' as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: '/onboarding/bot',
    };
  }

  if (!data.pricingConfigured) {
    return {
      currentStep: 'pricing' as const,
      isComplete: false,
      canAccessDashboard: false,
      nextStepRoute: '/onboarding/pricing',
    };
  }

  // Both complete but not marked
  return {
    currentStep: 'complete' as const,
    isComplete: true,
    canAccessDashboard: true,
    nextStepRoute: '/dashboard',
  };
}
```

---

### Step 6: Create Navigation Components

Create `apps/web/src/components/navigation/LandingPage.tsx`:

```typescript
import { Link } from '@tanstack/react-router';

export function LandingPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full px-6 text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">Membran</h1>
        <p className="text-lg text-gray-600 mb-8">
          Monetize your Discord server with premium memberships and role automation
        </p>
        <div className="flex flex-col gap-4">
          <Link
            to="/signup"
            className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
          <Link
            to="/login"
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition"
          >
            Login
          </Link>
        </div>
      </div>
    </div>
  );
}
```

Create `apps/web/src/components/navigation/Dashboard.tsx`:

```typescript
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';

export function Dashboard() {
  const { data: botStatus } = useQuery({
    queryKey: ['bot', 'status'],
    queryFn: async () => {
      const res = await fetch('/api/bot/status');
      return res.json();
    },
  });

  const { data: tiers } = useQuery({
    queryKey: ['pricing', 'tiers'],
    queryFn: async () => {
      const res = await fetch('/api/pricing/tiers');
      return res.json();
    },
  });

  const status = botStatus?.botStatus || 'not_configured';
  const tierCount = tiers?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

        {/* Server Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Server Status</h2>
          <div className="flex items-center gap-3">
            <span className={`inline-block w-3 h-3 rounded-full ${
              status === 'connected' ? 'bg-green-500' :
              status === 'disconnected' ? 'bg-red-500' :
              'bg-gray-300'
            }`} />
            <span className="capitalize">{status === 'not_configured' ? 'Not Configured' : status}</span>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
          <div className="flex flex-col gap-3">
            <Link to="/settings/bot" className="text-blue-600 hover:underline">
              Manage Bot →
            </Link>
            <Link to="/settings/pricing" className="text-blue-600 hover:underline">
              Configure Pricing ({tierCount} tiers) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
```

---

### Step 7: Update Route Configuration

Update `apps/web/src/main.tsx` to add new routes:

```typescript
import { LandingPage } from './components/navigation/LandingPage';
import { Dashboard } from './components/navigation/Dashboard';
import SettingsPricingPage from './pages/settings/pricing';

// Create dashboard route
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  component: Dashboard,
});

// Create settings/pricing route
const settingsPricingRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings/pricing',
  component: SettingsPricingPage,
});

// Update index route to be auth-aware
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: LandingPage,
});

// Update settings route to redirect to /settings/bot
const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/settings',
  beforeLoad: async () => {
    throw redirect({ to: '/settings/bot' });
  },
});

// Add new routes to route tree
const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  signupRoute,
  dashboardRoute,      // NEW
  onboardingRoute,
  onboardingBotRoute,
  onboardingPricingRoute,
  forgotPasswordRoute,
  resetPasswordRoute,
  settingsRoute,       // UPDATED
  settingsBotRoute,
  settingsPricingRoute, // NEW
]);
```

---

### Step 8: Start Development Server

```bash
# In one terminal, start the API
cd apps/api
bun run dev

# In another terminal, start the web app
cd apps/web
bun run dev
```

**Expected URLs**:
- Landing page: http://localhost:5173/
- Dashboard: http://localhost:5173/dashboard (after login)
- Onboarding: http://localhost:5173/onboarding/bot

---

### Step 9: Test Navigation Flows

#### Test 1: Visitor → Signup → Onboarding

```bash
# 1. Visit http://localhost:5173/
# Expected: Landing page with "Start Free Trial" and "Login" buttons

# 2. Click "Start Free Trial"
# Expected: Redirect to /signup

# 3. Complete signup
# Expected: Redirect to /onboarding (which redirects to /onboarding/bot)

# 4. Complete bot connection
# Expected: Can proceed to /onboarding/pricing

# 5. Create pricing tier
# Expected: Can click "Complete Setup", redirects to /dashboard
```

#### Test 2: Protected Route Redirect

```bash
# 1. Logout (clear session cookie)
# 2. Visit http://localhost:5173/dashboard directly
# Expected: Redirect to /login?return=/dashboard

# 3. Login
# Expected: Redirect to /dashboard (honoring return URL)
```

#### Test 3: Resume Onboarding

```bash
# 1. Create a user, connect bot, but don't configure pricing
# 2. Logout
# 3. Login again
# Expected: Redirect to /onboarding/pricing (resume where left off)
```

---

## Troubleshooting

### Issue: Database migration fails

**Solution**: Ensure D1 database is created:
```bash
npx wrangler d1 create membran-db
# Copy the database ID to wrangler.toml
```

### Issue: Onboarding state not found (404)

**Solution**: API should auto-create onboarding state. Check if user record exists in users table.

### Issue: Routes return 404

**Solution**: Ensure all routes are added to the routeTree in main.tsx and the router is recreated.

### Issue: Auth check fails

**Solution**: Ensure session middleware is working (Feature 001 must be functional). Check session cookie is being sent.

---

## Next Steps

1. **Add E2E tests**: Create `tests/navigation.spec.ts` for Playwright testing
2. **Add progress indicator**: Create `OnboardingProgress` component for onboarding pages
3. **Add return URL handling**: Update login flow to honor `?return=` query parameter
4. **Deploy to staging**: Test with Cloudflare Pages and Workers

---

## Summary

After completing these steps, you should have:

- ✅ Landing page at `/` with CTAs
- ✅ Dashboard at `/dashboard` for authenticated users
- ✅ Onboarding flow orchestration with progress tracking
- ✅ All routes registered and protected
- ✅ API endpoints for onboarding state management
- ✅ Navigation between auth, bot, and pricing features
