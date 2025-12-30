# Feature Specification: Discord Bot Invitation & Server Connection

**Feature Branch**: `003-discord-bot-connection`
**Created**: 2025-12-30
**Status**: Draft
**Input**: User description: "Discord bot invitation + server connection from @prp.md"

## Clarifications

### Session 2025-12-30

- Q: What level of observability (logging, metrics, tracing) should be implemented for bot operations? → A: Full observability - structured logging, metrics dashboards, distributed tracing for all bot operations
- Q: What timeout and retry behavior should Discord API calls use when rate limited or failing? → A: 60 second timeout, linear backoff (5s, 10s, 15s), max 5 retries
- Q: What is the target scale for MVP in terms of server owner count and member count per server? → A: Small scale - 100 server owners, 1,000 members per server maximum
- Q: What accessibility standard should the bot connection UI components comply with? → A: WCAG 2.1 AA compliance - keyboard navigation, screen reader support, minimum color contrast
- Q: What is the target uptime SLA for the bot connection service? → A: 99% uptime (~7.3 hours downtime/month) - basic reliability, acceptable for beta

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bot Invitation via OAuth2 (Priority: P1)

A server owner who has just signed up wants to connect the membran.app bot to their Discord server as part of the onboarding flow.

**Why this priority**: Essential for the core value proposition - without bot connection, no role automation or subscription management is possible. This is the entry point for all server owners.

**Independent Test**: Can be tested by creating a new server owner account, navigating to onboarding, clicking "Invite Bot" button, completing Discord's OAuth2 authorization flow, and verifying the bot appears in their Discord server with correct permissions.

**Acceptance Scenarios**:

1. **Given** a logged-in server owner on the onboarding bot invitation step, **When** they click "Invite Bot to Server", **Then** they are redirected to Discord's OAuth2 authorization page with the correct permissions requested (bot scope, specific guild permissions).
2. **Given** a server owner who authorizes the bot on Discord's authorization page, **When** they are redirected back to membran.app, **Then** their Discord server is successfully connected (bot joins, server info is stored) and they advance to the next onboarding step.
3. **Given** a server owner who cancels or denies the Discord authorization, **When** they return to membran.app, **Then** they see an error message explaining bot connection is required and remain on the invitation step.

---

### User Story 2 - Server Connection Status Verification (Priority: P2)

A server owner wants to verify that their Discord server is properly connected and view the connection status at any time from their dashboard.

**Why this priority**: Important for user confidence and troubleshooting - server owners need to know the bot is working correctly. Can be built after the core invitation flow works.

**Independent Test**: Can be tested by inviting the bot successfully, then navigating to the dashboard/settings page to view the server connection status, which should show as "Connected" with server name and member count.

**Acceptance Scenarios**:

1. **Given** a server owner with a successfully connected bot, **When** they view the server connection status, **Then** they see "Connected" status with the Discord server name, icon, member count, and the date the bot was added.
2. **Given** a server owner whose bot has been removed from their Discord server manually, **When** they view the connection status, **Then** they see "Disconnected" status with an option to reconnect the bot.
3. **Given** a server owner viewing connection status, **When** the bot was added within the last 24 hours, **Then** they see a "Recently Connected" indicator.

---

### User Story 3 - Bot Reconnection After Removal (Priority: P3)

A server owner whose bot was manually removed from their Discord server (or who accidentally removed it) wants to reconnect without going through the full onboarding flow again.

**Why this priority**: Nice-to-have for recovery scenarios - server owners may accidentally remove the bot or Discord may have issues. Not blocking for MVP since re-onboarding works as a fallback.

**Independent Test**: Can be tested by manually removing the bot from a Discord server, then navigating to settings and clicking "Reconnect Bot", which should trigger a new OAuth2 flow and restore the connection.

**Acceptance Scenarios**:

1. **Given** a server owner with a disconnected bot status, **When** they click "Reconnect Bot", **Then** they are redirected to Discord's OAuth2 flow again.
2. **Given** a server owner who successfully reconnects the bot, **When** the OAuth flow completes, **Then** their server status updates to "Connected" and the existing server configuration (pricing tiers, Midtrans keys) is preserved.
3. **Given** a server owner attempting to reconnect to a different Discord server than originally connected, **When** they complete the OAuth flow, **Then** the system updates to the new server and they are prompted to reconfigure pricing tiers (since roles may differ).

---

### Edge Cases

- **Bot already invited**: Server owner clicks "Invite Bot" when bot is already in their server → System should detect existing connection and skip re-invitation, showing "Already connected" message.
- **Permissions downgrade**: Server owner manually reduces bot permissions in Discord server → System should detect insufficient permissions and show warning with instructions to restore permissions.
- **Server deletion**: Discord server is deleted while bot is still connected → System should mark server as "Disconnected" on next sync attempt and display disconnection notice on next user visit to dashboard.
- **Rate limiting**: Discord API rate limits during bot operations → System should queue operations and retry with linear backoff (5s, 10s, 15s delays), maximum 5 retries, 60-second timeout per API call, showing "Processing..." indicator to user.
- **Multiple server support**: Server owner attempts to connect bot to multiple Discord servers under one account → For MVP, one server per user account. Show error: "Each account manages one Discord server. Contact support for multi-server management."
- **OAuth flow interruption**: Server owner starts OAuth flow but closes browser mid-flow → System should handle incomplete state gracefully; no partial connection created.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an OAuth2 flow for Discord bot invitation using Discord's bot authorization scope.
- **FR-002**: System MUST request minimum required permissions from Discord: bot join, role management (manage roles), and read server info.
- **FR-003**: System MUST store Discord server information (ID, name, icon, member count) when bot successfully joins.
- **FR-004**: System MUST generate a unique OAuth2 state parameter for CSRF protection during the authorization flow.
- **FR-005**: System MUST validate the OAuth2 callback state parameter to prevent CSRF attacks.
- **FR-006**: System MUST handle OAuth2 authorization errors (access denied, expired code, invalid state).
- **FR-007**: System MUST update the server connection status to "Connected" only after successful bot join confirmation.
- **FR-008**: System MUST display the current connection status to the server owner in their dashboard/settings.
- **FR-009**: System MUST allow server owners to reconnect the bot if connection was lost or removed.
- **FR-010**: System MUST detect when bot has been removed from a Discord server and mark status as "Disconnected".
- **FR-011**: System MUST prevent connecting the same bot to multiple Discord servers per server owner account (MVP constraint: one-to-one relationship).
- **FR-012**: System MUST validate that the bot has required permissions after connection and warn if permissions are insufficient.
- **FR-013**: System MUST store the OAuth2 refresh token for maintaining long-term bot access.
- **FR-014**: System MUST emit structured logs for all OAuth2 flow events (authorization initiation, success, failures, errors).
- **FR-015**: System MUST emit metrics for connection success/failure rates, OAuth2 flow duration, and Discord API error counts.
- **FR-016**: System MUST provide distributed tracing for bot operations to enable end-to-end request debugging.
- **FR-017**: Discord API calls MUST use a 60-second timeout with linear backoff retry (5s, 10s, 15s delays) for up to 5 retries when rate limited or failing.
- **FR-018**: System MUST support MVP scale of 100 server owners with maximum 1,000 members per Discord server.
- **FR-019**: Bot invitation UI components MUST comply with WCAG 2.1 AA accessibility standard (keyboard navigation, screen reader support, minimum 4.5:1 color contrast for text, focus indicators on all interactive elements).
- **FR-020**: Bot connection service MUST maintain 99% uptime (~7.3 hours downtime/month acceptable for beta).

### Key Entities

- **DiscordServer**: Represents a Discord server connected to a user account
  - `discord_id`: Unique Discord server ID (snowflake)
  - `name`: Server name from Discord API
  - `icon`: Server icon URL from Discord API
  - `member_count`: Number of members in the server (for analytics; MVP max: 1,000)
  - `bot_status`: Connection status (Connected, Disconnected, Pending)
  - `bot_added_at`: Timestamp when bot was added to server
  - `permissions`: Comma-separated Discord permission flags (e.g., "8,1024,2048" for MANAGE_ROLES, VIEW_CHANNEL, SEND_MESSAGES)
  - `access_token`: OAuth2 access token for Discord API
  - `refresh_token`: OAuth2 refresh token for maintaining access
  - `token_expires_at`: Timestamp when access token expires
  - `user_id`: Reference to the User who manages this server (Foreign Key → users.id)

- **User**: Represents the user account (existing users table from 002-auth-refinement)
  - Relationship: Has one DiscordServer (MVP: one-to-one constraint via user_id UNIQUE)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Server owners can complete bot invitation flow in under 2 minutes (from clicking "Invite Bot" to bot joining their server).
- **SC-002**: Bot connection status reflects accurately within 10 seconds of actual Discord server state changes (bot added/removed).
- **SC-003**: 95% of completed OAuth2 authorization flows result in successful bot connection (excluding user cancellations).
- **SC-004**: OAuth2 flow properly protects against CSRF attacks (state validation) in 100% of cases.
- **SC-005**: Server owners can view their connection status at any time with accurate server name, member count, and status.
- **SC-006**: System can handle up to 100 server owners (MVP scale) with concurrent connection attempts without errors or rate limit issues from Discord API.
- **SC-007**: All OAuth2 flow events, Discord API errors, and permission validations are logged with trace IDs; metrics dashboards display connection success rate and average flow duration.
- **SC-008**: Discord API calls subject to rate limits recover successfully after retries in 95% of cases within the 60-second timeout window.
- **SC-009**: Bot invitation UI components pass WCAG 2.1 AA automated accessibility testing with zero critical violations.
- **SC-010**: Bot connection service achieves 99% monthly uptime (measured via external monitoring).
