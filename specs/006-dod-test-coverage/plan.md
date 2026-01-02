# Implementation Plan: DOD Test Coverage

**Branch**: `006-dod-test-coverage` | **Date**: 2026-01-01 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/006-dod-test-coverage/spec.md`

## Summary

Develop a DOD (Definition of Done) verification system that parses prp.md section 7, automatically checks all DOD criteria via npm script (`bun run dod:verify`), displays pass/fail reports, supports milestone-specific verification, detects hardcoded secrets, verifies test coverage (100% for critical paths), TypeScript compilation, linting, and security basics. Results are cached per-session with `--fresh` flag to force re-run. Failures warn only (don't block git), and prp.md checkpoints are automatically updated when DOD passes.

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.x
**Primary Dependencies**: Zod (validation), gray-matter (frontmatter parsing), chalk (terminal output), glob (file matching)
**Storage**: File-based (prp.md parsing and modification), in-memory cache for results
**Testing**: Playwright for E2E testing (testing the verification tool itself)
**Target Platform**: CLI tool running in Node.js/Bun environment (cross-platform)
**Project Type**: single (CLI tool within existing monorepo)
**Performance Goals**: Full DOD verification in <2 minutes, milestone verification in <60 seconds
**Constraints**: Must parse markdown structure, detect secrets in code, run existing test/lint commands
**Scale/Scope**: 4 milestones in prp.md, ~50 DOD criteria across all milestones, scans all source files in monorepo

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Required Constitution Compliance

- [x] **Testing Discipline (NON-NEGOTIABLE)**: E2E tests MUST be planned for each implementation phase
  - [x] Frontend: Playwright tests for user interactions, forms, visual states (N/A - this is a CLI tool)
  - [x] Backend: Playwright tests for API contracts, auth, error handling (N/A - no backend)
  - [x] Integration: Tests covering DOD verification flows (test the tool itself with Playwright)
- [x] **Security First**: Input validation (Zod for prp.md parsing), least privilege (read-only for source files), no secret exposure (tool detects secrets, doesn't expose them)
- [x] **Type Safety**: TypeScript strict mode, explicit types, Zod for external data (prp.md parsing)
- [x] **API-First Design**: N/A - this is a CLI tool, not an API
- [x] **User-Centric Development**: Clear terminal output with actionable error messages, help text

### E2E Testing Gate

Each implementation phase MUST include:
- [x] Test file creation (T010-T012, T037-T039 in tasks.md)
- [x] Tests written and passing before phase completion (covered in US1 and Polish phases)
- [x] Coverage for: happy path (T010), error cases (T011), edge cases (T012)
- [x] Full test suite passes with no regressions (T040)

### Architecture & Scope Review

- [x] Technology stack compliance (Bun, TypeScript - tool runs via Bun scripts)
- [x] Monorepo structure within limits (tool added as script in root package.json)
- [x] Dependencies: Zod for parsing, minimal additional dependencies
- [x] Performance constraints met (<60s for milestone, <2min for full DOD)

**Status**: PASSED - No violations, all constitution requirements addressed.

## Project Structure

### Documentation (this feature)

```text
specs/006-dod-test-coverage/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (N/A - no API contracts)
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
scripts/
├── dod-verify/
│   ├── index.ts         # Main CLI entry point
│   ├── parsers/
│   │   ├── prp.ts       # prp.md parser (extract DOD criteria)
│   │   └── checkpoint.ts # Checkpoint parser and updater
│   ├── verifiers/
│   │   ├── tests.ts     # Test runner (Playwright, coverage)
│   │   ├── typescript.ts# TypeScript compilation checker
│   │   ├── lint.ts      # Lint checker (Biome/ESLint)
│   │   ├── secrets.ts   # Secret detection (API keys, tokens)
│   │   └── security.ts  # Security basics (rate limiting, input validation)
│   ├── cache/
│   │   └── session.ts   # Per-session result caching
│   ├── reporters/
│   │   └── console.ts   # Terminal output formatting
│   └── types.ts         # TypeScript types and Zod schemas

tests/
├── dod-verification/
│   ├── happy-path.spec.ts     # Test successful DOD verification
│   ├── failure-cases.spec.ts  # Test DOD failure scenarios
│   └── edge-cases.spec.ts     # Test malformed prp.md, timeouts, etc.

package.json               # Add dod:verify script
```

**Structure Decision**: Single project structure - this is a CLI tool within the existing monorepo. The tool lives in `scripts/dod-verify/` and is invoked via npm script. No separate frontend/backend needed. Tests use Playwright to verify the CLI tool's behavior (spawn processes, capture output, verify exit codes).

## Complexity Tracking

> **No violations - N/A**

All requirements align with constitution principles and project constraints.
