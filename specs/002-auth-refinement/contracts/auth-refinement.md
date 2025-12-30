# API Contracts: Auth Refinement

## Email Verification

### GET /api/auth/verify
Handle verification link clicks.

**Query Parameters:**
- `token`: string (The raw secret token)

**Responses:**
- `302 Found`: Redirect to `/dashboard?verified=true` on success.
- `302 Found`: Redirect to `/login?error=invalid_token` on failure.

---

## Discord Connection

### GET /api/auth/connect/discord
Initiate the Discord OAuth connection flow for an authenticated user.

**Authentication:** Required (Session Cookie)

**Responses:**
- `302 Found`: Redirect to Discord Authorization URL.

### GET /api/auth/connect/discord/callback
Handle the Discord callback to link the account.

**Authentication:** Required (Session Cookie)

**Query Parameters:**
- `code`: string
- `state`: string

**Responses:**
- `302 Found`: Redirect to `/settings?connected=discord` on success.
- `302 Found`: Redirect to `/settings?error=already_linked` if Discord ID is taken.
- `302 Found`: Redirect to `/settings?error=connection_failed` on OAuth error.
