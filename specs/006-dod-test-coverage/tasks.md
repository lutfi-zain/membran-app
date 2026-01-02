# Tasks: DOD Test Coverage

**Input**: Design documents from `/specs/006-dod-test-coverage/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: The constitution requires E2E tests for this feature. Tests are included for each user story phase.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **CLI tool**: `scripts/dod-verify/` at repository root
- **Tests**: `tests/dod-verification/` at repository root
- All paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and dependencies

- [x] T001 Install core dependencies (gray-matter, remark, remark-gfm, remark-stringify, unified, chalk, fast-glob, zod)
- [x] T002 [P] Create gitleaks.toml configuration file at repository root with Discord/Midtrans secret patterns
- [x] T003 [P] Create scripts/dod-verify directory structure (parsers/, verifiers/, cache/, reporters/)
- [x] T004 [P] Add dod:verify, dod:verify:milestone, dod:verify:fresh scripts to package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core types and interfaces that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 [P] Define TypeScript types in scripts/dod-verify/types.ts (DODCriterion, Milestone, VerificationResult, VerificationReport, SessionCache, all detail types)
- [x] T006 [P] Define Zod schemas in scripts/dod-verify/types.ts (DODCriterionSchema, VerificationResultSchema, ReportSummarySchema, ConsoleOutputSchema)
- [x] T007 Create hash utility functions in scripts/dod-verify/cache/hash.ts (hashFile, hashContent for cache invalidation)
- [x] T008 Create session cache module in scripts/dod-verify/cache/session.ts (createSessionCache with get/set/has/clear/invalidate methods)
- [x] T009 Create CLI argument parser in scripts/dod-verify/cli.ts (parse --milestone, --fresh, --format flags)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Automated DOD Verification (Priority: P1) 🎯 MVP

**Goal**: Parse prp.md section 7, extract DOD criteria, run all verifications, display pass/fail report, update checkpoints when all pass

**Independent Test**: Run `bun run dod:verify` and verify it displays checklist of all DOD items from prp.md with pass/fail status for each

### Tests for User Story 1 (Constitution Required) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**

- [x] T010 [P] [US1] Test happy path in tests/dod-verification/happy-path.spec.ts (successful DOD verification with all criteria passing)
- [x] T011 [P] [US1] Test failure cases in tests/dod-verification/failure-cases.spec.ts (DOD fails with actionable error messages)
- [x] T012 [P] [US1] Test edge cases in tests/dod-verification/edge-cases.spec.ts (malformed prp.md, test timeouts, missing gitleaks)

### Implementation for User Story 1

- [x] T013 [P] [US1] Create PRP parser in scripts/dod-verify/parsers/prp.ts (parsePRP function using gray-matter + remark, extract section 7 checkpoints with positions)
- [x] T014 [P] [US1] Create checkpoint updater in scripts/dod-verify/parsers/checkpoint.ts (updateCheckpoint function using remark-stringify to modify checkboxes)
- [x] T015 [US1] Create test verifier in scripts/dod-verify/verifiers/tests.ts (verifyTests function running Playwright with coverage, filtering critical paths for 100% threshold)
- [x] T016 [US1] Create TypeScript verifier in scripts/dod-verify/verifiers/typescript.ts (verifyTypeScript function running tsc --noEmit, parsing diagnostics)
- [x] T017 [US1] Create lint verifier in scripts/dod-verify/verifiers/lint.ts (verifyLint function detecting Biome/ESLint, running bun run lint, parsing output)
- [x] T018 [US1] Create secret detection verifier in scripts/dod-verify/verifiers/secrets.ts (verifySecrets function spawning gitleaks, parsing JSON, redacting findings)
- [x] T019 [US1] Create security basics verifier in scripts/dod-verify/verifiers/security.ts (verifySecurityBasics with rate-limiting, input-validation, https-only, auth-on-protected checks)
- [x] T020 [US1] Create console reporter in scripts/dod-verify/reporters/console.ts (formatReport function supporting text/json/markdown output with chalk colors)
- [x] T021 [US1] Create main CLI entry point in scripts/dod-verify/index.ts (main function orchestrating parse, verify, cache, report, update workflow)
- [x] T022 [US1] Integrate milestone filtering in scripts/dod-verify/index.ts (support --milestone N flag to verify only specific milestone criteria)
- [x] T023 [US1] Integrate cache invalidation in scripts/dod-verify/index.ts (support --fresh flag, compute source hashes, skip cached unchanged results)
- [x] T024 [US1] Integrate prp.md update in scripts/dod-verify/index.ts (automatic checkpoint update when all criteria passed)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently. Running `bun run dod:verify` should verify all DOD criteria and display results.

---

## Phase 4: User Story 2 - Milestone-Specific DOD Testing (Priority: P2)

**Goal**: Enable developers to verify DOD compliance for specific milestones (1-4) without running the entire checklist

**Independent Test**: Run `bun run dod:verify --milestone 2` and verify only Milestone 2 DOD items are checked and reported

### Implementation for User Story 2

- [x] T025 [P] [US2] Add milestone validation in scripts/dod-verify/cli.ts (validate milestone number 1-4, display error with available milestones if invalid)
- [x] T026 [US2] Add milestone filtering in scripts/dod-verify/parsers/prp.ts (filter criteria by milestone number, return only matching DODCriterion[])
- [x] T027 [US2] Add milestone-specific checkpoint update in scripts/dod-verify/parsers/checkpoint.ts (update only checkpoints for specified milestone when all pass)
- [x] T028 [US2] Add milestone-specific report summary in scripts/dod-verify/reporters/console.ts (show milestone name and number in report header)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently. Developers can verify specific milestones with `bun run dod:verify --milestone N`.

---

## Phase 5: User Story 3 - Security Compliance Verification (Priority: P3)

**Goal**: Automated verification of security-specific DOD criteria with detailed findings (hardcoded secrets with file/line, rate limiting config, input validation)

**Independent Test**: Run `bun run dod:verify` with a hardcoded secret in code and verify it detects the secret with file/line number in output

### Implementation for User Story 3

- [x] T029 [P] [US3] Enhance secret detection in scripts/dod-verify/verifiers/secrets.ts (return file/line for each finding, redact secrets showing first/last 4 chars only)
- [x] T030 [US3] Add rate limiting check in scripts/dod-verify/verifiers/security.ts (scan for rate limiting middleware in apps/api/src/routes/, check Cloudflare Workers config)
- [x] T031 [US3] Add input validation check in scripts/dod-verify/verifiers/security.ts (scan for Zod schemas on API routes in apps/api/src/routes/, verify request body validation)
- [x] T032 [US3] Add detailed security output in scripts/dod-verify/reporters/console.ts (show security findings table with file, line, rule, severity for each issue)

**Checkpoint**: All user stories should now be independently functional. Security verification detects secrets, rate limiting, and input validation issues with specific file/line references.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T033 [P] Add --help flag in scripts/dod-verify/cli.ts (display usage examples and flag descriptions)
- [x] T034 [P] Add verbose logging in scripts/dod-verify/index.ts (support --verbose flag for detailed verification output)
- [x] T035 [P] Add timeout configuration in scripts/dod-verify/verifiers/*.ts (support --timeout flag for custom verifier timeouts)
- [x] T036 [P] Create coverage.config.ts in scripts/dod-verify/ (export CRITICAL_PATHS array for 100% coverage requirement)
- [x] T037 Add E2E test for milestone flag in tests/dod-verification/happy-path.spec.ts (test `--milestone 2` verifies only Milestone 2)
- [x] T038 Add E2E test for cache invalidation in tests/dod-verification/happy-path.spec.ts (test cached results skipped, --fresh forces re-run)
- [x] T039 Add E2E test for secret detection in tests/dod-verification/failure-cases.spec.ts (test hardcoded secret detected with file/line)
- [x] T040 Run full test suite and ensure all tests pass (bunx playwright test tests/dod-verification/)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Can start after Foundational - Extends US1 with filtering
  - User Story 3 (P3): Can start after Foundational - Enhances US1 security verifier
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - Core DOD verification
- **User Story 2 (P2)**: Can start after Foundational - Depends on US1 parser (T013) and reporter (T020) being functional
- **User Story 3 (P3)**: Can start after Foundational - Depends on US1 secret verifier (T018) and security verifier (T019) being functional

### Within Each User Story

- Tests (T010-T012) MUST be written and FAIL before implementation
- Parsers (T013-T014) before verifiers (T015-T019)
- Verifiers before reporter (T020)
- All components before main entry point (T021-T024)
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: All tasks (T001-T004) can run in parallel
- **Foundational Phase**: T005-T009 can run in parallel (different files)
- **US1 Tests**: T010-T012 can run in parallel (different test files)
- **US1 Parsers**: T013-T014 can run in parallel
- **US1 Verifiers**: T015-T019 can run in parallel (different verifier files)
- **US2/US3**: Can be implemented in parallel after US1 core is complete
- **Polish Phase**: T033-T036 can run in parallel

---

## Parallel Example: User Story 1 Implementation

```bash
# Launch all US1 tests together:
Task: "Test happy path in tests/dod-verification/happy-path.spec.ts"
Task: "Test failure cases in tests/dod-verification/failure-cases.spec.ts"
Task: "Test edge cases in tests/dod-verification/edge-cases.spec.ts"

# Launch all US1 parsers together:
Task: "Create PRP parser in scripts/dod-verify/parsers/prp.ts"
Task: "Create checkpoint updater in scripts/dod-verify/parsers/checkpoint.ts"

# Launch all US1 verifiers together:
Task: "Create test verifier in scripts/dod-verify/verifiers/tests.ts"
Task: "Create TypeScript verifier in scripts/dod-verify/verifiers/typescript.ts"
Task: "Create lint verifier in scripts/dod-verify/verifiers/lint.ts"
Task: "Create secret detection verifier in scripts/dod-verify/verifiers/secrets.ts"
Task: "Create security basics verifier in scripts/dod-verify/verifiers/security.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Foundational (T005-T009) - **CRITICAL BLOCKER**
3. Complete Phase 3: User Story 1 (T010-T024)
4. **STOP and VALIDATE**: Test US1 independently by running `bun run dod:verify`
5. Verify E2E tests pass

**MVP Scope**: Automated DOD verification for all milestones with pass/fail reporting and automatic prp.md checkpoint updates.

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy (MVP!)
3. Add User Story 2 → Test independently → Deploy
4. Add User Story 3 → Test independently → Deploy
5. Polish → Deploy

Each story adds value without breaking previous stories.

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T010-T024)
   - Developer B: User Story 2 (T025-T028) - can start after US1 parsers/reporter done
   - Developer C: User Story 3 (T029-T032) - can start after US1 verifiers done
3. Polish together (T033-T040)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Constitution requires E2E tests for each phase
- Cache is per-session (cleared on terminal end)
- prp.md is automatically updated when all DOD criteria pass
- Failures warn only (don't block git operations)
- 100% test coverage required for critical paths
- Gitleaks must be installed globally for secret detection
- All verification results include actionable error messages
