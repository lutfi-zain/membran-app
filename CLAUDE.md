# membran-app Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-30

## Active Technologies
- TypeScript 5.x / Bun 1.x + Hono (API framework), Drizzle ORM (database), TanStack Query (React data fetching), Zod (validation) (004-pricing-tier-config)
- Cloudflare D1 (SQLite) (004-pricing-tier-config)
- TypeScript 5.x / Bun 1.x + React 18, TanStack Router (v7), TanStack Query, Hono (for API state checks) (005-navigation-routing)
- Cloudflare D1 (SQLite) - onboarding_state table (005-navigation-routing)

- TypeScript / Bun 1.x + Hono, Drizzle ORM, TanStack Query, Arctic (Discord OAuth), Oslo (crypto utils), Zod (003-discord-bot-connection)

## Project Structure

```text
membran-app/
├── apps/
│   ├── api/          # Hono backend (Cloudflare Workers)
│   │   ├── src/
│   │   │   ├── routes/       # API endpoints (auth.ts, bot.ts)
│   │   │   ├── lib/          # Utility libraries (discord-bot.ts)
│   │   │   └── middleware/   # Middleware (session.ts, rate-limit.ts)
│   │   └── wrangler.toml
│   └── web/          # React frontend (Vite)
│       ├── src/
│       │   ├── components/   # React components
│       │   ├── pages/        # Route pages
│       │   └── hooks/        # Custom hooks (useAuth.ts, useBotConnection.ts)
│       └── vite.config.ts
├── packages/
│   ├── db/           # Drizzle ORM schemas
│   │   └── src/schema/       # Database tables (users.ts, discord-servers.ts)
│   └── shared/       # Shared Zod schemas + types
│       └── src/              # Shared types (auth.ts, bot.ts)
├── turbo.json
└── package.json
```

## Commands

```bash
# Install dependencies
bun install

# Run development servers
bun dev

# Generate database migrations
bun run db:generate

# Apply migrations (local)
cd apps/api && npx wrangler d1 migrations apply membran-db --local

# Run tests
bun test

# Run linter
bun run lint
```

## Code Style

**TypeScript / Bun 1.x**: Follow standard conventions

### Import Order
1. External dependencies (node_modules)
2. Internal packages (@membran-app/*)
3. Relative imports (../)
4. Types (import type)

### File Naming
- Components: PascalCase (e.g., `BotInviteButton.tsx`)
- Utilities: camelCase (e.g., `discord-bot.ts`)
- Pages: kebab-case for directories, index.tsx for file

### Database Schema
- Table names: snake_case (e.g., `discord_servers`)
- Column names: camelCase in Drizzle (e.g., `botStatus`)
- Export table, then relations

### API Routes
- Route files: kebab-case (e.g., `bot.ts`)
- Endpoint paths: kebab-case (e.g., `/api/bot/invite`)
- Error responses: JSON with `error` code and `message`

## Recent Changes
- 005-navigation-routing: Added TypeScript 5.x / Bun 1.x + React 18, TanStack Router (v7), TanStack Query, Hono (for API state checks)
- 004-pricing-tier-config: Added TypeScript 5.x / Bun 1.x + Hono (API framework), Drizzle ORM (database), TanStack Query (React data fetching), Zod (validation)

- 003-discord-bot-connection: Added TypeScript / Bun 1.x + Hono, Drizzle ORM, TanStack Query, Arctic (Discord OAuth), Oslo (crypto utils), Zod

---

<!-- MANUAL ADDITIONS START -->

### Environment Variables

Required for local development:

### Testing Conventions


### Git Workflow


<!-- MANUAL ADDITIONS END -->
