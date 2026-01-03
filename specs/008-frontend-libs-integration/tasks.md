# Tasks: Frontend Libraries Integration

**Input**: Design documents from `/specs/008-frontend-libs-integration/`
**Prerequisites**: plan.md, spec.md, research.md, quickstart.md

**Tests**: This feature includes E2E tests via Playwright for components, validation, and state management as per constitution requirements.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a monorepo frontend feature:
- **Web frontend**: `apps/web/src/`
- **Shared package**: `packages/shared/src/`
- **Tests**: `apps/web/tests/e2e/`

## Terminology

This document uses "shadcn" as shorthand for "shadcn/ui" (the full library name). First mention in each context uses the full name; subsequent references use the shorthand.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and initialize library configurations

- [X] T001 Install shadcn/ui CLI and core dependencies (class-variance-authority, clsx, tailwind-merge) in apps/web
- [X] T002 Install Zod dependency in packages/shared
- [X] T003 Install Zustand dependency in apps/web
- [X] T004 [P] Install optional dev dependencies (react-hook-form, @hookform/resolvers, zustand-middleware-devtools) in apps/web
- [X] T005 Create utility function cn for className merging in apps/web/src/lib/cn.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure configuration that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T006 Initialize shadcn/ui with CLI configuration (TypeScript, Tailwind, CSS variables, path aliases)
- [X] T007 Configure Tailwind for shadcn theming (colors, border-radius, darkMode) in apps/web/tailwind.config.ts
- [X] T008 Update global CSS with shadcn theme variables (CSS custom properties for colors, radius) in apps/web/src/styles/globals.css
- [X] T009 [P] Create components.json configuration file for shadcn component paths in apps/web/components.json
- [X] T010 [P] Create directory structure for Zustand stores at apps/web/src/stores/
- [X] T011 [P] Create directory structure for Zod schemas at packages/shared/src/schemas/

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - UI Component System (Priority: P1) 🎯 MVP

**Goal**: Developers can use pre-built, accessible UI components to build interfaces faster with visual consistency

**Independent Test**: Install shadcn components, render them in a test page, verify they display correctly with proper styling and accessibility attributes

### Tests for User Story 1

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T012 [P] [US1] Create E2E test for Button component rendering and interaction in apps/web/tests/e2e/components.spec.ts
- [X] T013 [P] [US1] Create E2E test for Input component keyboard navigation in apps/web/tests/e2e/components.spec.ts
- [X] T014 [P] [US1] Create E2E test for component accessibility (ARIA attributes) in apps/web/tests/e2e/components.spec.ts
- [X] T015 [P] [US1] Create E2E test for theme switching (light/dark mode) in apps/web/tests/e2e/components.spec.ts

### Implementation for User Story 1

- [X] T016 [P] [US1] Install Button component via shadcn CLI in apps/web
- [X] T017 [P] [US1] Install Input component via shadcn CLI in apps/web
- [X] T018 [P] [US1] Install Label component via shadcn CLI in apps/web
- [X] T019 [P] [US1] Install Card component via shadcn CLI in apps/web
- [X] T020 [P] [US1] Install Dialog component via shadcn CLI in apps/web
- [X] T021 [P] [US1] Install Form component via shadcn CLI in apps/web
- [X] T022 [P] [US1] Install FormField component via shadcn CLI in apps/web
- [X] T023 [P] [US1] Install FormItem component via shadcn CLI in apps/web
- [X] T024 [P] [US1] Install FormMessage component via shadcn CLI in apps/web
- [X] T025 [P] [US1] Install Select component via shadcn CLI in apps/web
- [X] T026 [P] [US1] Install Checkbox component via shadcn CLI in apps/web
- [X] T027 [P] [US1] Install RadioGroup component via shadcn CLI in apps/web
- [X] T028 [P] [US1] Install tailwindcss-animate plugin for animations in apps/web
- [X] T029 [US1] Create test page demonstrating all installed components in apps/web/src/pages/test.tsx
- [X] T030 [US1] Verify component files exist in apps/web/src/components/ui/ directory
- [X] T031 [US1] Test component rendering with different variants (sizes, colors) on test page
- [X] T032 [US1] Verify Tailwind CSS integration and component styling
- [X] T033 [US1] Test theme switching between light and dark modes with component updates

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. All P1 components render correctly with proper styling and accessibility.

---

## Phase 4: User Story 2 - Data Validation System (Priority: P2)

**Goal**: Applications can validate user input and API responses to prevent invalid data from causing errors or security issues

**Independent Test**: Create validation schemas for common data types (email, passwords), pass valid and invalid data, verify validation results are correct

### Tests for User Story 2

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T034 [P] [US2] Create E2E test for email validation schema in apps/web/tests/e2e/validation.spec.ts
- [X] T035 [P] [US2] Create E2E test for password validation schema in apps/web/tests/e2e/validation.spec.ts
- [X] T036 [P] [US2] Create E2E test for API response validation in apps/web/tests/e2e/validation.spec.ts
- [X] T037 [P] [US2] Create E2E test for form validation error messages in apps/web/tests/e2e/validation.spec.ts

### Implementation for User Story 2

- [X] T038 [P] [US2] Create auth validation schemas (loginSchema, registerSchema) in packages/shared/src/schemas/auth.ts
- [X] T039 [P] [US2] Create payment validation schemas in packages/shared/src/schemas/payments.ts
- [X] T040 [P] [US2] Create subscription validation schemas in packages/shared/src/schemas/subscription.ts
- [X] T041 [US2] Create barrel export file for all schemas in packages/shared/src/schemas/index.ts
- [X] T042 [US2] Add custom error messages to schemas for user-friendly validation feedback
- [X] T043 [US2] Configure TypeScript path alias for @membran-app/shared in apps/web/tsconfig.json
- [X] T044 [US2] Test Zod schema validation with valid data
- [X] T045 [US2] Test Zod schema validation with invalid data and verify error messages
- [X] T046 [US2] Test TypeScript type inference from schemas
- [X] T047 [US2] Build packages/shared to verify type checking works correctly
- [X] T048 [US2] Create example form using Zod with React Hook Form in apps/web/src/components/examples/ValidationForm.tsx
- [X] T049 [US2] Test form validation with shadcn form components integration

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Validation schemas work with TypeScript inference and provide clear error messages.

---

## Phase 5: User Story 3 - Client State Management (Priority: P3)

**Goal**: Applications can manage client-side state (user preferences, UI state) without prop drilling or excessive re-renders

**Independent Test**: Create a store, subscribe to state changes, dispatch actions to update state, verify components re-render correctly when state changes

### Tests for User Story 3

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [X] T050 [P] [US3] Create E2E test for auth store state updates in apps/web/tests/e2e/state.spec.ts
- [X] T051 [P] [US3] Create E2E test for state persistence across page refreshes in apps/web/tests/e2e/state.spec.ts
- [X] T052 [P] [US3] Create E2E test for selective re-rendering on state changes in apps/web/tests/e2e/state.spec.ts
- [X] T053 [P] [US3] Create E2E test for concurrent state updates from multiple components in apps/web/tests/e2e/state.spec.ts

### Implementation for User Story 3

- [X] T054 [P] [US3] Create auth store with User interface and auth actions in apps/web/src/stores/auth.ts
- [X] T055 [P] [US3] Configure persistence middleware for auth store (exclude tokens) in apps/web/src/stores/auth.ts
- [X] T056 [P] [US3] Create UI store for theme and sidebar state in apps/web/src/stores/ui.ts
- [X] T057 [P] [US3] Configure persistence middleware for UI store in apps/web/src/stores/ui.ts
- [X] T058 [P] [US3] Create subscriptions store for subscription data in apps/web/src/stores/subscriptions.ts
- [X] T059 [P] [US3] Configure DevTools middleware for all stores (development only) in apps/web/src/stores/
- [X] T060 [US3] Test auth store state updates and reactivity
- [X] T061 [US3] Test UI store theme switching and state persistence
- [X] T062 [US3] Test subscriptions store data fetching and caching
- [X] T063 [US3] Verify localStorage persistence for auth store (user data only, no tokens)
- [X] T064 [US3] Verify localStorage persistence for UI store (theme, sidebar state)
- [X] T065 [US3] Test selective re-rendering (only subscribed components update)
- [X] T066 [US3] Test concurrent state updates from multiple components
- [X] T067 [US3] Create example components demonstrating store usage in apps/web/src/components/examples/StoreExample.tsx
- [X] T068 [US3] Test DevTools integration in development mode

**Checkpoint**: All user stories should now be independently functional. State management works with persistence and selective re-rendering.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and final validation

- [X] T069 [P] Build application and verify build time is under 10 seconds in apps/web
- [X] T070 [P] Check bundle size to ensure total increase is under 100KB gzipped
- [X] T071 [P] Update CLAUDE.md with shadcn, Zod, and Zustand library information
- [X] T072 [P] Update package.json documentation with new library versions
- [X] T073 Run complete E2E test suite (components, validation, state) and verify all tests pass
- [X] T074 Test tree-shaking by verifying unused components are not included in bundle
- [X] T075 Verify accessibility compliance (WCAG 2.1 AA) for all installed components
- [X] T076 Test theme switching across all components and pages
- [X] T077 Verify TypeScript strict mode compatibility across all libraries
- [X] T078 Run quickstart.md validation steps
- [X] T079 Create usage documentation for developers in apps/web/README.md
- [X] T080 Test application in different browsers (Chrome, Firefox, Safari, Edge)
- [X] T081 Verify component props API completeness and TypeScript types
- [X] T082 Clean up any temporary test files or debug code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational phase completion - No dependencies on other stories
- **User Story 2 (Phase 4)**: Depends on Foundational phase completion - Can proceed in parallel with US1/US3
- **User Story 3 (Phase 5)**: Depends on Foundational phase completion - Can proceed in parallel with US1/US2
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - Components)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2 - Validation)**: Can start after Foundational (Phase 2) - Independent from US1, but US2 schemas can be used with US1 form components
- **User Story 3 (P3 - State)**: Can start after Foundational (Phase 2) - Independent from US1/US2, but can manage state for both

### Within Each User Story

- Tests MUST be written and FAIL before implementation (TDD approach per constitution)
- Component/schema/store installation before configuration
- Configuration before testing
- Core implementation before integration
- Story complete before moving to next priority (or proceed in parallel)

### Parallel Opportunities

- All Setup tasks marked [P] can run in parallel (T001-T005)
- All Foundational tasks marked [P] can run in parallel within Phase 2 (T009-T011)
- Once Foundational phase completes, all user stories can start in parallel
- All tests for a user story marked [P] can run in parallel
- Component installations within US1 marked [P] can run in parallel (T016-T028)
- Schema creations within US2 marked [P] can run in parallel (T038-T040)
- Store creations within US3 marked [P] can run in parallel (T054-T059)
- Different user stories can be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all component installations together:
Task T016: Install Button component via shadcn CLI
Task T017: Install Input component via shadcn CLI
Task T018: Install Label component via shadcn CLI
Task T019: Install Card component via shadcn CLI
Task T020: Install Dialog component via shadcn CLI
Task T021: Install Form component via shadcn CLI
Task T022: Install FormField component via shadcn CLI
Task T023: Install FormItem component via shadcn CLI
Task T024: Install FormMessage component via shadcn CLI
Task T025: Install Select component via shadcn CLI
Task T026: Install Checkbox component via shadcn CLI
Task T027: Install RadioGroup component via shadcn CLI
```

```bash
# Launch all E2E tests for User Story 1 together:
Task T012: Create E2E test for Button component
Task T013: Create E2E test for Input component
Task T014: Create E2E test for component accessibility
Task T015: Create E2E test for theme switching
```

---

## Parallel Example: User Story 2

```bash
# Launch all schema creations together:
Task T038: Create auth validation schemas
Task T039: Create payment validation schemas
Task T040: Create subscription validation schemas
```

```bash
# Launch all E2E tests for User Story 2 together:
Task T034: Create E2E test for email validation
Task T035: Create E2E test for password validation
Task T036: Create E2E test for API response validation
Task T037: Create E2E test for form validation error messages
```

---

## Parallel Example: User Story 3

```bash
# Launch all store creations together:
Task T054: Create auth store
Task T056: Create UI store
Task T058: Create subscriptions store
```

```bash
# Launch all E2E tests for User Story 3 together:
Task T050: Create E2E test for auth store
Task T051: Create E2E test for state persistence
Task T052: Create E2E test for selective re-rendering
Task T053: Create E2E test for concurrent state updates
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T005)
2. Complete Phase 2: Foundational (T006-T011) - **CRITICAL, blocks all stories**
3. Complete Phase 3: User Story 1 (T012-T033)
4. **STOP and VALIDATE**: Test User Story 1 independently - components render correctly, accessibility works, theme switching functions
5. Deploy/demo if ready

**Value Delivered**: Developers have pre-built, accessible UI components to build interfaces 50% faster

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready for all stories
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Each story adds value without breaking previous stories

**Benefits**:
- US1: UI components available immediately
- US2: Validation prevents data errors and improves security
- US3: State management eliminates prop drilling and improves performance

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together (T001-T011)
2. Once Foundational is done:
   - Developer A: User Story 1 - Components (T012-T033)
   - Developer B: User Story 2 - Validation (T034-T049)
   - Developer C: User Story 3 - State (T050-T068)
3. Stories complete and integrate independently
4. Team completes Polish phase together (T069-T082)

**Time Savings**: Three stories can complete in roughly the same time as one story with parallel execution

---

## Summary

**Total Tasks**: 82 tasks
- Setup: 5 tasks
- Foundational: 6 tasks
- User Story 1 (P1): 22 tasks (12 implementation + 4 tests + 1 test page + 5 verification)
- User Story 2 (P2): 16 tasks (5 schemas + 1 barrel + 1 config + 5 tests + 4 verification)
- User Story 3 (P3): 19 tasks (3 stores + 3 configs + 4 tests + 6 verification + 3 example)
- Polish: 14 tasks

**Parallel Opportunities Identified**:
- Setup phase: 4 parallel tasks (T001-T004)
- Foundational phase: 3 parallel tasks (T009-T011)
- User Story 1: 16 parallel tasks (12 component installs + 4 tests)
- User Story 2: 7 parallel tasks (3 schemas + 4 tests)
- User Story 3: 7 parallel tasks (3 stores + 4 tests)
- Polish phase: 3 parallel tasks (T069-T071)

**Independent Test Criteria**:
- US1: Install components, render on test page, verify styling and accessibility
- US2: Create schemas, test with valid/invalid data, verify error messages
- US3: Create stores, test state updates and persistence, verify selective re-rendering

**Suggested MVP Scope**: User Story 1 only (P1 - UI Component System) - delivers immediate value with pre-built, accessible components

**Format Validation**: All 82 tasks follow the checklist format: `- [ ] [TaskID] [P?] [Story?] Description with file path`

---

## Notes

- [P] tasks = different files, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability (US1, US2, US3)
- Each user story is independently completable and testable
- Tests are written FIRST (TDD per constitution testing discipline)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- E2E tests are mandatory per constitution - use Playwright
- Bundle size and build time must meet targets (<100KB gzipped, <10s build)
- All libraries must maintain TypeScript strict mode compatibility
- Accessibility (WCAG 2.1 AA) is verified for all components
