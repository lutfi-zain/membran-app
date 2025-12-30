# Data Model Refinement: Auth Refinement

## Entities

### VerificationToken (Table: `verification_tokens`)
Temporary tokens for email verification.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | text | Primary Key | Token hash |
| `user_id` | text | FK -> users.id | Associated user |
| `expires_at` | integer | Not Null | Expiry timestamp |

## Entity Updates

### ServerOwner (Table: `users`)
The `discord_id` field is now mutable for users who initially signed up with email and later connect their Discord account.

## Validation Rules (Zod)

### VerificationSchema
- `token`: `z.string().min(32)` (expected length of the secret part)

### DiscordConnectSchema
- `state`: `z.string()` (CSRF protection)
- `code`: `z.string()` (OAuth authorization code)
