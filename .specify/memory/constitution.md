<!--
Sync Impact Report
==================
Version change: 1.2.0 -> 1.3.0

Modified principles:
- None (adding new principle)

Added sections:
- VII. Demo & Handoff (NON-NEGOTIABLE) - E2E happy flow headfull testing requirement

Removed sections: None

Templates requiring updates:
- .specify/templates/plan-template.md - ✅ COMPLETED (added Demo & Handoff section)
- .specify/templates/tasks-template.md - ✅ COMPLETED (added Phase N+1: Demo & Handoff)
- .specify/templates/spec-template.md - no changes needed
- .specify/templates/agent-file-template.md - no changes needed
- README.md - no changes needed

Follow-up TODOs: None
-->

# membran-app Constitution

## Core Principles

### I. Testing Discipline (NON-NEGOTIABLE)

All implementations MUST be tested after completion for both frontend and backend code. Before considering any implementation task complete, developers MUST:

- **Phase Gate E2E Testing**: Every implementation phase MUST have corresponding end-to-end tests written and passing before proceeding to the next phase
  - Frontend components: Playwright tests for user interactions, form submissions, and visual states
  - Backend endpoints: Playwright tests for API contracts, authentication, and error handling
  - Integration points: Tests covering frontend-backend communication flows
- **PRP Checkpoint Tracking**: After every task completion, developers MUST:
  - Update the corresponding checkpoint in `prp.md` (section 7: Checkpoints & Definition of Done)
  - Verify compliance with the DOD (Definition of Done) checklist for the completed milestone
  - Run tests based on the acceptance criteria defined in the PRP checkpoints
  - Mark checkpoints as complete only when all associated tests pass
- Write or update relevant tests (unit, integration, or end-to-end as appropriate)
- Run the full test suite to verify all tests pass
- Ensure no regressions are introduced

**Rationale**: Comprehensive testing prevents regressions, ensures code quality, and provides confidence in deployments. E2E testing at phase gates catches integration issues early, validates user flows end-to-end, and verifies the complete system works as designed before building more features on top. PRP checkpoint tracking ensures alignment with project milestones and verification against the original requirements. This applies equally to React frontend components and Hono backend endpoints.

### II. Security First (NON-NEGOTIABLE)

Security requirements MUST be addressed at the design phase, not as an afterthought. All code MUST:

- Validate and sanitize all inputs (user-provided data, API payloads, environment variables)
- Follow the principle of least privilege
- Never expose secrets, keys, or sensitive data in logs or error messages
- Use parameterized queries or ORMs to prevent SQL injection
- Implement proper authentication and authorization checks on all protected endpoints

**Rationale**: A SaaS platform handling payments and Discord integrations requires robust security from day one.

### III. Type Safety

TypeScript MUST be used throughout the codebase with strict mode enabled. All code MUST:

- Have explicit types for function parameters, return values, and state
- Avoid `any` types; use `unknown` when type assertion is truly impossible
- Leverage discriminated unions for state machines and error handling
- Use Zod for runtime validation of external data (API payloads, environment variables)

**Rationale**: Type safety catches errors at compile time, improves IDE support, and serves as documentation.

### IV. API-First Design

Backend endpoints MUST be designed before implementation following RESTful conventions. All APIs MUST:

- Use consistent URL patterns and HTTP methods
- Return structured JSON responses with consistent error formats
- Document request/response schemas in shared packages
- Version APIs when breaking changes are introduced

**Rationale**: A clean API contract enables frontend development in parallel and maintains backward compatibility.

### V. User-Centric Development

Features MUST be developed with the end user in mind. All implementations MUST:

- Deliver incremental value (MVP approach)
- Maintain backward compatibility for existing users
- Provide clear user feedback for all actions (loading states, success, errors)
- Follow accessibility guidelines (keyboard navigation, screen reader support)

**Rationale**: Server owners and their members are the primary users; their experience determines product success.

### VI. PRP Alignment (NON-NEGOTIABLE)

All development work MUST align with the Product Requirements Prompt (prp.md). After every task completion:

- **Checkpoint Updates**: Mark completed checkpoints in prp.md section 7
- **DOD Verification**: Verify all Definition of Done criteria are met for the milestone
- **Acceptance Testing**: Run tests based on acceptance test cases defined in prp.md section 9
- **Security Compliance**: Ensure all Security Basics (section 7) are satisfied
- **Constraint Verification**: Confirm all technical and business constraints (section 8) are respected

**Rationale**: The PRP serves as the single source of truth for project requirements. Tracking progress against its checkpoints ensures the implementation stays aligned with the original vision and that no acceptance criteria are missed.

### VII. Demo & Handoff (NON-NEGOTIABLE)

After completing any feature implementation, developers MUST perform an end-to-end demonstration in headfull mode to verify system stability and report progress. Before considering a feature complete:

- **E2E Happy Flow Testing**: Run the complete user journey in headfull mode (visible browser) from start to finish
  - Execute all critical paths: signup/login, core feature interaction, expected outcomes
  - Verify the system works normally and remains stable throughout the flow
  - Capture screenshots or video evidence of successful completion
- **Progress Reporting**: Document and communicate what has been accomplished to stakeholders (Lutfi)
  - Provide a clear summary of the feature's functionality
  - Confirm the system is working as expected
  - Note any observed issues or areas needing attention
- **Integration Coordination**: If the feature requires external integrations that need manual setup:
  - Clearly identify what manual actions are required from stakeholders
  - Request assistance from Lutfi for logins to third-party apps, API keys, or other credentials
  - Do not bypass or skip integration testing - wait for necessary access

**Rationale**: Headfull E2E testing provides the ultimate validation that the system works end-to-end in a real browser environment. It catches issues that automated tests might miss (visual rendering, timing issues, third-party integration problems) and gives stakeholders confidence that the feature is production-ready. Clear reporting ensures alignment on progress and manual integration needs prevent security risks from hardcoded credentials.

## Additional Constraints

### Technology Stack Requirements

- **Runtime**: Bun 1.x with Turborepo for monorepo management
- **Frontend**: React 18 with Vite, TanStack Router, and Tailwind CSS
- **Backend**: Hono framework running on Cloudflare Workers
- **Database**: Cloudflare D1 (SQLite) with Drizzle ORM
- **Auth**: Arctic for Discord OAuth, Oslo for cryptographic utilities
- **Payments**: Midtrans SDK for Indonesian payment methods
- **Testing**: Playwright for E2E testing (configured for both web and API testing)

### Compliance Standards

- Payment processing MUST comply with PCI-DSS requirements (delegate to Midtrans)
- User data MUST be handled per applicable privacy regulations
- Discord bot MUST respect Discord's Terms of Service and API rate limits

## Development Workflow

### Code Review Requirements

- All PRs require at least one reviewer approval before merge
- PRs MUST pass all tests (including E2E) and linting before approval
- PRs MUST include prp.md checkpoint updates for completed milestones
- Security-sensitive changes require additional security review
- Breaking changes MUST have a migration strategy documented

### Quality Gates

- `bun test` - All unit and integration tests must pass
- `bunx playwright test` - All E2E tests must pass
- `npm run lint` - No linting errors (use configured Biome/ESLint rules)
- TypeScript compilation must succeed with no type errors
- prp.md checkpoints must be updated and verified

### Testing Expectations

- **Every Phase**: E2E tests MUST be written and passing before phase completion
- **Every Task**: PRP checkpoints MUST be updated and DOD verified after completion
- **Every Feature**: Headfull E2E demo MUST be performed to report completion and verify stability
- New features SHOULD include unit tests for business logic
- API endpoints SHOULD include integration tests
- Critical user flows MUST include end-to-end tests
- Tests MUST be independent and can run in any order

### PRP Checkpoint Process

1. **Before Implementation**: Review the relevant checkpoint in prp.md section 7
2. **During Implementation**: Reference acceptance criteria from prp.md section 9
3. **After Implementation**:
   - Run tests to verify acceptance criteria are met
   - Update the checkpoint in prp.md (mark completed items)
   - Verify DOD requirements are satisfied
   - Document any deviations or blockers

### Demo & Handoff Process

1. **Feature Complete**: All code written, tests passing, PRP checkpoints updated
2. **Headfull E2E Demo**:
   - Launch Playwright in headfull mode (`npx playwright test --ui` or `--headed`)
   - Execute the complete happy path user journey
   - Verify stability and correct behavior at each step
3. **Report to Lutfi**:
   - Summarize what was accomplished
   - Confirm system is working normally and stable
   - Flag any integration needs that require Lutfi's assistance
4. **Wait for Integration**: If third-party app logins or credentials are needed, coordinate with Lutfi before marking complete

## Governance

This constitution supersedes all other development practices and guidelines. Amendments follow this process:

1. Proposed changes MUST be documented with rationale
2. Changes MUST be reviewed and approved by project maintainers
3. Major amendments (new principles or governance changes) require team consensus
4. Migration plans MUST be provided for breaking changes

**Compliance Verification**: All pull requests and code reviews MUST verify adherence to these principles. Violations MUST be corrected before merge.

**Runtime Guidance**: Refer to `README.md`, `prp.md`, and feature specification documents for detailed implementation guidance.

**Version**: 1.3.0 | **Ratified**: 2025-12-31 | **Last Amended**: 2026-01-03
