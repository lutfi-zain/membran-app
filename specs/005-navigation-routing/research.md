# Research: Navigation, Routing, and Onboarding Orchestration

**Feature**: 005-navigation-routing
**Date**: 2025-12-31
**Status**: Complete

---

## Overview

This document captures research findings and technical decisions for implementing the navigation backbone of membran.app. The feature adds routing orchestration, onboarding state tracking, and navigation components to tie together existing features (auth, bot connection, pricing tiers).

---

## Key Technical Decisions

### 1. Router Strategy

**Decision**: Use existing TanStack Router v7 installation in apps/web/src/main.tsx

**Rationale**:
- Already integrated in the codebase (no new dependency)
- Type-safe routing with excellent TypeScript support
- Built-in `beforeLoad` guards for protected routes
- Support for route loaders and data dependencies
- Query parameter handling for return URLs

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| React Router v6 | Would require migration, less type safety out of the box |
| TanStack Router v6 | v7 already in project, upgrade path not needed |
| Custom routing solution | Reinventing the wheel, less maintainable |

---

### 2. Onboarding State Persistence

**Decision**: Store onboarding progress in Cloudflare D1 database (new `onboarding_states` table)

**Rationale**:
- Cross-session persistence (users can abandon and return)
- Multi-tab synchronization (state consistent across browser tabs)
- Integrates with existing Drizzle ORM pattern from Features 001-004
- Server-side verification (can't bypass onboarding via client manipulation)
- Supports future analytics (onboarding completion rates, drop-off points)

**Alternatives Considered**:
| Alternative | Rejected Because |
|-------------|------------------|
| Cloudflare KV | Eventually consistent, not ideal for critical user state |
| Session storage only | Lost on session expiry, poor UX for multi-session onboarding |
| Local storage | Not shared across tabs/devices, client-side only (security risk) |
| In-memory only | Lost on refresh, poor UX |

---

### 3. Route Protection Strategy

**Decision**: Client-side `beforeLoad` guards + server-side session verification

**Rationale**:
- TanStack Router's `beforeLoad` provides clean UX (instant redirect for unauthenticated users)
- Server-side verification via session middleware prevents bypass
- Dual-layer security: fast client feedback + robust server enforcement
- Reuses existing session middleware from Feature 001

**Implementation Pattern**:
```typescript
// Client-side (TanStack Router beforeLoad)
beforeLoad: async ({ location, context }) => {
  const isAuthenticated = await checkAuth();
  if (!isAuthenticated) {
    throw redirect({ to: '/login', search: { return: location.href } });
  }
}

// Server-side (Hono middleware on API endpoints)
app.use('/api/onboarding/*', sessionMiddleware);
```

---

### 4. Return URL Handling

**Decision**: Query parameter `?return=/dashboard` with whitelist validation

**Rationale**:
- Standard pattern for auth flows (works with OAuth from Feature 001)
- Preserved across login redirect
- Whitelist validation prevents open redirect vulnerabilities

**Security Considerations**:
- Validate return URLs against allowed routes (`/dashboard`, `/settings/*`, `/onboarding/*`)
- Reject external URLs and javascript: protocols
- Sanitize before redirect

---

### 5. Progress Indicator Component

**Decision**: Shared `OnboardingProgress` component with step enum

**Rationale**:
- Consistent UX across all onboarding pages
- Single source of truth for step definitions
- Reusable across `/onboarding`, `/onboarding/bot`, `/onboarding/pricing`
- Extensible for future onboarding steps

**Step Enum**:
```typescript
enum OnboardingStep {
  ACCOUNT = 'Account Confirmation',    // Implicit (completed via signup)
  BOT = 'Connect Bot',                  // /onboarding/bot
  PRICING = 'Configure Pricing',        // /onboarding/pricing
  COMPLETE = 'Complete'                 // Redirects to /dashboard
}
```

---

## Integration with Existing Features

### Feature 001: Server Owner Auth

**Integration Points**:
- Reuse `useAuth` hook for auth state detection
- Leverage session middleware for server-side route protection
- Login endpoint (POST /api/auth/login) returns user with onboarding_state relation
- Signup endpoint (POST /api/auth/signup) creates initial onboarding_state record

**Dependencies**:
- `apps/web/src/hooks/useAuth.ts` (existing)
- `apps/api/src/middleware/session.ts` (existing)
- `packages/db/src/schema/users.ts` (existing, to be extended with onboarding_state relation)

---

### Feature 003: Discord Bot Connection

**Integration Points**:
- Bot connection success (POST /api/bot/callback) auto-updates onboarding_state.bot_connected = true
- Bot status endpoint (GET /api/bot/status) queried to determine if step 2 is complete
- Dashboard displays bot connection status from this feature

**Dependencies**:
- `apps/api/src/routes/bot.ts` (existing, to be extended with onboarding state update)
- `apps/web/src/components/bot/ConnectionStatus.tsx` (existing, reused in dashboard)

---

### Feature 004: Pricing Tier Configuration

**Integration Points**:
- Pricing tier creation (POST /api/pricing/tiers) auto-updates onboarding_state.pricing_configured = true
- Tier list endpoint (GET /api/pricing/tiers) queried to determine if step 3 is complete
- Dashboard provides quick link to pricing settings

**Dependencies**:
- `apps/api/src/routes/pricing.ts` (existing, to be extended with onboarding state update)
- `apps/web/src/pages/settings/pricing.tsx` (existing, to be registered as route)

---

## Best Practices Research

### TanStack Router Patterns

**Route Guards**:
```typescript
// Protected route pattern
const protectedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  beforeLoad: async ({ location, context }) => {
    const session = await context.getSession();
    if (!session) {
      throw redirect({
        to: '/login',
        search: { return: location.href }
      });
    }
  },
  component: DashboardPage,
});
```

**Route Loaders for Data Fetching**:
```typescript
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/dashboard',
  loader: async ({ context }) => {
    const [onboardingState, botStatus] = await Promise.all([
      context.fetch('/api/onboarding/state').then(r => r.json()),
      context.fetch('/api/bot/status').then(r => r.json()),
    ]);
    return { onboardingState, botStatus };
  },
  component: DashboardPage,
});
```

---

### Onboarding State Machine

**States**:
1. **Not Started**: `bot_connected=false`, `pricing_configured=false`, `completed_at=null`
2. **Bot Connected**: `bot_connected=true`, `pricing_configured=false`, `completed_at=null`
3. **Pricing Configured**: `bot_connected=true`, `pricing_configured=true`, `completed_at=null`
4. **Complete**: `bot_connected=true`, `pricing_configured=true`, `completed_at=<timestamp>`

**Transitions**:
- Not Started → Bot Connected: Bot callback succeeds
- Bot Connected → Pricing Configured: First pricing tier created
- Pricing Configured → Complete: User clicks "Complete Setup" OR auto-complete on both flags true

**Rollback Scenarios**:
- Bot removed from Discord: `bot_connected=false`, `completed_at=null` (return to step 2)
- All pricing tiers deleted: `pricing_configured=false`, keep `completed_at` (can still access dashboard, warned to configure pricing)

---

### Testing Strategy for Navigation

**E2E Test Scenarios** (Playwright):
1. **Visitor → Signup**: Landing page → click "Start Free Trial" → redirect to /signup
2. **Visitor → Login**: Landing page → click "Login" → redirect to /login
3. **Authenticated visitor → Dashboard**: Visit `/` → auto-redirect to `/dashboard`
4. **Unauthenticated → Protected**: Direct visit `/dashboard` → redirect to `/login?return=/dashboard`
5. **Onboarding Flow**: Signup → /onboarding → step indicators → complete → dashboard
6. **Resume Onboarding**: Partially onboarded user logs in → redirect to incomplete step
7. **Return URL**: Visit protected URL → login → redirect back to original URL

**Unit Test Scenarios**:
- `useNavigationGuard` returns correct redirect targets
- Onboarding state calculations (isComplete, getNextStep)
- Return URL validation (whitelist check, sanitization)

---

## Technology Stack Confirmation

| Component | Technology | Version |
|-----------|------------|---------|
| Frontend Framework | React | 18 |
| Router | TanStack Router | v7 (already in project) |
| State Management | TanStack Query | (already in project) |
| Backend Framework | Hono | (already in project) |
| Database | Cloudflare D1 (SQLite) | (already in project) |
| ORM | Drizzle | (already in project) |
| Type Validation | Zod | (already in project) |
| Testing | Playwright | (already configured) |
| Runtime | Bun | 1.x (already in project) |

**No new dependencies required.**

---

## Performance Considerations

### Landing Page Load Time (<2s target)

**Optimizations**:
- Minimal component bundle (LandingPage is simple static content)
- Lazy load non-critical assets (images, icons)
- CDN caching for static assets
- Preload signup/login pages on hover

### Dashboard Load Time (<2s target)

**Optimizations**:
- Parallel data fetching (onboarding state + bot status in same loader)
- TanStack Query caching (revalidate on focus, not on every mount)
- Optimistic updates for UI responsiveness

### Route Transition (<100ms target)

**Optimizations**:
- TanStack Router's client-side routing (no full page reload)
- Code splitting for route-specific components
- Prefetch likely next routes (hover over links)

---

## Security Considerations

### Return URL Validation

**Whitelist Approach**:
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

function validateReturnUrl(url: string): boolean {
  const parsed = new URL(url, window.location.origin);
  return ALLOWED_RETURN_PATHS.includes(parsed.pathname);
}
```

### Route Protection

- Client-side guards are UX conveniences, not security measures
- All protected API endpoints must verify server-side session
- Never rely on client-side state for authorization decisions

---

## Open Questions Resolved

### Q1: Should onboarding state be auto-created on signup?

**Answer**: Yes. Create `onboarding_states` record with all flags false during user registration.

**Rationale**: Simplifies state logic (no null checks), consistent with user record creation.

---

### Q2: Can users skip onboarding steps?

**Answer**: No. Bot connection and pricing configuration are both required for a functional server.

**Rationale**: Without bot, no role automation. Without pricing tiers, nothing to sell. Onboarding enforces minimum viable configuration.

---

### Q3: What happens if user completes steps out of order?

**Answer**: Steps are sequential in UI, but API allows out-of-order completion. Dashboard auto-redirects to first incomplete step.

**Rationale**: Handles edge cases (e.g., admin manually configures pricing for user). System is resilient to order.

---

### Q4: Should "Account Confirmation" be an explicit onboarding step?

**Answer**: No. Email verification is handled by Feature 002. Onboarding starts after account is created.

**Rationale**: Separation of concerns. Auth flow (Feature 001-002) vs. product setup (Feature 003-004).

---

## References

- [TanStack Router Documentation](https://tanstack.com/router/latest)
- [Hono Middleware Patterns](https://hono.dev/docs/middleware/basics)
- [Drizzle ORM Relations](https://orm.drizzle.team/docs/relations)
- [Cloudflare D1 Best Practices](https://developers.cloudflare.com/d1/)
