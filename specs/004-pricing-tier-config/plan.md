# Implementation Plan: Pricing Tier Configuration

**Branch**: `004-pricing-tier-config` | **Date**: 2025-12-31 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-pricing-tier-config/spec.md`

## Summary

Server owners need to configure 1-5 pricing tiers for their Discord server's premium membership offerings. Each tier defines a subscription price point, the Discord role granted upon subscription, and the features included (0-20 features per tier). The system will use the existing TypeScript / Bun 1.x + Hono backend with Drizzle ORM on Cloudflare Workers D1 database.

## Technical Context

**Language/Version**: TypeScript 5.x / Bun 1.x
**Primary Dependencies**: Hono (API framework), Drizzle ORM (database), TanStack Query (React data fetching), Zod (validation)
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Bun test (`bun test`)
**Target Platform**: Cloudflare Workers (API), Vite dev server (Web frontend)
**Project Type**: Web application (backend + frontend)
**Performance Goals**: API responses <200ms p95, UI updates within 100ms
**Constraints**: Maximum 5 tiers per server, maximum 20 features per tier, price range $0-$999
**Scale/Scope**: ~1000 servers initially, ~5-10 tiers per server on average

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is in template form and does not yet define specific principles. Based on the existing codebase patterns, the following conventions should be followed:

1. **Database Schema**: Use Drizzle ORM with snake_case table names and camelCase column names
2. **API Routes**: Place in `apps/api/src/routes/` with kebab-case filenames
3. **Components**: Place in `apps/web/src/components/` with PascalCase filenames
4. **Validation**: Use Zod schemas for all input validation
5. **Testing**: Co-locate tests with source files using `.test.ts` suffix
6. **Error Handling**: Return structured errors with `error` code and `message`

No violations detected. The existing codebase follows consistent patterns that this feature will extend.

## Project Structure

### Documentation (this feature)

```text
specs/004-pricing-tier-config/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api.yaml         # OpenAPI specification for pricing tier endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Database Schema (packages/db/src/schema/)
pricing_tiers.ts         # New: pricing_tiers table definition
tier_features.ts         # New: tier_features table definition
discord_roles.ts         # New: discord_roles table (synced from Discord)
subscriptions.ts         # New: subscriptions table (referenced by tiers)

# API Routes (apps/api/src/routes/)
pricing.ts               # New: Pricing tier CRUD endpoints

# API Libraries (apps/api/src/lib/)
pricing-tiers.ts         # New: Business logic for tier operations
discord-roles.ts         # New: Discord role sync and validation

# Frontend Components (apps/web/src/components/)
pricing/
  ├── TierForm.tsx       # New: Create/edit tier form
  ├── TierList.tsx       # New: Display configured tiers
  ├── TierCard.tsx       # New: Single tier display
  ├── FeatureList.tsx    # New: Feature items editor
  └── RoleSelector.tsx   # New: Discord role dropdown

# Frontend Pages (apps/web/src/pages/)
onboarding/
  └── pricing/
      └── index.tsx      # New: Tier configuration onboarding step
settings/
  └── pricing.tsx        # New: Tier configuration settings page

# Shared Types (packages/shared/src/)
pricing.ts               # New: Zod schemas and TypeScript types
```

**Structure Decision**: Web application structure with backend (Hono/Cloudflare Workers) and frontend (React/Vite). This matches the existing codebase pattern. The new pricing tier feature extends both backend (new database tables, API routes) and frontend (new components, pages).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | N/A |
