# Data Model: Server Owner Registration & Authentication

## Entities

### ServerOwner (Table: `users`)
Represents a registered user who can own and manage servers.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | text | Primary Key (ULID/UUID) | Unique identifier |
| `email` | text | Unique, Nullable | User's email address |
| `email_verified` | integer | Default 0 (Boolean) | Verification status |
| `password_hash` | text | Nullable | Hashed password (Oslo/Scrypt) |
| `discord_id` | text | Unique, Nullable | Discord User ID from OAuth |
| `subscription_plan` | text | Default 'free' | Current billing plan |
| `created_at` | integer | Not Null | Unix timestamp |
| `updated_at` | integer | Not Null | Unix timestamp |

### Session (Table: `sessions`)
Active user sessions for authentication.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | text | Primary Key | Session token hash |
| `user_id` | text | FK -> users.id | Associated user |
| `expires_at` | integer | Not Null | Expiry timestamp (7 days) |

### PasswordResetToken (Table: `password_reset_tokens`)
Temporary tokens for password recovery.

| Field | Type | Constraints | Description |
|-------|------|-------------|-------------|
| `id` | text | Primary Key | Token hash |
| `user_id` | text | FK -> users.id | Associated user |
| `expires_at` | integer | Not Null | Expiry timestamp |

## Validation Rules (Zod)

### SignupSchema
- `email`: `z.string().email()`
- `password`: `z.string().min(8)`

### LoginSchema
- `email`: `z.string().email()`
- `password`: `z.string()`

## State Transitions

1. **Registration**: 
   - `Visitor` -> `Registered User` (email/password or Discord)
   - `email_verified` set based on provider or registration flow.
2. **Authentication**:
   - `Credentials` -> `Active Session`
3. **Password Reset**:
   - `Forgot Password Request` -> `Token Generated` -> `Password Updated`
