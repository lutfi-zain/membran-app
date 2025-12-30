# Research: Auth Refinement

## Decision: Token-based Email Verification
- **Choice**: Use hashed tokens stored in a dedicated `verification_tokens` table.
- **Rationale**: Decouples verification from the user record, allows for easy rotation/expiry, and follows security best practices (don't store raw tokens).
- **Alternatives considered**: 
  - JWT for verification: Rejected due to inability to easily invalidate tokens without a blacklist.
  - Adding `verification_token` to `users` table: Rejected as it doesn't scale well for multiple token types (reset, verify).

## Decision: Post-Registration OAuth Linking
- **Choice**: Separate "Initiate Connect" and "Callback Connect" endpoints.
- **Rationale**: Initiating requires an active session. The callback must verify the session and the `state` parameter from Discord to prevent CSRF.
- **Alternatives considered**:
  - Re-using the Signup callback: Rejected because logic differs (update vs create) and session requirement is strict for linking.

## Decision: Soft Verification Banner UI
- **Choice**: Dismissible (per-session) banner in the layout.
- **Rationale**: Principle V (Quality Assurance) - handles the "Soft Verification" model by allowing access while maintaining visibility.
- **Alternatives considered**:
  - Full-page blocker: Rejected per spec requirement (allow immediate access).
