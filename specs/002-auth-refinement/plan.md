# Implementation Plan: Auth Refinement: Account Connection and Verification

**Branch**: `002-auth-refinement` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-auth-refinement/spec.md`

## Summary

This plan refines the authentication system by adding missing critical flows: email verification handling and post-registration Discord account connection. It ensures a smooth onboarding experience while maintaining high security standards and following the "Soft Verification" model.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x  
**Primary Dependencies**: Hono, Drizzle ORM, TanStack Query, Arctic (OAuth), Oslo (Auth utils), Zod  
**Storage**: Cloudflare D1 (SQLite)  
**Testing**: Bun test (Unit/Integration)  
**Target Platform**: Cloudflare Workers (API), Cloudflare Pages (Web)
**Project Type**: Web application (Monorepo)  
**Performance Goals**: Verification processing < 1s, Connection flow < 45s  
**Constraints**: Cloudflare Worker runtime (No Node.js native modules)  
**Scale/Scope**: Refinement of existing auth system, secure token management.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Edge-First Architecture**: Uses Hono + D1. Verification logic resides in Workers. (PASS)
2. **Strict Type Safety**: Zod for token validation and Discord callback data. (PASS)
3. **Monorepo Structure**: Logic shared via `packages/shared` and `packages/db`. (PASS)
4. **Security & Privacy**: Tokens are hashed (Oslo). Discord ID linking checked for uniqueness. CSRF mandatory. (PASS)
5. **Quality Assurance**: Unit tests for token validation and integration tests for connection flow. (PASS)

**Post-Design Verification**: All design artifacts (data-model, contracts) adhere to core principles. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/002-auth-refinement/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── auth-refinement.md
└── tasks.md             # Phase 2 output
```

### Source Code (repository root)

```text
apps/
├── api/ (Hono)
│   ├── src/
│   │   ├── routes/auth.ts
│   │   ├── middleware/session.ts
│   │   └── index.ts
│   └── tests/
└── web/ (React + Vite)
    ├── src/
    │   ├── components/auth/
    │   │   └── VerificationBanner.tsx
    │   ├── pages/settings/
    │   │   └── index.tsx
    │   └── hooks/useAuth.ts

packages/
├── db/ (Drizzle + D1)
│   └── schema/
│       ├── users.ts
│       └── sessions.ts
└── shared/ (Zod schemas)
    └── auth.ts
```

**Structure Decision**: Monorepo structure following Constitution Principle III.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
