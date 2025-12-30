# Feature Specification: Server Owner Registration & Authentication

**Feature Branch**: `001-server-owner-auth`
**Created**: 2025-12-29
**Status**: Draft
**Input**: User description: "Server owner registration + authentication"

## Clarifications

### Session 2025-12-29
- Q: What authentication methods should be supported? → A: **Both** Email/Password and Discord OAuth.
- Q: Is email verification required before access? → A: **Deferred/Soft** (Allow immediate access, banner prompts to verify later).
- Q: How to handle OAuth login if email already exists? → A: **Reject/Error** (Require password login first, then manual connect).
- Q: Should "Forgot Password" flow be included? → A: **Yes** (Standard email reset flow).
- Q: What is the default session duration? → A: **7 days** (Rolling session).

## User Scenarios & Testing

### User Story 1 - New Owner Registration (Priority: P1)

A prospective server owner wants to create an account so they can start managing their Discord server monetization.

**Why this priority**: Without registration, no other features can be accessed. This is the entry point for the "Time-to-First-Value" metric.

**Independent Test**: Can be tested by visiting the signup page, entering valid credentials OR clicking "Sign up with Discord", and verifying a new user record is created in the database and the user is redirected to the onboarding wizard.

**Acceptance Scenarios**:

1. **Given** a visitor on the landing page, **When** they click "Start Free Trial", **Then** they are taken to the registration form.
2. **Given** the registration form, **When** the user enters a valid email and strong password, **Then** an account is created, a verification email is triggered (background), and they are immediately redirected to the Onboarding Wizard.
3. **Given** the registration form, **When** the user clicks "Continue with Discord" and authorizes the app, **Then** an account is created (linked to their Discord ID) and they are redirected to the Onboarding Wizard (email verification skipped if Discord email is verified).
4. **Given** an existing user email (registered via password), **When** a visitor tries to "Sign up with Discord" using that same email, **Then** they see an error "Account exists. Please log in with password to connect Discord."
5. **Given** an existing user email, **When** a visitor tries to register with it, **Then** they see a clear error message that the account already exists (or prompt to login).

---

### User Story 2 - Owner Login (Priority: P1)

An existing server owner wants to log back in to manage their dashboard.

**Why this priority**: Essential for returning users to access their data and manage subscriptions.

**Independent Test**: Can be tested by entering known credentials or using Discord OAuth on the login page and verifying redirection to the dashboard with an active session.

**Acceptance Scenarios**:

1. **Given** a registered user, **When** they enter correct email and password on the login page, **Then** they are authenticated and redirected to the Dashboard.
2. **Given** a registered user (via Discord), **When** they click "Login with Discord", **Then** they are authenticated and redirected to the Dashboard.
3. **Given** a login attempt, **When** the user enters an incorrect password, **Then** an error message "Invalid credentials" is displayed.
4. **Given** a logged-in user, **When** they click "Logout", **Then** their session is terminated and they are redirected to the public home page.

---

### User Story 3 - Protected Route Access (Priority: P2)

An unauthenticated visitor attempts to access the dashboard directly.

**Why this priority**: Ensures security and privacy of user data; prevents unauthorized access to management features.

**Independent Test**: Can be tested by attempting to navigate to `/dashboard` without an active session cookie/token.

**Acceptance Scenarios**:

1. **Given** a visitor without a session, **When** they attempt to visit `/dashboard` or `/onboarding`, **Then** they are automatically redirected to the Login page.
2. **Given** an authenticated user, **When** they navigate to restricted pages, **Then** the page loads successfully without redirection.
3. **Given** an authenticated user with unverified email, **When** they access the dashboard, **Then** a dismissal banner "Please verify your email" is displayed, but features remain accessible.

---

### User Story 4 - Password Reset (Priority: P2)

A user who forgot their password needs to regain access to their account.

**Why this priority**: Prevents permanent lockout for email-based users; standard expectation for SaaS apps.

**Independent Test**: Can be tested by requesting a reset for an existing email, clicking the link in the simulated email, and successfully setting a new password.

**Acceptance Scenarios**:

1. **Given** the login page, **When** a user clicks "Forgot Password" and enters their email, **Then** a reset link is sent to that email.
2. **Given** a valid reset link, **When** the user clicks it, **Then** they see a form to enter a new password.
3. **Given** the new password form, **When** they submit a valid new password, **Then** the password is updated and they can login with the new credential.
4. **Given** a user signed up via Discord, **When** they try to reset password, **Then** they receive an email stating they don't have a password set (or generic "if account exists" message).

---

### Edge Cases

- **Invalid Email Format**: User enters "user@com" (missing domain part). System must block submission.
- **Weak Password**: User enters a password shorter than 8 characters. System must require stronger security.
- **Database Downtime**: Registration attempt fails due to DB error. System should show a friendly "Try again later" message.
- **Session Expiry**: User creates a session but is inactive for 7 days. Next action should prompt for re-login.
- **OAuth Failure**: User denies Discord authorization or Discord API is down. System handles the redirect error gracefully and shows a message on the login page.
- **Verification Link Expired**: User clicks an old email verification link. System prompts to request a new one.
- **Account Collision**: User attempts OAuth with an email already used by a password-based account. System blocks login and advises to login with password first.
- **Reset Token Re-use**: User tries to use a password reset link twice. System blocks the second attempt.

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow users to register/login with a unique email address and a password.
- **FR-002**: System MUST allow users to register/login via Discord OAuth ("Continue with Discord").
- **FR-003**: System MUST validate email format and enforce a minimum password length of 8 characters (for email auth).
- **FR-004**: System MUST securely hash passwords before storage (never store plain text).
- **FR-005**: System MUST verify credentials against stored hashes during login.
- **FR-006**: System MUST prevent duplicate account creation for the same email address.
- **FR-007**: System MUST maintain user authentication state across page reloads (e.g., via secure HTTP-only cookies) with a default duration of 7 days.
- **FR-008**: System MUST provide a logout mechanism that invalidates the current session.
- **FR-009**: System MUST redirect unauthenticated requests for protected routes to the login page.
- **FR-010**: System MUST send a verification email upon registration (email/password flow) but allow immediate login.
- **FR-011**: System MUST display a verification reminder UI for unverified users.
- **FR-012**: System MUST NOT auto-merge OAuth accounts with existing email accounts; explicit connection required.
- **FR-013**: System MUST provide a "Forgot Password" flow that sends a secure, time-limited reset token via email.

### Key Entities

- **ServerOwner**: Represents the user managing the Discord server.
    - `email`: Unique identifier (nullable if Discord-only, but recommended to collect).
    - `email_verified`: Boolean (default false for email signup, true if OAuth provider confirms).
    - `password_hash`: Securely stored credential (nullable for OAuth users).
    - `discord_id`: Discord User ID (unique, nullable for email-only users).
    - `reset_token`: Secure token for password recovery (hashed, temporary).
    - `reset_token_expiry`: Timestamp for token validity.
    - `created_at`: Timestamp of registration.
    - `subscription_plan`: Defaults to "Free" upon registration.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can complete the registration process (from form load to success redirect) in under 60 seconds.
- **SC-002**: Login process responds (success/fail) in under 1 second.
- **SC-003**: User passwords cannot be retrieved in plain text by administrators or via database access.
- **SC-004**: System successfully handles 100 concurrent login attempts without error.
