# Tasks: Discord Bot Invitation & Server Connection

**Input**: Design documents from `/specs/003-discord-bot-connection/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/bot-connection.md

**Tests**: Tests are NOT included in this specification unless explicitly requested. Each task should be verifiable through manual testing per quickstart.md.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- Monorepo structure: `apps/api/`, `apps/web/`, `packages/db/`, `packages/shared/`
- Backend: Hono routes in `apps/api/src/routes/`
- Frontend: React components in `apps/web/src/components/`
- Database: Drizzle schemas in `packages/db/src/schema/`
- Shared types: Zod schemas in `packages/shared/src/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure for bot connection feature

- [x] T001 Create bot connection directory structure in apps/web/src/components/bot/ and apps/web/src/pages/onboarding/bot/
- [x] T002 [P] Add Discord bot environment variables to apps/api/.dev.vars (DISCORD_BOT_TOKEN, ENCRYPTION_KEY per quickstart.md)
- [x] T003 [P] Generate and apply D1 migration for discord_servers table using `bun run db:generate` and `npx wrangler d1 migrations apply membran-db --local`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create DiscordServer Drizzle schema in packages/db/src/schema/discord-servers.ts with 13 columns per data-model.md
- [x] T005 [P] Export discordServers from packages/db/src/schema/index.ts
- [x] T006 [P] Create shared Zod schemas for bot responses in packages/shared/src/bot.ts (BotStatusResponse, DiscordServer types per contracts/bot-connection.md)
- [x] T007 Create Discord API client library in apps/api/src/lib/discord-bot.ts with fetchWithRetry helper (60s timeout, linear backoff per research.md)
- [x] T008 Implement token encryption utilities in apps/api/src/lib/encryption.ts using Oslo crypto (encrypt/decrypt for D1 storage per research.md)
- [x] T009 Create OAuth state storage utilities in apps/api/src/lib/oauth-state.ts for D1-backed state management (5-minute expiration per research.md)
- [x] T010 [P] Add bot endpoint rate limiting rules to apps/api/src/middleware/rate-limit.ts per contracts/bot-connection.md rate limiting section
- [x] T011 Create structured logging utility in apps/api/src/lib/logger.ts for bot operations with trace IDs per research.md observability section

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Bot Invitation via OAuth2 (Priority: P1) 🎯 MVP

**Goal**: Enable server owners to invite the membran.app bot to their Discord server via OAuth2 authorization flow as part of onboarding

**Independent Test**: Create a new server owner account, navigate to onboarding bot invitation step, click "Invite Bot to Server", complete Discord's OAuth2 authorization flow, and verify the bot appears in their Discord server with correct permissions (Manage Roles, View Channel)

### Implementation for User Story 1

- [x] T012 [P] [US1] Create BotInviteButton React component in apps/web/src/components/bot/BotInviteButton.tsx with WCAG 2.1 AA compliance (keyboard nav, ARIA labels, 4.5:1 contrast)
- [x] T013 [P] [US1] Create onboarding bot invitation page in apps/web/src/pages/onboarding/bot/index.tsx with BotInviteButton integration
- [x] T014 [P] [US1] Create useBotConnection hook in apps/web/src/hooks/useBotConnection.ts for bot state management using TanStack Query
- [x] T015 [P] [US1] Add loading states to BotInviteButton and onboarding page in apps/web/src/components/bot/BotInviteButton.tsx and apps/web/src/pages/onboarding/bot/index.tsx for rate limit handling ("Processing..." indicator per spec.md edge case)
- [x] T016 [US1] Implement POST /api/bot/invite endpoint in apps/api/src/routes/bot.ts to initiate OAuth flow (check existing connection, generate state, return authorizationUrl)
- [x] T017 [US1] Implement GET /api/bot/callback endpoint in apps/api/src/routes/bot.ts to handle OAuth callback from Discord (validate state, exchange code for tokens, fetch server info)
- [x] T018 [US1] Implement Discord server info fetch in apps/api/src/lib/discord-bot.ts (getGuildInfo function using bot token per research.md)
- [x] T019 [US1] Implement createDiscordServer function in apps/api/src/lib/db/discord-servers.ts to store server record with encrypted tokens (check one-to-one constraint per data-model.md)
- [x] T020 [US1] Add OAuth error handling in apps/api/src/routes/bot.ts callback handler for access_denied, invalid_state, expired_code errors per FR-006
- [x] T021 [US1] Emit structured logs for OAuth initiation and bot join events in apps/api/src/routes/bot.ts using logger.ts (trace ID propagation per research.md)

**Checkpoint**: At this point, User Story 1 should be fully functional - server owners can invite bot via OAuth and see bot join their Discord server

---

## Phase 4: User Story 2 - Server Connection Status Verification (Priority: P2)

**Goal**: Enable server owners to view their Discord server connection status at any time from their dashboard with accurate server info and permission validation

**Independent Test**: Successfully invite the bot, then navigate to the dashboard/settings page to view the server connection status, which should show "Connected" with server name, icon, member count, and bot added date

### Implementation for User Story 2

- [x] T022 [P] [US2] Create ConnectionStatus React component in apps/web/src/components/bot/ConnectionStatus.tsx with WCAG 2.1 AA compliance (semantic HTML, aria-live status updates)
- [x] T023 [P] [US2] Create PermissionWarning React component in apps/web/src/components/bot/PermissionWarning.tsx for insufficient permission alerts
- [x] T024 [US2] Implement GET /api/bot/status endpoint in apps/api/src/routes/bot.ts to return connection status with server info (discordId, name, icon, memberCount, botStatus, botAddedAt)
- [x] T025 [US2] Implement recentlyConnected calculation in apps/api/src/routes/bot.ts status endpoint (true if botAddedAt within 24 hours per spec.md)
- [x] T026 [US2] Implement POST /api/bot/validate-permissions endpoint in apps/api/src/routes/bot.ts to check bot has required permissions (MANAGE_ROLES, VIEW_CHANNEL per FR-012)
- [x] T027 [US2] Implement permission flag validation in apps/api/src/lib/discord-bot.ts (hasRequiredPermissions function per data-model.md validation rules)
- [x] T028 [US2] Add permission validation to status response in apps/api/src/routes/bot.ts (include permissionsValid and permissionsWarnings fields)
- [x] T029 [US2] Create settings/bot status page integration in apps/web/src/pages/settings/bot.tsx to display ConnectionStatus and PermissionWarning components

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - server owners can invite bot and view connection status anytime

---

## Phase 5: User Story 3 - Bot Reconnection After Removal (Priority: P3)

**Goal**: Enable server owners to reconnect the bot after it was manually removed from their Discord server without going through full onboarding again

**Independent Test**: Manually remove the bot from the Discord server, then navigate to settings and click "Reconnect Bot", complete OAuth2 flow, and verify the connection is restored with existing server configuration preserved

### Implementation for User Story 3

- [x] T030 [P] [US3] Add reconnect button to ConnectionStatus component in apps/web/src/components/bot/ConnectionStatus.tsx (shown only when botStatus is Disconnected)
- [x] T031 [US3] Implement POST /api/bot/reconnect endpoint in apps/api/src/routes/bot.ts to initiate new OAuth flow for existing disconnected server
- [x] T032 [US3] Add bot status validation to reconnect endpoint in apps/api/src/routes/bot.ts (return 400 if bot is Currently Connected per contracts/bot-connection.md)
- [x] T033 [US3] Implement updateDiscordServer function in apps/api/src/lib/db/discord-servers.ts to update tokens and server info on reconnect (preserve existing configuration per US3 acceptance scenario 2)
- [x] T034 [US3] Implement server change detection in apps/api/src/routes/bot.ts callback (if reconnecting to different server, prompt for reconfiguration per US3 acceptance scenario 3)
- [x] T035 [US3] Add reconnect logging in apps/api/src/routes/bot.ts (log bot_reconnected event with trace ID per research.md observability)

**Checkpoint**: All user stories should now be independently functional - server owners can invite bot, view status, and reconnect after removal

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and operational readiness

- [x] T036 [P] Implement DELETE /api/bot/disconnect endpoint in apps/api/src/routes/bot.ts for manual admin disconnect (requires confirm: true per contracts/bot-connection.md)
- [x] T037 [P] Implement POST /api/bot/sync endpoint in apps/api/src/routes/bot.ts for cron-triggered status sync (Bearer auth with CRON_SECRET per contracts/bot-connection.md)
- [x] T038 [P] Implement bot guild list fetch in apps/api/src/lib/discord-bot.ts (getCurrentUserGuilds function using bot token per research.md)
- [x] T039 [P] Implement status sync logic in apps/api/src/routes/bot.ts sync endpoint (update botStatus based on guild list presence, return sync summary)
- [x] T040 Add Cloudflare Workers cron trigger configuration to apps/api/wrangler.toml for /api/bot/sync endpoint (5-minute interval per quickstart.md)
- [x] T041 [P] Add metrics collection to apps/api/src/lib/logger.ts (connection success rate, flow duration, error counts per research.md observability section)
- [x] T042 Add accessibility testing instructions to quickstart.md (Lighthouse CLI command for WCAG 2.1 AA validation per research.md)
- [x] T043 [P] Create production deployment checklist in quickstart.md (Discord redirect URI update, ENCRYPTION_KEY secret, external monitoring setup per quickstart.md production checklist)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (US1 → US2 → US3)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - Uses same bot routes as US1 but independent endpoints (/status, /validate-permissions)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - Depends on US1 callback handler for reconnection flow

### Within Each User Story

- Models/libraries before endpoints
- Backend endpoints before frontend components
- Core implementation before error handling/logging
- Story complete before moving to next priority

### Parallel Opportunities

- **Setup Phase**: T002, T003 can run in parallel
- **Foundational Phase**: T005, T006, T010 can run in parallel (after T004)
- **User Story 1**: T012, T013, T014, T015 can run in parallel (frontend); T018 can run in parallel with T016/T017
- **User Story 2**: T022, T023 can run in parallel (frontend)
- **User Story 3**: T030 can run in parallel with T031-T034
- **Polish Phase**: T036, T038, T041, T042, T043 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch all frontend components for User Story 1 together:
Task: "Create BotInviteButton React component in apps/web/src/components/bot/BotInviteButton.tsx"
Task: "Create onboarding bot invitation page in apps/web/src/pages/onboarding/bot/index.tsx"
Task: "Create useBotConnection hook in apps/web/src/hooks/useBotConnection.ts"

# Launch backend endpoints in parallel (after lib is ready):
Task: "Implement POST /api/bot/invite endpoint in apps/api/src/routes/bot.ts"
Task: "Implement Discord server info fetch in apps/api/src/lib/discord-bot.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T011) - CRITICAL BLOCKER
3. Complete Phase 3: User Story 1 (T012-T021)
4. **STOP and VALIDATE**: Test OAuth flow independently per quickstart.md Section 7
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add Polish → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T012-T021)
   - Developer B: User Story 2 (T022-T029)
   - Developer C: User Story 3 (T030-T035)
3. Stories complete and integrate independently

---

## Summary

| Phase | Task Range | Tasks | Focus |
|-------|------------|-------|-------|
| Phase 1: Setup | T001-T003 | 3 | Directory structure, environment, migration |
| Phase 2: Foundational | T004-T011 | 8 | Schema, shared types, Discord client, encryption, logging |
| Phase 3: US1 - Bot Invitation | T012-T021 | 10 | OAuth flow, server connection, loading states (MVP) |
| Phase 4: US2 - Status Verification | T022-T029 | 8 | Status display, permission validation |
| Phase 5: US3 - Reconnection | T030-T035 | 6 | Reconnect flow, status updates |
| Phase 6: Polish | T036-T043 | 8 | Admin operations, sync, metrics, deployment |
| **Total** | **T001-T043** | **43** | Full feature implementation |

**MVP Scope**: Phases 1-3 (Tasks T001-T021 = 21 tasks) - Bot invitation via OAuth2

**Independent Test Criteria**:
- US1: Complete OAuth flow, bot joins Discord server with permissions
- US2: View connection status with server details and permission warnings
- US3: Reconnect bot after removal, configuration preserved

**Format Validation**: All 43 tasks follow checklist format:
- ✅ Checkbox prefix: `- [ ]`
- ✅ Task ID: T001-T043 sequential
- ✅ [P] marker: Applied where appropriate
- ✅ [Story] label: Applied to US1/US2/US3 tasks only
- ✅ File paths: Included in all applicable tasks
