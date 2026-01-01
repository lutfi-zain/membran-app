# Navigation & Onboarding Contracts

**Feature**: 005-navigation-routing
**Date**: 2025-12-31

---

## Overview

This document defines the API contracts for onboarding state management and the frontend routing structure for the navigation feature.

---

## API Endpoints

### Base URL

```
/api/onboarding
```

### Authentication

All endpoints require authenticated session (session cookie from Feature 001).

---

### GET /api/onboarding/state

Fetch the current onboarding state for the authenticated user.

**Request**:

```http
GET /api/onboarding/state
Cookie: session=<session_token>
```

**Response** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "botConnected": true,
  "pricingConfigured": false,
  "completedAt": null,
  "createdAt": 1704067200000,
  "updatedAt": 1704153600000
}
```

**Response** (401 Unauthorized):

```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

**Response** (404 Not Found):

```json
{
  "error": "ONBOARDING_STATE_NOT_FOUND",
  "message": "Onboarding state not found for user. Auto-creating..."
}
```

*Note: If onboarding state doesn't exist (shouldn't happen in production), API will auto-create a default state.*

---

### PUT /api/onboarding/state

Update onboarding progress flags. Called automatically by bot connection and pricing tier creation endpoints.

**Request**:

```http
PUT /api/onboarding/state
Content-Type: application/json
Cookie: session=<session_token>

{
  "botConnected": true,
  "pricingConfigured": false
}
```

**Request Body Schema**:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `botConnected` | boolean | No | Set to `true` when bot is successfully connected |
| `pricingConfigured` | boolean | No | Set to `true` when first pricing tier is created |

*At least one field must be provided.*

**Response** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "botConnected": true,
  "pricingConfigured": false,
  "completedAt": null,
  "createdAt": 1704067200000,
  "updatedAt": 1704153600000
}
```

**Response** (400 Bad Request):

```json
{
  "error": "INVALID_INPUT",
  "message": "At least one field (botConnected or pricingConfigured) must be provided"
}
```

**Response** (401 Unauthorized):

```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

### POST /api/onboarding/complete

Mark onboarding as completed. Called when user clicks "Complete Setup" after finishing all steps.

**Request**:

```http
POST /api/onboarding/complete
Cookie: session=<session_token>
```

**Response** (200 OK):

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "userId": "550e8400-e29b-41d4-a716-446655440001",
  "botConnected": true,
  "pricingConfigured": true,
  "completedAt": 1704153600000,
  "createdAt": 1704067200000,
  "updatedAt": 1704153600000
}
```

**Response** (400 Bad Request):

```json
{
  "error": "ONBOARDING_INCOMPLETE",
  "message": "Cannot complete onboarding. Both bot connection and pricing configuration are required."
}
```

**Response** (401 Unauthorized):

```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## Frontend Routes

### Route Registry

| Route | Auth Required | Onboarding Required | Layout | Description |
|-------|---------------|---------------------|--------|-------------|
| `/` | No | No | Root | Public landing page (auth-aware redirect) |
| `/signup` | No | No | Root | User registration (Feature 001) |
| `/login` | No | No | Root | User login (Feature 001) |
| `/forgot-password` | No | No | Root | Password reset request (Feature 001) |
| `/reset-password` | No | No | Root | Password reset form (Feature 001) |
| `/dashboard` | **Yes** | **Yes** | Root | Authenticated dashboard hub (NEW) |
| `/onboarding` | **Yes** | No | Root | Onboarding entry point (redirects to current step) |
| `/onboarding/bot` | **Yes** | No | Root | Step 2: Connect Discord bot (Feature 003) |
| `/onboarding/pricing` | **Yes** | No | Root | Step 3: Configure pricing tiers (Feature 004) |
| `/settings` | **Yes** | **Yes** | Root | Redirects to `/settings/bot` (default tab) |
| `/settings/bot` | **Yes** | **Yes** | Root | Bot connection settings (Feature 003) |
| `/settings/pricing` | **Yes** | **Yes** | Root | Pricing tier settings (Feature 004, NEW route) |

### Route Behavior Specifications

#### `/` (Root Route)

**Behavior**:
- **Anonymous visitor**: Display LandingPage component with "Start Free Trial" and "Login" buttons
- **Authenticated user**: Redirect to `/dashboard`

**Component**: `apps/web/src/components/navigation/LandingPage.tsx`

**Redirect Logic**:
```typescript
beforeLoad: async ({ context }) => {
  const session = await context.getSession();
  if (session) {
    throw redirect({ to: '/dashboard' });
  }
}
```

---

#### `/dashboard`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/dashboard`
- **Authenticated, onboarding incomplete**: Redirect to appropriate onboarding step
- **Authenticated, onboarding complete**: Display Dashboard component

**Component**: `apps/web/src/components/navigation/Dashboard.tsx`

**Route Guard**:
```typescript
beforeLoad: async ({ location, context }) => {
  const session = await context.getSession();
  if (!session) {
    throw redirect({ to: '/login', search: { return: location.href } });
  }

  const onboardingState = await context.fetch('/api/onboarding/state').then(r => r.json());

  if (!onboardingState.completedAt) {
    if (!onboardingState.botConnected) {
      throw redirect({ to: '/onboarding/bot' });
    } else if (!onboardingState.pricingConfigured) {
      throw redirect({ to: '/onboarding/pricing' });
    }
  }
}
```

**Dashboard Content**:
- Server name (from Discord server info)
- Connection status badge (Connected / Disconnected / Not configured)
- Quick action buttons: "Manage Bot" → `/settings/bot`, "Configure Pricing" → `/settings/pricing`
- Summary of pricing tiers (count: N tiers configured)

---

#### `/onboarding`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/onboarding`
- **Authenticated, onboarding not started**: Redirect to `/onboarding/bot`
- **Authenticated, partial progress**: Redirect to first incomplete step
- **Authenticated, complete**: Redirect to `/dashboard`

**Redirect Logic**:
```typescript
beforeLoad: async ({ location, context }) => {
  const session = await context.getSession();
  if (!session) {
    throw redirect({ to: '/login', search: { return: location.href } });
  }

  const state = await context.fetch('/api/onboarding/state').then(r => r.json());

  if (state.completedAt) {
    throw redirect({ to: '/dashboard' });
  } else if (!state.botConnected) {
    throw redirect({ to: '/onboarding/bot' });
  } else if (!state.pricingConfigured) {
    throw redirect({ to: '/onboarding/pricing' });
  } else {
    // Both complete but not marked - edge case, mark complete and redirect
    await context.fetch('/api/onboarding/complete', { method: 'POST' });
    throw redirect({ to: '/dashboard' });
  }
}
```

---

#### `/onboarding/bot`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/onboarding/bot`
- **Authenticated, bot already connected**: Redirect to `/onboarding/pricing`
- **Authenticated, onboarding complete**: Redirect to `/dashboard`
- **Authenticated, bot not connected**: Display bot invitation page (Feature 003)

**Component**: `apps/web/src/pages/onboarding/bot/index.tsx` (existing, add progress indicator)

**Progress Indicator**: Shows 3 steps with current step highlighted

---

#### `/onboarding/pricing`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/onboarding/pricing`
- **Authenticated, bot not connected**: Redirect to `/onboarding/bot`
- **Authenticated, onboarding complete**: Redirect to `/dashboard`
- **Authenticated, bot connected, pricing not configured**: Display pricing configuration page (Feature 004)

**Component**: `apps/web/src/pages/onboarding/pricing/index.tsx` (existing, add progress indicator)

**Progress Indicator**: Shows 3 steps with current step highlighted

**"Complete Setup" Button**: Enabled when at least one pricing tier exists

---

#### `/settings`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/settings`
- **Authenticated**: Redirect to `/settings/bot` (default settings tab)

---

#### `/settings/bot`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/settings/bot`
- **Authenticated, onboarding incomplete**: Redirect to appropriate onboarding step
- **Authenticated, onboarding complete**: Display bot connection settings (Feature 003)

**Component**: `apps/web/src/pages/settings/bot.tsx` (existing)

**Navigation**: Includes "Back to Dashboard" link

---

#### `/settings/pricing`

**Behavior**:
- **Unauthenticated**: Redirect to `/login?return=/settings/pricing`
- **Authenticated, onboarding incomplete**: Redirect to appropriate onboarding step
- **Authenticated, onboarding complete**: Display pricing tier settings (Feature 004)

**Component**: `apps/web/src/pages/settings/pricing.tsx` (existing, NEW route registration)

**Navigation**: Includes "Back to Dashboard" link

---

## Shared Components

### OnboardingProgress

**Props**:

```typescript
interface OnboardingProgressProps {
  currentStep: 'account' | 'bot' | 'pricing' | 'complete';
}
```

**Display**:

```
┌─────────────────────────────────────────────────────────┐
│  Account Confirmation   Connect Bot   Configure Pricing │
│  ●───────○───────○         ○───────●───────○           │
│  Complete      Current      In Progress                │
└─────────────────────────────────────────────────────────┘
```

- Completed step: Filled circle (●)
- Current step: Larger circle with border (○→)
- Future step: Empty circle (○)

---

### BackLink

**Props**:

```typescript
interface BackLinkProps {
  href?: string;  // Defaults to '/dashboard'
  label?: string; // Defaults to 'Back to Dashboard'
}
```

**Display**:

```
← Back to Dashboard
```

---

## Error Handling

### 404 Not Found (Undefined Routes)

**Component**: `apps/web/src/components/NotFound.tsx` (NEW)

**Behavior**:
- Display user-friendly "Page not found" message
- Provide links: "Go to Dashboard" (if authenticated), "Go to Login" (if not)
- Log 404 to analytics

---

### Return URL Validation

**Whitelist**:

```typescript
const ALLOWED_RETURN_PATHS = [
  '/dashboard',
  '/onboarding',
  '/onboarding/bot',
  '/onboarding/pricing',
  '/settings',
  '/settings/bot',
  '/settings/pricing',
];

function isValidReturnUrl(url: string): boolean {
  try {
    const parsed = new URL(url, window.location.origin);
    // Must be same origin
    if (parsed.origin !== window.location.origin) return false;
    // Must be in whitelist
    return ALLOWED_RETURN_PATHS.some(path => parsed.pathname === path || parsed.pathname.startsWith(path + '/'));
  } catch {
    return false;
  }
}
```

**Validation Location**:
- Client-side: Before redirect in `beforeLoad`
- Server-side: In login endpoint return URL processing

---

## TypeScript Types

```typescript
// packages/shared/src/navigation.ts

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

export interface OnboardingProgress {
  currentStep: OnboardingStep;
  isComplete: boolean;
  canAccessDashboard: boolean;
  nextStepRoute: string;
}

export interface DashboardData {
  serverName: string | null;
  connectionStatus: 'connected' | 'disconnected' | 'not_configured';
  tierCount: number;
}
```

---

## Zod Schemas

```typescript
// packages/shared/src/navigation.ts

import { z } from 'zod';

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

export const CompleteOnboardingResponseSchema = OnboardingStateSchema;

export const ErrorResponseSchema = z.object({
  error: z.string(),
  message: z.string(),
});
```
