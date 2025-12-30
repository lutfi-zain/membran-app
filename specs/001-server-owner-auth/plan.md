# Implementation Plan: Server Owner Registration & Authentication

**Branch**: `001-server-owner-auth` | **Date**: 2025-12-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-server-owner-auth/spec.md`

## Summary

Implement a robust registration and authentication system for Server Owners, supporting both traditional Email/Password credentials and Discord OAuth. The system will leverage a monorepo structure with a Hono-based API running on Cloudflare Workers, a React frontend on Cloudflare Pages, and Cloudflare D1 for persistent storage.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x  
**Primary Dependencies**: Hono, Drizzle ORM, TanStack Router, TanStack Query (Frontend), Arctic (OAuth), Oslo (Auth utils), Zod  
**Storage**: Cloudflare D1 (SQLite)  
**Testing**: Bun test (Unit/Integration)  
**Target Platform**: Cloudflare Workers (API), Cloudflare Pages (Web)
**Project Type**: Web application (Monorepo)  
**Performance Goals**: Login response < 1s, Registration flow < 60s  
**Constraints**: Cloudflare Worker runtime (V8 isolates), No Node.js native modules  
**Scale/Scope**: Initial owner onboarding, secure session management (7 days)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Edge-First Architecture**: Uses Hono + D1. (PASS)
2. **Strict Type Safety**: TS + Zod mandatory. (PASS)
3. **Monorepo Structure**: apps/web, apps/api, packages/shared, packages/db. (PASS)
4. **Security & Privacy**: Zero-trust inputs, Secrets in Env. (PASS)
5. **Quality Assurance**: Bun test for critical paths. (PASS)

**Post-Design Verification**: All design artifacts (data-model, contracts) adhere to core principles. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/001-server-owner-auth/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
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
    │   ├── pages/signup/
    │   ├── pages/login/
    │   └── hooks/useAuth.ts
    └── tests/

packages/
├── db/ (Drizzle + D1)
│   └── schema/
│       ├── users.ts
│       └── sessions.ts
└── shared/ (Zod schemas)
    └── auth.ts
```

**Structure Decision**: Web application (Option 2) adjusted for Monorepo structure defined in Constitution.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |
