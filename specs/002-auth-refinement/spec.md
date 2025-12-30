# Feature Specification: Auth Refinement: Account Connection and Verification

**Feature Branch**: `002-auth-refinement`  
**Created**: 2025-12-30  
**Status**: Draft  
**Input**: User description: "to update spec.md with the missing Account Connection flow and Verification endpoint details."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Email Verification Completion (Priority: P1)

A newly registered server owner clicks the link in their verification email to finalize their account setup.

**Why this priority**: Essential for security and for removing the "unverified" status which blocks or nags the user.

**Independent Test**: Can be tested by triggering a verification email during signup, extracting the token from the simulated email, and visiting the verification URL.

**Acceptance Scenarios**:

1. **Given** a user with a pending verification token, **When** they visit the verification URL with a valid token, **Then** their account is marked as verified and they are redirected to the dashboard with a success message.
2. **Given** an expired or invalid verification token, **When** the user visits the verification URL, **Then** they see an error message and an option to request a new verification email.

---

### User Story 2 - Discord Account Connection (Priority: P1)

An owner who registered via email/password wants to link their Discord account to enable bot management features without creating a separate account.

**Why this priority**: Essential for the core value proposition of the app (Discord server management) for users who didn't use OAuth during signup.

**Independent Test**: Can be tested by logging in with email/password, navigating to settings, clicking "Connect Discord", authorizing via Discord, and verifying the `discord_id` is saved to the existing user record.

**Acceptance Scenarios**:

1. **Given** an authenticated user (email/password), **When** they complete the "Connect Discord" flow, **Then** their Discord ID is linked to their account and they see a "Discord Connected" status.
2. **Given** an authenticated user, **When** they try to connect a Discord account already linked to *another* email, **Then** they see an error: "This Discord account is already linked to another user."

---

### Edge Cases

- **Token Re-use**: User clicks the verification link twice. Second time should show "Already verified" or redirect to dashboard.
- **Race Condition**: User is trying to link Discord while another session is deleting the account.
- **Discord API Down**: System handles OAuth failure gracefully during the connection flow.
- **Expired Tokens**: Verification or Reset tokens used after 24 hours (or configured expiry) must be rejected.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a secure endpoint to handle email verification link clicks.
- **FR-002**: System MUST invalidate a verification token once it has been successfully used.
- **FR-003**: System MUST provide a "Connect Discord" action in the user settings/onboarding for authenticated users.
- **FR-004**: System MUST verify that a Discord account being connected is not already associated with another user record in the system.
- **FR-005**: System MUST support the "Soft Verification" model: users can log in and use basic features without verification, but see a persistent reminder.

### Key Entities

- **VerificationToken**: Represents a temporary secret link sent to the user.
    - `user_id`: Reference to the ServerOwner.
    - `token`: Hashed secret.
    - `expires_at`: Timestamp.
- **ServerOwner**: (Update to existing entity)
    - `discord_id`: Now fillable via the connection flow for email-based users.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Verification page loads and processes the token in under 1 second.
- **SC-002**: Users can complete the Discord connection flow in under 45 seconds (including Discord's auth screens).
- **SC-003**: 100% of successful verifications result in the removal of the verification banner for that user.
- **SC-004**: Error messages for expired tokens or duplicate Discord links are clear and provide a path to resolution.
