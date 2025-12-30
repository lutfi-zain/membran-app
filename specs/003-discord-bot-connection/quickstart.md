# Quickstart: Discord Bot Connection Development

**Feature**: 003-discord-bot-connection
**Date**: 2025-12-30
**Prerequisites**: Bun 1.x, Cloudflare account, Discord application

---

## Overview

This guide helps you set up a local development environment for implementing Discord bot invitation and server connection features.

---

## 1. Prerequisites

### Required Accounts

1. **Discord Developer Portal**
   - Create application at https://discord.com/developers/applications
   - Note: Use the SAME application as user OAuth (add bot to existing app)

2. **Cloudflare Account**
   - Free tier sufficient for development
   - D1 database, Workers, and Pages access

### Local Tools

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version  # Should be 1.x
```

---

## 2. Discord Bot Setup

### Step 1: Add Bot to Discord Application

1. Go to https://discord.com/developers/applications
2. Select your existing application (from 002-auth-refinement)
3. Navigate to **Bot** section
4. Click **"Add Bot"** (if not already created)
5. Copy the **Bot Token** - you'll need this for environment variables

### Step 2: Configure Bot Permissions

Required permissions for MVP:
- **Manage Roles** (0x8)
- **View Channels** (0x400)

Permission integer: `1032` (or use Administrator for testing: `8`)

### Step 3: Generate OAuth2 URL

For testing, you can generate the bot invite URL manually:

```
https://discord.com/oauth2/authorize?
  client_id=YOUR_CLIENT_ID&
  permissions=1032&
  scope=bot
```

---

## 3. Environment Variables

Create `apps/api/.dev.vars` (add to existing file):

```bash
# Discord Bot (NEW for this feature)
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_existing_client_id
DISCORD_CLIENT_SECRET=your_existing_client_secret
DISCORD_REDIRECT_URI=http://localhost:8787/auth/bot/callback

# Encryption (for token storage)
ENCRYPTION_KEY=generate_a_32_byte_random_string

# Existing variables from 002-auth-refinement
SESSION_SECRET=your_session_secret
```

### Generate Encryption Key

```bash
# Generate a secure 32-byte key (base64 encoded)
bun -e "console.log(crypto.randomBytes(32).toString('base64'))"
```

---

## 4. Database Setup

### Create Migration

```bash
# Generate migration from Drizzle schema
bun run db:generate

# This creates: packages/db/drizzle/0002_create_discord_servers.sql
```

### Apply Migration (Local)

```bash
cd apps/api
npx wrangler d1 migrations apply membran-db --local
```

### Apply Migration (Production)

```bash
cd apps/api
npx wrangler d1 migrations apply membran-db --remote
```

---

## 5. Install Dependencies

```bash
# From repo root
bun install
```

### Key Dependencies (Already Installed)

- `arctic` - Discord OAuth2 (handles both user and bot flows)
- `drizzle-orm` - Database ORM
- `hono` - API framework
- `oslo` - Crypto utilities (state generation, encryption)

---

## 6. Development Server

### Start API (Cloudflare Worker)

```bash
# Terminal 1
cd apps/api
bun run dev

# API runs on: http://localhost:8787
```

### Start Web (React Frontend)

```bash
# Terminal 2
cd apps/web
bun run dev

# Web runs on: http://localhost:5173
```

---

## 7. Testing the Bot Flow

### Step 1: Create Test Account

1. Navigate to http://localhost:5173/signup
2. Create a new server owner account
3. Verify email (check console/logs for verification link)

### Step 2: Initiate Bot Invitation

```bash
# Via curl
curl -X POST http://localhost:8787/api/bot/invite \
  -H "Cookie: session=<your_session_cookie>" \
  | jq
```

Expected response:
```json
{
  "authorizationUrl": "https://discord.com/oauth2/authorize?...",
  "state": "random_state_string"
}
```

### Step 3: Complete OAuth Flow

1. Copy `authorizationUrl` from response
2. Open in browser
3. Select a Discord server you own
4. Authorize the bot
5. Bot should redirect to `http://localhost:8787/api/bot/callback`
6. Callback redirects to settings page

### Step 4: Verify Connection

```bash
# Check bot status
curl http://localhost:8787/api/bot/status \
  -H "Cookie: session=<your_session_cookie>" \
  | jq
```

Expected response:
```json
{
  "connected": true,
  "server": {
    "id": "...",
    "name": "Your Test Server",
    "botStatus": "Connected",
    "memberCount": 42
  }
}
```

---

## 8. Common Issues

### Issue: "Invalid OAuth2 state"

**Cause**: State parameter mismatch between request and callback

**Solution**:
- Check that state is being stored/retrieved correctly from D1
- Ensure state hasn't expired (5-minute TTL)

### Issue: "Bot not in guild list"

**Cause**: OAuth completed but bot hasn't actually joined server

**Solution**:
- Verify Discord bot token is correct
- Check bot has `bot` scope in OAuth URL
- Manually verify bot is in server via Discord client

### Issue: "Missing permissions"

**Cause**: Permissions integer doesn't include required flags

**Solution**:
- Recalculate permissions at https://discordapi.com/permissions.html
- Ensure `MANAGE_ROLES` (0x8) is included

### Issue: D1 migration fails

**Cause**: Migration file not found or syntax error

**Solution**:
```bash
# Check migration exists
ls packages/db/drizzle/

# Re-generate if needed
bun run db:generate

# Check D1 database exists
npx wrangler d1 list
```

---

## 9. File Structure

### Files to Create/Modify

```
packages/db/src/schema/
├── discord-servers.ts    # NEW: DiscordServer schema
└── index.ts              # UPDATE: Export discord_servers

apps/api/src/routes/
├── bot.ts                # NEW: Bot invitation & status endpoints
├── lib/
│   └── discord-bot.ts    # NEW: Discord API client helpers
└── middleware/
    └── rate-limit.ts      # UPDATE: Add bot endpoints

apps/web/src/
├── pages/
│   └── onboarding/
│       └── bot/          # NEW: Bot invitation UI
├── components/
│   └── bot/
│       ├── BotInviteButton.tsx    # NEW
│       ├── ConnectionStatus.tsx   # NEW
│       └── PermissionWarning.tsx  # NEW
└── hooks/
    └── useBotConnection.ts        # NEW
```

---

## 10. Testing Commands

### Unit Tests

```bash
# Run all tests
bun test

# Run bot-specific tests
bun test packages/db/src/schema/discord-servers.test.ts
bun test apps/api/src/routes/bot.test.ts
```

### Integration Tests

```bash
# Test OAuth flow end-to-end
bun test apps/api/tests/integration/bot-oauth-flow.test.ts
```

### Accessibility Tests

```bash
# Run Lighthouse CI (for WCAG 2.1 AA compliance)
npx lighthouse http://localhost:5173/settings --view

# Run Lighthouse with accessibility focus only
npx lighthouse http://localhost:5173/onboarding/bot --only-categories=accessibility --view

# Run axe-core DevTools for comprehensive audit
# 1. Install axe DevTools extension: https://www.deque.com/axe/devtools/
# 2. Navigate to the page in Chrome
# 3. Open DevTools -> axe DevTools tab
# 4. Click "Scan ALL of my page"

# Automated accessibility testing with axe-core
npx axe http://localhost:5173/settings
```

#### Accessibility Testing Checklist

Manual testing should verify:

1. **Keyboard Navigation**
   - [ ] Tab through all interactive elements in logical order
   - [ ] All buttons/links are focusable with visible indicators
   - [ ] Skip links work (if implemented)
   - [ ] Escape key closes modals/dismisses alerts

2. **Screen Reader Support**
   - [ ] NVDA (Windows) / VoiceOver (Mac) announces all content
   - [ ] Buttons have descriptive labels (not just "click here")
   - [ ] Form inputs have associated labels
   - [ ] Status updates are announced (aria-live regions)

3. **Color Contrast**
   - [ ] All text meets 4.5:1 contrast ratio (normal text)
   - [ ] Large text (18pt+) meets 3:1 contrast ratio
   - [ ] Interactive elements meet 3:1 contrast ratio
   - [ ] Color is not the only means of conveying information

4. **Focus Management**
   - [ ] Focus moves to modal when opened
   - [ ] Focus is trapped within modal
   - [ ] Focus returns to triggering element after modal closes
   - [ ] Focus indicator is visible (2px solid outline minimum)

---

## 11. Debugging

### Check D1 Database Contents

```bash
# Local D1 console
npx wrangler d1 execute membran-db --local --command "SELECT * FROM discord_servers"

# Production
npx wrangler d1 execute membran-db --remote --command "SELECT * FROM discord_servers"
```

### View Worker Logs

```bash
# Local: Check console output from bun run dev

# Production: Cloudflare Dashboard
# https://dash.cloudflare.com -> Workers -> membran-api -> Logs
```

### Test Discord API Calls

```bash
# Test bot token is valid
curl -H "Authorization: Bot YOUR_BOT_TOKEN" \
  https://discord.com/api/v10/users/@me/guilds \
  | jq
```

---

## 12. Next Steps

After completing this quickstart:

1. **Implement Backend Routes**: Follow `contracts/bot-connection.md`
2. **Create Frontend Components**: Build React components for bot invitation
3. **Write Tests**: Cover OAuth flow, status checks, permission validation
4. **Deploy to Cloudflare**: Test production Discord callback URL

---

## 13. Production Checklist

Before deploying to production:

### Discord Application Configuration

- [ ] Update Discord redirect URI to `https://membran.app/api/bot/callback` in Discord Developer Portal
- [ ] Verify bot permissions are correctly set (Manage Roles: 0x8, View Channel: 0x400)
- [ ] Copy and securely store DISCORD_BOT_TOKEN for production
- [ ] Copy and securely store DISCORD_CLIENT_SECRET for production

### Cloudflare Workers Configuration

- [ ] Set production `ENCRYPTION_KEY` via Cloudflare Workers secret:
  ```bash
  npx wrangler secret put ENCRYPTION_KEY
  # Paste a 32-byte base64-encoded key
  ```
- [ ] Set production `SESSION_SECRET` via Cloudflare Workers secret:
  ```bash
  npx wrangler secret put SESSION_SECRET
  # Paste a secure random string (32+ bytes)
  ```
- [ ] Set production `DISCORD_BOT_TOKEN` via Cloudflare Workers secret
- [ ] Set production `DISCORD_CLIENT_SECRET` via Cloudflare Workers secret
- [ ] Set production `CRON_SECRET` for sync endpoint authentication:
  ```bash
  npx wrangler secret put CRON_SECRET
  # Paste a secure random string
  ```

### Database Setup

- [ ] Apply D1 migrations to production database:
  ```bash
  cd apps/api
  npx wrangler d1 migrations apply membran-db --remote
  ```
- [ ] Verify tables created successfully:
  ```bash
  npx wrangler d1 execute membran-db --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
  ```

### Environment Variables

- [ ] Set `DISCORD_CLIENT_ID` in Cloudflare Workers dashboard or wrangler.toml
- [ ] Set `DISCORD_REDIRECT_URI` to production URL

### Testing

- [ ] Test OAuth flow with production URLs:
  1. Navigate to `https://membran.app/onboarding/bot`
  2. Click "Invite Bot to Server"
  3. Complete Discord authorization
  4. Verify bot joins server
  5. Check status page shows connected
- [ ] Test reconnection flow:
  1. Remove bot from Discord server
  2. Navigate to `https://membran.app/settings/bot`
  3. Click "Reconnect Bot"
  4. Complete OAuth flow
  5. Verify status updates to "Connected"
- [ ] Test permission validation

### Monitoring & Observability

- [ ] Set up external monitoring (UptimeRobot) for `/health` endpoint
- [ ] Configure Cloudflare Analytics for metrics dashboard
- [ ] Set up alerts for high error rates (>1%)
- [ ] Set up alerts for long response times (>5s)
- [ ] Configure log aggregation (Cloudflare Logpush or external service)

### Accessibility

- [ ] Run Lighthouse accessibility audit on production URLs:
  ```bash
  npx lighthouse https://membran.app/settings --only-categories=accessibility --view
  ```
- [ ] Verify keyboard navigation works on production
- [ ] Test with screen reader (NVDA/VoiceOver)

### Security

- [ ] Enable Cloudflare Web Application Firewall (WAF)
- [ ] Configure rate limiting rules
- [ ] Enable HTTPS only (redirect HTTP to HTTPS)
- [ ] Set security headers (CSP, X-Frame-Options, etc.)
- [ ] Review and minimize exposed information in error responses

### Performance

- [ ] Enable Cloudflare caching for static assets
- [ ] Configure cache headers for API responses (appropriate cache duration)
- [ ] Run Lighthouse performance audit (target: 90+ score)
- [ ] Optimize images and assets

### Documentation

- [ ] Update API documentation with production URLs
- [ ] Document environment variables for ops team
- [ ] Create runbooks for common incidents
- [ ] Document rollback procedure

---

## Summary

| Step | Command | Description |
|------|---------|-------------|
| 1 | Discord Developer Portal | Add bot to application |
| 2 | Create `.dev.vars` | Add bot token and encryption key |
| 3 | `bun run db:generate` | Generate DiscordServer schema migration |
| 4 | `npx wrangler d1 migrations apply` | Apply migration |
| 5 | `bun run dev` | Start development server |
| 6 | Test OAuth flow | `/api/bot/invite` → Discord → callback |

**Status**: Development environment ready for implementation.
