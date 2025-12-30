# Quickstart: Server Owner Auth

## Environment Variables
Ensure the following are set in `apps/api/.dev.vars` (for local development) and Cloudflare Secrets:

```bash
# Discord OAuth
DISCORD_CLIENT_ID=...
DISCORD_CLIENT_SECRET=...
DISCORD_REDIRECT_URI=http://localhost:5173/api/auth/discord/callback

# Security
SESSION_SECRET=... (used for cookie signing if not using Hono's built-in session)
```

## Development Workflow

1. **Database Migration**:
   ```bash
   bun run db:generate
   bun run db:migrate
   ```

2. **Run Services**:
   ```bash
   bun run dev
   ```

3. **Testing**:
   ```bash
   bun test apps/api/src/routes/auth.test.ts
   ```

## Implementation Details
- **Auth Utils**: See `packages/shared/src/auth.ts` for Zod schemas.
- **Drizzle Schema**: See `packages/db/src/schema/users.ts`.
- **Hono Routes**: Implementation in `apps/api/src/routes/auth.ts`.
