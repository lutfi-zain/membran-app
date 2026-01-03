# Implementation Plan: Frontend Libraries Integration

**Branch**: `008-frontend-libs-integration` | **Date**: 2026-01-03 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-frontend-libs-integration/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Integrate three frontend libraries into the membran.app monorepo: shadcn/ui (component library), Zod (validation), and Zustand (state management). This feature improves developer productivity by 50%, ensures WCAG 2.1 AA accessibility compliance, reduces prop drilling through centralized state, and provides runtime type validation. The integration requires no database changes and operates entirely within the frontend application layer.

## Technical Context

**Language/Version**: TypeScript 5.x on Bun 1.x

**Primary Dependencies**:
- shadcn/ui (Radix UI primitives + Tailwind CSS)
- Zod (validation library)
- Zustand (state management)
- Existing: React 18, Vite, TanStack Router, Tailwind CSS

**Storage**: N/A (frontend infrastructure feature - uses existing application data)

**Testing**: Playwright for E2E testing (component rendering, state updates, validation), Vitest for unit testing

**Target Platform**: Cloudflare Pages (frontend web app), modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)

**Project Type**: Monorepo (apps/web, packages/shared)

**Performance Goals**:
- Build time increase: <10 seconds
- Component render time: <16ms (60fps target)
- State update latency: <50ms for store updates
- Bundle size increase: <100KB gzipped for all three libraries

**Constraints**:
- Tree-shaking required to minimize bundle impact
- Must maintain TypeScript strict mode compatibility
- No SSR (Client-side rendering only per project constraints)
- Must respect existing Tailwind CSS configuration
- State persistence limited to localStorage/sessionStorage (5-10MB limit)

**Scale/Scope**:
- Target: ~50 UI components from shadcn initially
- Validation schemas: ~20-30 schemas for auth, payments, profiles
- State stores: 3-5 stores (auth, subscriptions, UI preferences, etc.)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Required Constitution Compliance

- [x] **Testing Discipline (NON-NEGOTIABLE)**: E2E tests MUST be planned for each implementation phase
  - [x] Frontend: Playwright tests for component rendering, form validation, state updates
  - [ ] Backend: N/A (frontend-only feature)
  - [x] Integration: Tests covering frontend-frontend library integration (T037, T049, T052)
- [x] **Security First**: Input validation via Zod schemas, no secret exposure in client state
- [x] **Type Safety**: TypeScript strict mode, Zod for runtime validation of API responses, Zustand with TypeScript support
- [x] **API-First Design**: N/A (frontend infrastructure - no new API endpoints)
- [x] **User-Centric Development**: Incremental value (P1: components, P2: validation, P3: state), accessibility via shadcn/Radix, clear feedback via validation messages

### E2E Testing Gate

Each implementation phase MUST include:
- [x] Phase 0: N/A (research only)
- [ ] Phase 1: Test file creation `apps/web/tests/e2e/components.spec.ts` covering component rendering
- [ ] Phase 1: Tests for validation schemas in `apps/web/tests/e2e/validation.spec.ts`
- [ ] Phase 2: Component accessibility tests (keyboard navigation, ARIA)
- [ ] Phase 2: State management E2E tests (store updates, persistence)
- [ ] Full test suite passes with no regressions

**Phase 0 Complete** ✅ - research.md generated with all technical decisions
**Phase 1 Complete** ✅ - quickstart.md generated (no data-model or contracts for frontend-only feature)

### Architecture & Scope Review

- [x] Technology stack compliance: React 18, Vite, Tailwind CSS, TypeScript strict mode
- [x] Monorepo structure: apps/web for components, packages/shared for schemas/stores
- [x] Dependencies: shadcn/ui, Zod, Zustand (all align with constitution - no conflicting libs)
- [x] Performance constraints: Build time <10s, bundle size <100KB gzipped

**✅ CONSTITUTION CHECK PASSED** - No violations identified

## Project Structure

### Documentation (this feature)

```text
specs/008-frontend-libs-integration/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # N/A - no new data entities
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # N/A - no new API contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Web application structure (frontend-focused)
apps/web/
├── src/
│   ├── components/
│   │   ├── ui/              # shadcn component library
│   │   │   ├── button.tsx
│   │   │   ├── input.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── form.tsx
│   │   │   └── ...
│   │   └── ...
│   ├── lib/
│   │   ├── utils.ts         # General utility functions
│   │   └── cn.ts            # className utility (shadcn requirement)
│   ├── stores/              # Zustand state stores
│   │   ├── auth.ts
│   │   ├── subscriptions.ts
│   │   └── ui.ts
│   ├── hooks/               # Custom React hooks
│   │   ├── use-validations.ts
│   │   └── use-store.ts
│   └── styles/
│       └── globals.css      # Global styles + Tailwind directives
├── components.json          # shadcn configuration
├── tailwind.config.ts       # Tailwind + shadcn theme configuration
├── tsconfig.json            # TypeScript configuration (strict mode)
└── tests/
    └── e2e/
        ├── components.spec.ts   # Component rendering/accessibility tests
        ├── validation.spec.ts  # Zod validation tests
        └── state.spec.ts       # Zustand store tests

packages/shared/
├── src/
│   ├── schemas/               # Zod validation schemas
│   │   ├── auth.ts
│   │   ├── payments.ts
│   │   ├── subscription.ts
│   │   └── index.ts
│   └── stores/                # Shared Zustand stores (if cross-app)
│       └── types.ts
```

**Structure Decision**: Web application structure with frontend-only changes. Components organized in `apps/web/src/components/ui/`, validation schemas shared via `packages/shared/src/schemas/`, state stores in `apps/web/src/stores/`. No backend or database changes required.

## Complexity Tracking

> **No Constitution violations requiring justification**

This feature enhances existing frontend infrastructure without architectural changes:
- Testing discipline: E2E tests planned for components, validation, state management
- Security: Zod schemas for runtime validation of all external data
- Type safety: Full TypeScript support across all three libraries
- User-centric: Accessibility built-in via shadcn/Radix components
- Scope: Frontend-only, no new APIs or data models

**No alternative rejected**: This is the simplest approach to integrate these libraries into the existing frontend architecture.
