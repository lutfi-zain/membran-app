# Implementation Plan: Discord Bot Invitation & Server Connection

**Branch**: `003-discord-bot-connection` | **Date**: 2025-12-30 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-discord-bot-connection/spec.md`

## Summary

This plan implements Discord bot invitation via OAuth2, server connection management, and bot status verification. Server owners can invite the membran.app bot to their Discord servers as part of onboarding, view connection status, and reconnect if needed. The implementation uses Discord's OAuth2 authorization code flow with bot scope, stores OAuth tokens for API access, and provides full observability for bot operations.

## Technical Context

**Language/Version**: TypeScript / Bun 1.x
**Primary Dependencies**: Hono, Drizzle ORM, TanStack Query, Arctic (Discord OAuth), Oslo (crypto utils), Zod
**Storage**: Cloudflare D1 (SQLite)
**Testing**: Bun test (Unit/Integration)
**Target Platform**: Cloudflare Workers (API), Cloudflare Pages (Web)
**Project Type**: Web application (Monorepo)
**Performance Goals**: OAuth flow < 2 minutes, Status sync within 10 seconds
**Constraints**: Cloudflare Worker runtime (no Node.js native modules), MVP 100 server owners max
**Scale/Scope**: 100 server owners, 1,000 members per server (MVP)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

1. **Edge-First Architecture**: Uses Hono + D1. Bot OAuth logic resides in Workers. (PASS)
2. **Strict Type Safety**: Zod for OAuth callback validation and bot status responses. (PASS)
3. **Monorepo Structure**: Logic shared via `packages/shared` and `packages/db`. (PASS)
4. **Security & Privacy**: OAuth2 state parameter for CSRF, tokens encrypted at rest, permission validation. (PASS)
5. **Quality Assurance**: Unit tests for Discord API client, integration tests for OAuth flow. (PASS)
6. **Observability**: Structured logging, metrics dashboards, distributed tracing per spec clarification. (PASS)
7. **Accessibility**: WCAG 2.1 AA compliance for all UI components. (PASS)

**Post-Design Verification**: All design artifacts (data-model, contracts) adhere to core principles. No violations detected.

## Project Structure

### Documentation (this feature)

```text
specs/003-discord-bot-connection/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── bot-connection.md
└── tasks.md             # Phase 2 output (created by /speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── api/ (Hono)
│   ├── src/
│   │   ├── routes/
│   │   │   ├── bot.ts          # NEW: Bot OAuth & status endpoints
│   │   │   └── auth.ts         # EXISTING: May need minor updates
│   │   ├── lib/
│   │   │   └── discord-bot.ts  # NEW: Discord API client helpers
│   │   └── middleware/
│   │       └── rate-limit.ts   # UPDATE: Add bot endpoint limits
│   └── tests/
│       └── integration/
│           └── bot-oauth.test.ts  # NEW: E2E OAuth flow tests
│
└── web/ (React + Vite)
    ├── src/
    │   ├── components/
    │   │   └── bot/
    │   │       ├── BotInviteButton.tsx    # NEW: OAuth initiation
    │   │       ├── ConnectionStatus.tsx   # NEW: Status display
    │   │       └── PermissionWarning.tsx  # NEW: Permission alerts
    │   ├── pages/
    │   │   └── onboarding/
    │   │       └── bot.tsx                # NEW: Bot invitation page
    │   └── hooks/
    │       └── useBotConnection.ts        # NEW: Bot state hook
    └── tests/
        └── components/bot/                 # NEW: Component tests

packages/
├── db/ (Drizzle + D1)
│   └── schema/
│       ├── users.ts                        # EXISTING
│       ├── sessions.ts                     # EXISTING
│       └── discord-servers.ts              # NEW: DiscordServer schema
│
└── shared/ (Zod schemas)
    ├── auth.ts                              # EXISTING
    └── bot.ts                               # NEW: Bot response schemas
```

**Structure Decision**: Monorepo structure following existing pattern from 002-auth-refinement. Bot connection feature follows the same architectural principles.

## Complexity Tracking

> No violations - this section is empty as all Constitution Checks passed.

---

## Phase 0: Research & Technical Decisions

**Status**: ✅ Complete (see [research.md](./research.md))

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| Discord OAuth2 with `bot` scope | Only supported method for server invitation |
| REST API + Polling for status | Works on Cloudflare Workers; Gateway (WebSocket) not viable |
| Arctic library for OAuth | Already in project; handles both user and bot flows |
| Linear backoff (5s, 10s, 15s) with 60s timeout | Balances resilience with user patience |
| Encrypted token storage in D1 | No native encryption; application-level encryption required |
| WCAG 2.1 AA compliance | Per spec clarification; industry standard |

### Technology Choices

| Component | Technology | Alternative Considered | Why Selected |
|-----------|------------|----------------------|--------------|
| OAuth2 Client | Arctic | Discord.js, discord OAuth2 module | Already in project, lightweight |
| State Storage | D1 table | Cloudflare KV | Simpler, consistent with other data |
| Permission Validation | Discord REST API | Gateway events | Works on Workers, simpler |
| Observability | Cloudflare Analytics + structured logs | Datadog, New Relic | Native to platform, zero cost |

---

## Phase 1: Design Artifacts

**Status**: ✅ Complete

### Data Model

**File**: [data-model.md](./data-model.md)

**New Table**: `discord_servers`
- 13 columns including encrypted tokens, bot status, permission flags
- One-to-one relationship with `users` (MVP constraint)
- State machine: Pending → Connected ↔ Disconnected

### API Contracts

**File**: [contracts/bot-connection.md](./contracts/bot-connection.md)

**Endpoints**:
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/bot/invite` | POST | Initiate OAuth flow |
| `/api/bot/callback` | GET | OAuth callback (Discord redirects) |
| `/api/bot/status` | GET | Get connection status |
| `/api/bot/validate-permissions` | POST | Check bot permissions |
| `/api/bot/reconnect` | POST | Reconnect after disconnect |
| `/api/bot/disconnect` | DELETE | Manual disconnect (admin) |
| `/api/bot/sync` | POST | Cron sync bot status |

### Quickstart Guide

**File**: [quickstart.md](./quickstart.md)

**Setup Steps**:
1. Add bot to Discord application
2. Configure environment variables (`.dev.vars`)
3. Generate and apply D1 migration
4. Start development server
5. Test OAuth flow

---

## Dependencies

### New npm Packages Required

None - all dependencies already in project from 002-auth-refinement:
- `arctic` - Discord OAuth2
- `drizzle-orm` - Database ORM
- `oslo` - Crypto utilities
- `hono` - API framework
- `zod` - Schema validation

### External Services

| Service | Purpose | Configuration Required |
|---------|---------|------------------------|
| Discord API | Bot OAuth, server info | Bot token, client ID, client secret, redirect URI |
| Cloudflare D1 | Token storage, server records | Database created, migrations applied |
| Cloudflare Workers | API hosting | Worker configured, environment variables set |
| Cloudflare Analytics | Metrics, logging | Built-in, no setup required |

---

## Success Criteria Mapping

| Spec SC | Implementation Target |
|---------|----------------------|
| SC-001: <2 min flow | OAuth redirects handled server-side, minimal client-side |
| SC-002: 10s sync | Cron job every 5 minutes, manual sync on demand |
| SC-003: 95% success | Retry logic, clear error messages, validation |
| SC-004: 100% CSRF | State parameter with Oslo crypto, 5-minute expiration |
| SC-005: View status anytime | `/api/bot/status` endpoint, dashboard component |
| SC-006: 100 concurrent | Cloudflare Workers auto-scales, D1 handles load |
| SC-007: Observability | Structured JSON logs, Cloudflare Analytics dashboard |
| SC-008: 95% retry success | Linear backoff (5s, 10s, 15s), 5 retries, 60s timeout |
| SC-009: WCAG 2.1 AA | Semantic HTML, ARIA attributes, keyboard nav, 4.5:1 contrast |
| SC-010: 99% uptime | Cloudflare reliability, external monitoring |

---

## Migration Plan

### Database Changes

**New Migration**: `0002_create_discord_servers.sql`

```sql
CREATE TABLE discord_servers (
  id TEXT PRIMARY KEY,
  discord_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  icon TEXT,
  member_count INTEGER NOT NULL DEFAULT 0,
  bot_status TEXT NOT NULL DEFAULT 'Pending',
  bot_added_at INTEGER NOT NULL,
  permissions TEXT NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_expires_at INTEGER NOT NULL,
  user_id TEXT NOT NULL UNIQUE REFERENCES users(id),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_discord_servers_user_id ON discord_servers(user_id);
CREATE INDEX idx_discord_servers_discord_id ON discord_servers(discord_id);
```

### Application Changes

No breaking changes to existing functionality. All changes are additive:
- New API routes under `/api/bot/*`
- New database table (no schema changes to existing tables)
- New React components (independent of existing auth flow)

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Discord API changes | Use official Arctic library, monitor Discord changelog |
| OAuth state replay | Short expiration (5 min), one-time use tokens |
| Token leakage | Encrypt at rest, never log tokens, rotate on compromise |
| Rate limiting | Linear backoff with jitter, respect `Retry-After` header |
| Bot removed externally | Periodic sync via cron, status checks on dashboard load |

---

## Next Steps

1. **Run `/speckit.tasks`** to generate the task breakdown
2. **Implement backend routes** following `contracts/bot-connection.md`
3. **Create frontend components** for bot invitation UI
4. **Write tests** for OAuth flow, permission validation, status sync
5. **Deploy to staging** and test with real Discord server
6. **Monitor metrics** via Cloudflare Analytics dashboard

---

**Status**: Phase 1 (Design & Contracts) complete. Ready for `/speckit.tasks` to generate implementation tasks.
