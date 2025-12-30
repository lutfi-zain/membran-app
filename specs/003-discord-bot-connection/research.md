# Research: Discord Bot Invitation & Server Connection

**Feature**: 003-discord-bot-connection
**Date**: 2025-12-30
**Status**: Complete

## Overview

This document captures research findings for implementing Discord bot invitation OAuth2 flow, server connection management, and bot status verification.

---

## 1. Discord Bot OAuth2 Flow

### Decision: Discord OAuth2 Authorization Code Flow with Bot Scope

**Rationale**: Discord uses the standard OAuth2 authorization code flow with a `bot` scope for server invitation. This is the only supported method for adding bots to Discord servers.

**Key Components**:
- Authorization URL: `https://discord.com/oauth2/authorize`
- Required scopes: `bot` (for server invitation)
- Required permissions (calculate at https://discordapi.com/permissions.html):
  - `0x8` = Manage Roles (needed for subscription role assignment)
  - `0x4096` = View Channels / Read Server Info
  - Combined permissions integer: `4104` (or permissions flag string)

### Implementation Pattern

```typescript
// Using Arctic library (already in project for user Discord OAuth)
import { createDiscord } from "arctic";

const discord = createDiscord(
  DISCORD_CLIENT_ID,
  DISCORD_CLIENT_SECRET,
  redirectURI // e.g., https://membran.app/auth/bot/callback
);

// 1. Generate authorization URL with state
const state = generateRandomState();
const url = discord.createAuthorizationURL(state, {
  scopes: ["bot"],
  permissions: "4104" // or your calculated permissions
});

// 2. Callback handler validates state and exchanges code
const tokens = await discord.validateAuthorizationCode(code);
const accessToken = tokens.accessToken();

// 3. Use Discord REST API to get current user (bot) info
const response = await fetch("https://discord.com/api/v10/users/@me/guilds", {
  headers: { Authorization: `Bearer ${accessToken}` }
});
```

### State Management for CSRF

Using the existing pattern from 002-auth-refinement:
- Generate cryptographically random state using Oslo's `generateRandomString()`
- Store state temporarily (D1 or KV with 5-minute expiration)
- Validate state on callback before proceeding

---

## 2. Discord Server Join Detection

### Decision: Webhook-Based Guild Join Detection

**Rationale**: Discord sends gateway events when a bot joins a guild. However, for MVP on Cloudflare Workers (no persistent WebSocket connection), we'll use a simpler approach:

1. **On OAuth callback success**: Immediately call Discord API to verify bot is in server
2. **Periodic sync**: Use a cron trigger to check bot's guild list and update status
3. **Webhook (future)**: Discord sends webhook events on bot add/remove - integrate post-MVP

### Discord REST API for Current User Guilds

```typescript
// GET /users/@me/guilds - Returns all guilds the bot is a member of
const guildsResponse = await fetch("https://discord.com/api/v10/users/@me/guilds", {
  headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` }
});

const guilds = await guildsResponse.json();
// Array of { id, name, icon, permissions, owner, features }
```

---

## 3. Permission Validation

### Decision: Discord Permission Integer Calculation

**Rationale**: Discord uses bit flags for permissions. The minimum required:
- `MANAGE_ROLES` (0x0000000000000008 = 8)
- `VIEW_CHANNEL` (0x0000000000000400 = 1024)

Combined: `1032` decimal, but Discord recommends requesting all base permissions for a manageable bot.

### Best Practice: Permission Calculator

Use Discord's official permission calculator: https://discordapi.com/permissions.html

For MVP, use: `2147483647` (Administrator - all permissions) OR calculate exactly:
- `8` (Manage Roles)
- `1024` (View Channel)
- `2048` (Send Messages)
- `4096` (Embed Links)
- `8192` (Attach Files)
- `16384` (Add Reactions)
- `32768` (Use External Emojis)

Common bot permission flag: `0x0000000000000008 | 0x0000000000000400` = `1032`

---

## 4. Token Storage and Refresh

### Decision: Store OAuth2 Tokens in D1 discord_servers Table

**Rationale**: Bot needs long-term access to Discord API for:
- Fetching server info
- Validating permissions
- Assigning roles (future feature)
- Fetching member list (analytics)

Storage:
- `access_token`: Short-lived (expires in ~7 days per Discord)
- `refresh_token`: Long-lived (can be exchanged for new access token)
- `token_expires_at`: Timestamp for proactive refresh

### Token Refresh Pattern

```typescript
async function getValidAccessToken(serverId: string): Promise<string> {
  const server = await db.getDiscordServer(serverId);

  // If token not expired, return current
  if (server.tokenExpiresAt > new Date()) {
    return server.accessToken;
  }

  // Otherwise, refresh
  const newTokens = await discord.refreshAccessToken(server.refreshToken);
  await db.updateDiscordServerTokens(serverId, {
    accessToken: newTokens.accessToken(),
    refreshToken: newTokens.refreshToken,
    expiresAt: newTokens.accessTokenExpiresAt()
  });

  return newTokens.accessToken();
}
```

---

## 5. Rate Limiting and Retry Strategy

### Decision: Linear Backoff with 60s Timeout, 5 Retries

**Rationale** (from spec clarification Q2): Discord API uses rate limiting with 429 responses containing `Retry-After` header. For MVP:

- 60-second timeout per request (prevents hanging)
- Linear backoff: 5s → 10s → 15s (3 retries before timeout)
- Maximum 5 retries total for resilience
- Queue operations when rate limited

### Implementation Pattern

```typescript
async function fetchWithRetry(url: string, options: RequestInit): Promise<Response> {
  let lastError: Error;
  const delays = [5000, 10000, 15000]; // Linear backoff

  for (let attempt = 0; attempt <= 5; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "5");
        await sleep(retryAfter * 1000);
        continue;
      }

      if (response.ok) return response;
      throw new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
      if (attempt < delays.length) {
        await sleep(delays[attempt]);
      }
    }
  }

  throw lastError;
}
```

---

## 6. Observability Implementation

### Decision: Cloudflare Workers Analytics + structured logging

**Rationale** (from spec clarification Q1): Full observability required for bot operations.

#### Structured Logging Pattern

```typescript
// Use Cloudflare Workers' built-in logging
export function logBotEvent(event: BotEvent) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    traceId: crypto.randomUUID(),
    event: event.type, // "oauth_initiated", "bot_joined", "permission_check_failed"
    serverId: event.serverId,
    userId: event.userId,
    success: event.success,
    error: event.error,
    duration: event.duration
  }));
}
```

#### Metrics via Cloudflare Analytics

- **Connection Success Rate**: `(successful_connections / total_attempts) * 100`
- **Average Flow Duration**: Track OAuth flow completion time
- **Error Counts**: Count per error type (access_denied, invalid_state, rate_limit)

#### Distributed Tracing

- Use `traceId` propagated through all requests
- Correlate OAuth initiation → callback → bot join events
- Cloudflare Workers Analytics Dashboard shows request traces

---

## 7. Accessibility (WCAG 2.1 AA)

### Decision: Standard HTML semantic elements + ARIA attributes

**Rationale** (from spec clarification Q4): WCAG 2.1 AA compliance required.

### Key Requirements

1. **Keyboard Navigation**:
   - All interactive elements focusable via Tab
   - Visible focus indicators (2px solid outline)
   - Skip links for navigation

2. **Screen Reader Support**:
   - `aria-label` for icon-only buttons
   - `role="status"` for connection status updates
   - `aria-live="polite"` for error messages

3. **Color Contrast**:
   - Minimum 4.5:1 for normal text
   - Minimum 3:1 for large text (18pt+)
   - Don't rely on color alone (use icons + text)

4. **Testing**:
   - Automated: axe-core or Lighthouse accessibility audit
   - Manual: Keyboard-only navigation, screen reader testing (NVDA/VoiceOver)

---

## 8. Scale Considerations

### Decision: MVP targets 100 server owners, 1,000 members per server

**Rationale** (from spec clarification Q3): Small MVP scale allows:
- Single Cloudflare Worker (no horizontal scaling needed)
- Single D1 database (≤ 100,000 rows easily handled)
- Simple architecture for quick iteration

### Scaling Path (Post-MVP)

| Metric | MVP | Growth | Scale-Up |
|--------|-----|--------|----------|
| Server Owners | 100 | 1,000 | Add D1 read replicas |
| Members per Server | 1,000 | 10,000 | Shard Discord data |
| Concurrent Connections | 100 | 1,000 | Queue system (Durable Objects) |

---

## 9. Uptime Target

### Decision: 99% uptime (~7.3 hours/month downtime)

**Rationale** (from spec clarification Q5): Acceptable for beta-phase SaaS.

### Monitoring Approach

- External monitoring: UptimeRobot or Pingdom checks `/health` endpoint
- Internal monitoring: Cloudflare Workers Analytics for error rates
- Alert on: >1% error rate, >5-minute outage

---

## 10. Security Considerations

### CSRF Protection (State Parameter)

- Generate cryptographically random state (32 bytes)
- Store with 5-minute expiration
- Validate on callback before any token exchange

### Token Storage

- Store `access_token` and `refresh_token` encrypted in D1
- Never log tokens
- Rotate tokens on suspicious activity

### Permission Downgrade Detection

- On every status check, verify bot permissions via Discord API
- Compare against required permissions (MANAGE_ROLES, VIEW_CHANNEL)
- Warn user if permissions insufficient

---

## Alternatives Considered

### Discord Gateway vs REST API

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Gateway (WebSocket) | Real-time events, instant updates | Requires persistent connection, not viable on Cloudflare Workers | **REJECTED** |
| REST API + Polling | Works on Workers, simpler infrastructure | Delayed updates (10-30s) | **SELECTED** for MVP |
| Webhook Events | Real-time, efficient | Requires public endpoint, signature validation | **FUTURE** enhancement |

### OAuth State Storage

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| D1 Table | Persistent, queryable | Slower (disk I/O) | **SELECTED** |
| Cloudflare KV | Faster, TTL built-in | Additional service | **ALTERNATIVE** |
| In-memory | Fastest | Lost on worker restart | **REJECTED** |

---

## Summary

All technical unknowns from the specification have been resolved. The implementation will use:
- **Arctic** for Discord OAuth2 (already in project)
- **Drizzle ORM** with new `discord_servers` table
- **Cloudflare Workers** for API endpoints
- **Cloudflare D1** for data persistence
- **Linear backoff retry** for Discord API resilience
- **Structured JSON logging** for observability
- **Standard HTML + ARIA** for WCAG 2.1 AA compliance

**Status**: Ready for Phase 1 (Design & Contracts)
