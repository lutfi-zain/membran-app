# Research: Server Owner Registration & Authentication

This document resolves technical unknowns identified in the implementation plan.

## Research Tasks

### 1. Auth Library for Hono/Workers
**Goal**: Identify the most stable and edge-compatible auth library.
- **Option A**: Lucia Auth. Known for being library-agnostic and working well with Drizzle/Hono.
- **Option B**: Hono Middleware (Session) + Arctic. Arctic is a lightweight OAuth client library from the creator of Lucia, designed for modern runtimes.
- **Option C**: Manual implementation.

### 2. Discord OAuth Patterns
**Goal**: Secure integration with Discord.
- Handling OAuth state/CSRF.
- Mapping Discord user data to internal `ServerOwner` entity.
- Handling email collisions (FR-012).

### 3. Email/Password Security
**Goal**: Secure hashing and reset flows in Workers.
- Library for hashing: `bcrypt` (often too slow for Workers/isolates) vs `argon2` vs native `crypto.subtle` (Scrypt/PBKDF2).
- Reset token generation and storage.

---

## Findings

### 1. Auth Strategy: Hono + Arctic + Manual Sessions
- **Decision**: Use **Arctic** for OAuth and a lightweight custom session implementation using Hono middleware and Drizzle.
- **Rationale**: 
  - Lucia Auth (v3) is currently in maintenance mode as the author moves towards more modular libraries like Arctic.
  - Arctic is designed specifically for Cloudflare Workers/Bun and is extremely lightweight.
  - Manual session management in Hono is straightforward with D1 and allows for full control over the 7-day rolling session requirement (FR-007).
- **Alternatives Considered**: Lucia Auth (rejected due to moving towards modularity), Auth.js (often heavy for Workers runtime).

### 2. Discord OAuth Integration
- **Decision**: Use Arctic's `Discord` provider.
- **Rationale**: Arctic handles the PKCE and state management requirements out of the box.
- **Implementation**:
  - Redirect to Discord with `identify` and `email` scopes.
  - On callback, verify state, exchange code for token.
  - Fetch user profile from Discord API.
  - Check database for `discord_user_id` or `email`.
  - Handle collision as per FR-012 (Reject if email exists without Discord link).

### 3. Password Security & Email Reset
- **Decision**: Use `scrypt` via `crypto.subtle` or a Bun-native hashing if compatible with Workers, but for Cloudflare Workers, **PBKDF2** or **scrypt** via Web Crypto API is standard. 
- **Decision (Hashing)**: Use `oslo` (another modular library from Lucia creator) for password hashing as it provides edge-compatible wrappers for standard algorithms.
- **Decision (Tokens)**: Use `crypto.getRandomValues` for secure token generation. Tokens stored in D1 with expiry.
- **Decision (Email)**: Cloudflare Workers can use services like Resend or SendGrid via API. (Will assume Resend for now as it's modern and dev-friendly).

---

## Resolved Technical Context

- **Primary Dependencies**: `hono`, `drizzle-orm`, `arctic` (OAuth), `oslo` (Hashing), `zod`.
- **Auth Strategy**: Arctic for OAuth + Custom session middleware + Oslo for hashing.
