# API Contract: Server Owner Auth

## Authentication Endpoints

### POST /api/auth/signup
Registers a new user with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Responses**:
- `201 Created`: Account created, session cookie set.
- `400 Bad Request`: Validation failure.
- `409 Conflict`: Email already exists.

---

### POST /api/auth/login
Authenticates a user with email and password.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Responses**:
- `200 OK`: Authenticated, session cookie set.
- `401 Unauthorized`: Invalid credentials.

---

### GET /api/auth/discord
Initiates Discord OAuth flow.

**Responses**:
- `302 Found`: Redirect to Discord Authorization URL.

---

### GET /api/auth/discord/callback
Handles Discord OAuth callback.

**Query Parameters**:
- `code`: Authorization code.
- `state`: CSRF protection state.

**Responses**:
- `302 Found`: Redirect to `/onboarding` (success) or `/login` (failure).

---

### POST /api/auth/logout
Terminates the current session.

**Responses**:
- `200 OK`: Session invalidated, cookie cleared.

---

### POST /api/auth/forgot-password
Initiates password reset flow.

**Request Body**:
```json
{
  "email": "user@example.com"
}
```

**Responses**:
- `202 Accepted`: Reset email sent if account exists.

---

### POST /api/auth/reset-password
Updates password using a reset token.

**Request Body**:
```json
{
  "token": "reset-token-here",
  "password": "newpassword123"
}
```

**Responses**:
- `200 OK`: Password updated.
- `400 Bad Request`: Invalid or expired token.

---

### GET /api/auth/me
Returns the current authenticated user's profile.

**Responses**:
- `200 OK`: User data.
- `401 Unauthorized`: No active session.
