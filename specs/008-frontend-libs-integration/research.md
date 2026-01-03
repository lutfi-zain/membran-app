# Research: Frontend Libraries Integration

**Feature**: 008-frontend-libs-integration
**Date**: 2026-01-03
**Status**: Complete

## Overview

This document captures research findings for integrating shadcn/ui, Zod, and Zustand into the membran.app monorepo, covering best practices, installation patterns, configuration strategies, and integration with existing React 18 + Vite + Tailwind CSS setup.

---

## 1. shadcn/ui Component Library

### Decision: Use shadcn/ui CLI for component installation

**Rationale**: shadcn/ui is not a traditional npm package but a collection of copy-paste components. The official `shadcn-ui` CLI handles component installation, dependency management, and path configuration automatically.

**Implementation Pattern**:
```bash
# Initialize shadcn/ui
npx shadcn-ui@latest init

# Add individual components
npx shadcn-ui@latest add button
npx shadcn-ui@latest add input
npx shadcn-ui@latest add card
npx shadcn-ui@latest add dialog
# ... etc
```

### Component Selection Strategy

**Decision**: Install components incrementally based on feature needs rather than bulk installation

**Rationale**:
- Keeps bundle size minimal (tree-shaking works better)
- Avoids unused dependencies
- Aligns with incremental MVP approach from constitution

**Core Components for MVP** (Priority: P1):
- Button, Input, Label (form basics)
- Card (content containers)
- Dialog (modals)
- Form, FormField, FormItem (form structure)
- Select, Checkbox, RadioGroup (form controls)

**Additional Components** (P2-P3 as needed):
- Table, Tabs (data display)
- Toast, Alert (notifications)
- DropdownMenu, NavigationMenu (navigation)

### Theme Configuration

**Decision**: Use CSS variables with Tailwind CSS for theming

**Rationale**: shadcn/ui is built on Radix UI + Tailwind, using CSS variables for tokens (colors, spacing, radius) enables:
- Runtime theme switching (light/dark mode)
- Consistent theming across all components
- No build-time theme generation required

**Implementation**:
```typescript
// tailwind.config.ts
export default {
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        // ... additional tokens
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
    },
  },
}
```

### Accessibility Compliance

**Decision**: Radix UI primitives provide WCAG 2.1 AA compliance out of the box

**Rationale**: shadcn/ui is built on Radix UI, which implements:
- Keyboard navigation (Enter, Space, Arrow keys, Escape)
- ARIA attributes (roles, labels, descriptions)
- Focus management (auto-focus, focus trap)
- Screen reader announcements

**Verification**: E2E tests will verify keyboard navigation and ARIA attributes for all installed components.

---

## 2. Zod Validation Library

### Decision: Use Zod v3+ with TypeScript inference

**Rationale**:
- Zod 3.x has better TypeScript performance
- Automatic type inference from schemas reduces boilerplate
- Composable schemas align with DRY principles

**Installation**:
```bash
bun add zod
```

### Schema Organization Strategy

**Decision**: Co-locate schemas with feature code, export shared schemas from `packages/shared/src/schemas/`

**Rationale**:
- Feature-specific schemas stay close to usage (better discoverability)
- Shared schemas (auth, common types) exported from shared package
- Avoids circular dependencies in monorepo

**File Structure**:
```
packages/shared/src/schemas/
├── auth.ts          # loginSchema, registerSchema, sessionSchema
├── payments.ts      # paymentSchema, subscriptionSchema
├── subscription.ts  # tierSchema, planSchema
└── index.ts         # barrel export of all schemas
```

### Integration with React Hook Form

**Decision**: Use Zod with React Hook Form for form validation (when forms are implemented)

**Rationale**:
- React Hook Form is constitution-compliant (TypeScript + performance)
- Zod resolver provides type-safe form validation
- Reduces boilerplate compared to manual validation

**Pattern**:
```typescript
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const form = useForm({
  resolver: zodResolver(schema),
});
```

**Note**: React Hook Form integration is optional - Zod works standalone for API response validation.

### Error Message Handling

**Decision**: Use Zod's `map()` for custom error messages, support future i18n

**Rationale**:
- Default Zod errors are technical (e.g., "String must contain at least 8 characters")
- Custom messages are user-friendly (e.g., "Password must be at least 8 characters")
- Schema-level error handling allows for future i18n

**Implementation**:
```typescript
const passwordSchema = z.string()
  .min(8, { message: "Password must be at least 8 characters" })
  .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" });
```

---

## 3. Zustand State Management

### Decision: Use Zustand v4+ with TypeScript and DevTools middleware

**Rationale**:
- Zustand 4.x has better TypeScript support
- Smaller bundle size (1KB) vs Redux (5KB+) vs Context API (boilerplate)
- Simple API (no actions, no reducers) aligns with developer productivity goals

**Installation**:
```bash
bun add zustand
```

### Store Organization Strategy

**Decision**: Create separate stores per domain (auth, subscriptions, UI) rather than one large store

**Rationale**:
- Easier to locate state updates (domain boundaries)
- Reduces unnecessary re-renders (subscribers only re-render on relevant slice changes)
- Aligns with feature-scaling approach from constitution

**Store Structure**:
```
apps/web/src/stores/
├── auth.ts           # authentication state (user, session, loading)
├── subscriptions.ts  # subscription data (tiers, current sub)
└── ui.ts             # UI state (theme, sidebar, notifications)
```

### Persistence Middleware Configuration

**Decision**: Use zustandpersist for localStorage/sessionStorage persistence

**Rationale**:
- Preserves state across page refreshes (UX requirement: "previous UI state is preserved")
- Automatic hydration on app load
- Selective persistence (exclude sensitive data like tokens)

**Implementation**:
```typescript
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user) => set({ user }),
      setToken: (token) => set({ token }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user }), // Don't persist token
    }
  )
);
```

### DevTools Integration

**Decision**: Enable Zustand DevTools middleware in development only

**Rationale**:
- Essential for debugging state changes
- Time-travel debugging for state mutations
- No production bundle impact (tree-shaking removes dev code)

**Implementation**:
```typescript
import { devtools } from 'zustand/middleware';

export const useSubscriptionStore = create(
  devtools(
    (set) => ({
      subscriptions: [],
      addSubscription: (sub) => set((state) => ({
        subscriptions: [...state.subscriptions, sub]
      })),
    }),
    { name: 'SubscriptionStore' }
  )
);
```

---

## 4. Bundle Size Optimization

### Decision: Use tree-shaking and code-splitting to minimize bundle impact

**Rationale**: Spec requires build time increase <10s and bundle size <100KB gzipped for all three libraries

**Strategies**:

1. **Component-level imports** (shadcn):
   ```typescript
   // GOOD - tree-shakeable
   import { Button } from '@/components/ui/button';

   // BAD - imports entire library
   import * as UI from '@/components/ui';
   ```

2. **Zod schema splitting**:
   ```typescript
   // Import only required schemas
   import { loginSchema } from '@membran-app/shared/schemas/auth';
   ```

3. **Store lazy loading** (for less-frequently used stores):
   ```typescript
   // Lazy load subscription store only when needed
   const { useSubscriptionStore } = await import('@/stores/subscriptions');
   ```

### Bundle Size Targets (Estimated)

Based on typical library sizes:
- shadcn/ui (50 components): ~40KB gzipped (Radix UI primitives)
- Zod: ~12KB gzipped
- Zustand + middleware: ~3KB gzipped
- **Total**: ~55KB gzipped (well under 100KB target)

---

## 5. TypeScript Configuration

### Decision: Leverage path aliases for cleaner imports

**Rationale**:
- Improves developer experience (shorter imports)
- Enables consistent imports across monorepo
- Aligns with existing Turborepo conventions

**Configuration**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/stores/*": ["./src/stores/*"],
      "@membran-app/shared": ["../../packages/shared/src"]
    }
  }
}
```

---

## 6. Testing Strategy

### Decision: Use Vitest for unit tests + Playwright for E2E tests

**Rationale**:
- Vitest is faster than Jest for unit testing (Vite-native)
- Playwright is constitution-required for E2E
- Library-specific tests (validation, stores) use Vitest
- Component integration tests use Playwright

**Test Coverage Plan**:

**Unit Tests (Vitest)**:
- Zod schema validation tests
- Zustand store actions/selectors tests
- Utility function tests

**E2E Tests (Playwright)**:
- Component rendering tests (all shadcn components)
- Accessibility tests (keyboard nav, ARIA attributes)
- Form validation tests (Zod + components integration)
- State persistence tests (Zustand + localStorage)

---

## 7. Integration with Existing Codebase

### Constitution Compliance Check

**Testing Discipline**:
- ✅ E2E tests planned for components, validation, state
- ✅ Playwright for integration tests

**Security First**:
- ✅ Zod validates all API responses (prevents injection)
- ✅ No secrets in client state (Zustand stores exclude tokens from persistence)

**Type Safety**:
- ✅ TypeScript strict mode maintained
- ✅ Zod provides runtime type safety
- ✅ Zustand stores are fully typed

**User-Centric**:
- ✅ Incremental MVP (P1: components, P2: validation, P3: state)
- ✅ Accessibility via Radix primitives
- ✅ Clear validation messages via Zod

---

## 8. PRP Alignment Check

This feature supports multiple PRP checkpoints by:
- Improving developer productivity (Milestone: Infrastructure)
- Enabling type safety across frontend (Milestone: Type Safety)
- Providing accessibility compliance (Milestone: User Experience)

No specific PRP checkpoints are directly completed by this feature, but it enables faster delivery of future features.

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| shadcn Installation | CLI-based, incremental | Copy-paste model, bundle optimization |
| Theming | CSS variables + Tailwind | Runtime theme switching, consistency |
| Component Selection | MVP-first (P1: 10 components) | Incremental delivery, bundle control |
| Zod Organization | Co-locate + shared export | Feature proximity + DRY |
| Error Messages | Custom messages via `.map()` | User-friendly, future i18n support |
| Store Organization | Domain-separated | Easier location, targeted updates |
| Persistence | zustandpersist middleware | UX requirement (state preserved) |
| DevTools | Dev-only middleware | Debugging, no prod impact |
| Bundle Optimization | Tree-shaking + code-splitting | Meet <100KB target |

---

## Open Questions Resolved

All items from Technical Context have been resolved through research. No NEEDS CLARIFICATION markers remain.

**Next Phase**: Proceed to Phase 1 - Design & Contracts (quickstart.md only - no data-model or contracts for this frontend-only feature)
