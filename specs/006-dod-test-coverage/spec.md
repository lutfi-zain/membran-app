# Feature Specification: DOD Test Coverage

**Feature Branch**: `006-dod-test-coverage`
**Created**: 2026-01-01
**Status**: Draft
**Input**: User description: "test every dod in @prp.md"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Automated DOD Verification (Priority: P1)

Developers need to verify that all Definition of Done (DOD) criteria from prp.md are met before considering any feature complete. The system should automatically check all DOD requirements and provide a clear pass/fail report.

**Why this priority**: This is the foundation for ensuring quality - without automated DOD verification, developers must manually check each criterion, leading to missed requirements and inconsistent quality.

**Independent Test**: Can be fully tested by running the DOD verification command and verifying it produces a comprehensive report covering all checkpoints in prp.md section 7.

**Acceptance Scenarios**:

1. **Given** a developer has just completed implementing a feature, **When** they run `bun run dod:verify`, **Then** the system displays a checklist of all DOD items from prp.md with pass/fail status for each
2. **Given** the DOD verification is running, **When** one or more criteria are not met (e.g., tests failing, lint errors, missing documentation), **Then** the system explicitly lists which items failed and what actions are needed to pass
3. **Given** all DOD criteria are met, **When** the verification completes, **Then** the system displays a success message and updates prp.md to mark the completed checkpoints

---

### User Story 2 - Milestone-Specific DOD Testing (Priority: P2)

Each milestone in prp.md (Core Infrastructure, Midtrans Payment Flow, Discord Bot Integration, MVP Release) has specific DOD criteria. Developers need to verify DOD compliance for the specific milestone they are working on.

**Why this priority**: Milestone-specific testing allows developers to focus on relevant criteria without being overwhelmed by the entire checklist, improving workflow efficiency.

**Independent Test**: Can be fully tested by running the DOD verification with a specific milestone flag and verifying only that milestone's criteria are checked.

**Acceptance Scenarios**:

1. **Given** a developer is working on "Milestone 2: Midtrans Payment Flow", **When** they run DOD verification with `--milestone 2`, **Then** only DOD items for Milestone 2 are checked and reported
2. **Given** a developer specifies an invalid milestone number, **When** they run the command, **Then** the system displays an error listing available milestones (1-4)
3. **Given** milestone-specific DOD passes, **When** verification completes, **Then** only that milestone's checkpoints in prp.md are marked as complete

---

### User Story 3 - Security Compliance Verification (Priority: P3)

The DOD includes security basics (section 7 of prp.md) that must be verified. Developers need automated checks for security-specific criteria like no hardcoded secrets, rate limiting configuration, and input validation.

**Why this priority**: Security is critical for a payment and Discord integration platform, but can be verified as part of the broader DOD process rather than blocking initial development.

**Independent Test**: Can be fully tested by running the security verification command and verifying it detects common security issues like hardcoded API keys or missing rate limiting.

**Acceptance Scenarios**:

1. **Given** a developer has implemented a new API endpoint, **When** security verification runs, **Then** it checks for rate limiting configuration and reports pass/fail
2. **Given** a developer accidentally committed a hardcoded secret, **When** security verification runs, **Then** it detects the secret and fails with a specific error message about the file and line number
3. **Given** all security basics are implemented, **When** verification completes, **Then** all security-related DOD items are marked as passed

---

### Edge Cases

- What happens when prp.md is modified (checkpoints added/removed) while verification is running?
  - **Behavior**: System uses atomic read operations - prp.md is read once at verification start
  - If modified during run: Next verification run will see the new content
  - Concurrent modification: Safe (only reads, writes only happen after successful verification)
  - Implementation: Use `readFileSync()` with immediate parse, no file locks required
- How does the system handle incomplete or malformed checkpoint definitions in prp.md?
  - **Expected format**: `- [ ] Checkbox text here` or `- [x] Completed checkbox`
  - Valid checkbox patterns: `- [ ]`, `- [x]`, `- [X]` (case-insensitive)
  - Invalid patterns: `-]`, `-[]`, `- [ ]` without text, `* [ ]` (wrong bullet)
  - **Error handling**: Display line number, show actual format, show expected format
  - Example error: "Line 42: Invalid checkpoint format '-[ ] Test'. Expected '- [ ] Test'"
- What happens when tests timeout or hang during DOD verification? System fails with timeout error, logs which test hung
- How are parallel test executions handled when verifying multiple milestones? Tests run sequentially within milestones, milestones can run in parallel
- What happens when the developer is on a different branch than the one being verified? Verification runs against current branch state; git operations are not blocked (warn-only approach)

## Clarifications

### Session 2026-01-01

- Q: What is the minimum test coverage percentage that constitutes passing the DOD verification? → A: 100% minimum coverage (absolute assurance for critical paths including payment flows, Discord role assignment, authentication)
- Q: How should developers invoke the DOD verification tool? → A: npm script (e.g., `bun run dod:verify`) - integrates with existing project scripts
- Q: How long should DOD verification results be cached before requiring re-verification? → A: Per-session cache (cleared when terminal session ends or developer runs `dod:verify --fresh`)
- Q: When DOD verification fails, should the system block git operations or just warn? → A: Warn only (display failure but don't block any git operations)
- Q: Should prp.md be automatically updated when DOD passes, or require developer confirmation? → A: Automatic update (prp.md modified immediately when DOD passes, developer can revert via git)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST parse prp.md section 7 (Checkpoints & Definition of Done) and extract all DOD criteria
- **FR-002**: System MUST provide an npm script command (e.g., `bun run dod:verify`) to verify all DOD criteria for the current implementation
- **FR-003**: System MUST verify each DOD criterion using automated checks (tests, linting, documentation scanning)
- **FR-004**: System MUST display a clear pass/fail report for each DOD item (warn only - do not block git operations, failures displayed with actionable remediation)
- **FR-005**: System MUST support milestone-specific verification via a flag or parameter
- **FR-006**: System MUST automatically update prp.md checkpoints (mark as complete) when all criteria for a milestone pass (developer can revert via git if needed)
- **FR-007**: System MUST detect hardcoded secrets in code (API keys, tokens, passwords)
  - **Severity levels**:
    - **High**: Discord bot tokens, Midtrans API keys, database URLs, private keys
    - **Medium**: API keys (non-critical services), webhook URLs, service account tokens
    - **Low**: Test keys (containing "test", "mock", "demo"), localhost URLs, example credentials
  - Detection MUST classify findings by severity level
  - False positive allowance: Test patterns (SK_TEST, PK_TEST, mock) classified as Low
- **FR-008**: System MUST verify test coverage meets 100% minimum threshold for critical paths
  - Critical paths defined as:
    - `apps/api/src/routes/auth.ts` - Authentication flows
    - `apps/api/src/routes/bot.ts` - Discord bot integration
    - `apps/api/src/routes/payments.ts` - Payment processing
    - `packages/db/src/schema/*.ts` - Database schema definitions
  - Non-critical paths (test files, types, utilities) are excluded from 100% requirement
- **FR-009**: System MUST verify TypeScript compilation succeeds with no type errors
- **FR-010**: System MUST verify all linting rules pass (Biome/ESLint configuration)
- **FR-011**: System MUST verify security basics are implemented (rate limiting, input validation, no secret exposure)
- **FR-012**: System MUST provide actionable error messages when DOD criteria fail
- **FR-013**: System MUST support running verification from any branch (not just master/main)
- **FR-014**: System MUST cache verification results per session (cleared when terminal session ends or developer runs `dod:verify --fresh`) to avoid redundant checks

### Key Entities

- **DOD Criterion**: Represents a single Definition of Done item from prp.md (e.g., "All tests pass", "No linting errors", "TypeScript compilation succeeds")
- **Milestone**: Represents a development phase (Core Infrastructure, Midtrans Payment Flow, Discord Bot Integration, MVP Release) with associated DOD criteria
- **Verification Result**: Represents the outcome of checking a single DOD criterion (pass/fail, timestamp, details)
- **Checkpoint Reference**: Links a DOD criterion to its location in prp.md (section, line number)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Developers can verify all DOD criteria for a milestone in under 60 seconds
- **SC-002**: 100% of DOD criteria from prp.md are automatically verifiable (no manual checks required)
- **SC-003**: False positive rate for security checks is under 5% (legitimate code flagged as insecure)
- **SC-004**: 95% of developers report that DOD verification catches issues they would have missed manually
- **SC-005**: Zero features are merged without passing all applicable DOD criteria
- **SC-006**: Verification completes in under 2 minutes for the full DOD checklist
- **SC-007**: 90% of DOD failures provide clear, actionable remediation steps

## Assumptions

1. **Test Framework**: Playwright is configured for E2E testing (as per constitution and existing setup)
2. **Linting Tool**: Biome or ESLint is configured with project-specific rules
3. **prp.md Structure**: Section 7 follows the established checkpoint/milestone format
4. **Git Workflow**: Feature branches are used and merged via PR
5. **TypeScript**: Strict mode is enabled and compilation is part of the build process
6. **Documentation**: API documentation is auto-generated via Scalar (as per prp.md)
7. **Rate Limiting**: Cloudflare Workers provides built-in rate limiting (as per prp.md constraints)

## Non-Goals (Explicitly Out of Scope)

- **Automated Code Review**: DOD verification does not replace PR review (as per DOD, peer review is required)
- **Performance Testing**: Load testing, stress testing, and performance benchmarks are not part of DOD (handled separately)
- **Accessibility Auditing**: WCAG compliance checks are not included in DOD verification
- **Deployment Automation**: DOD verification does not handle deployment to production
- **Cross-Browser Testing**: Browser compatibility testing is not part of DOD (Playwright handles this separately)
- **Security Auditing**: DOD security checks are basic only; comprehensive security audits are out of scope
