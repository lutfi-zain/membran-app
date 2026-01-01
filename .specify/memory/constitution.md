<!--
Sync Impact Report
==================
Version change: 1.0.0 → 1.1.0

Modified principles:
- Testing Discipline: Expanded to require E2E testing for every implementation phase

Added sections:
- E2E Testing Per Phase requirement (under Testing Discipline)
- Explicit Phase Gate Testing definition

Removed sections: None

Templates requiring updates:
- .specify/templates/plan-template.md ✅ updated (added E2E testing gate requirements)
- .specify/templates/spec-template.md ✅ (no changes needed - testing section exists)
- .specify/templates/tasks-template.md ✅ (already supports test task categorization)

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
- Write or update relevant tests (unit, integration, or end-to-end as appropriate)
- Run the full test suite to verify all tests pass
- Ensure no regressions are introduced

**Rationale**: Comprehensive testing prevents regressions, ensures code quality, and provides confidence in deployments. E2E testing at phase gates catches integration issues early, validates user flows end-to-end, and verifies the complete system works as designed before building more features on top. This applies equally to React frontend components and Hono backend endpoints.

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
- Security-sensitive changes require additional security review
- Breaking changes MUST have a migration strategy documented

### Quality Gates

- `bun test` - All unit and integration tests must pass
- `bunx playwright test` - All E2E tests must pass
- `npm run lint` - No linting errors (use configured Biome/ESLint rules)
- TypeScript compilation must succeed with no type errors

### Testing Expectations

- **Every Phase**: E2E tests MUST be written and passing before phase completion
- New features SHOULD include unit tests for business logic
- API endpoints SHOULD include integration tests
- Critical user flows MUST include end-to-end tests
- Tests MUST be independent and can run in any order

## Governance

This constitution supersedes all other development practices and guidelines. Amendments follow this process:

1. Proposed changes MUST be documented with rationale
2. Changes MUST be reviewed and approved by project maintainers
3. Major amendments (new principles or governance changes) require team consensus
4. Migration plans MUST be provided for breaking changes

**Compliance Verification**: All pull requests and code reviews MUST verify adherence to these principles. Violations MUST be corrected before merge.

**Runtime Guidance**: Refer to `README.md` and feature specification documents for detailed implementation guidance.

**Version**: 1.1.0 | **Ratified**: 2025-12-31 | **Last Amended**: 2025-12-31
