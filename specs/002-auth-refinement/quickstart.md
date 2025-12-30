# Quickstart: Auth Refinement

## Implementation Order

1. **Database**: Add `verification_tokens` table to `packages/db/src/schema/users.ts`.
2. **Backend**:
   - Implement `GET /api/auth/verify` in `apps/api/src/routes/auth.ts`.
   - Implement `GET /api/auth/connect/discord` and its callback in `apps/api/src/routes/auth.ts`.
   - Update `POST /api/auth/signup` to generate and send verification tokens.
3. **Frontend**:
   - Create `VerificationBanner.tsx` and add to the main Layout.
   - Add "Connect Discord" button to the Settings page.

## Verification Checklist

- [ ] Register with email -> Receive email -> Click link -> Verified status in DB.
- [ ] Log in with email -> Go to Settings -> Click Connect Discord -> Account linked (verify `discord_id` in DB).
- [ ] Attempt to connect a Discord account already in use by another user -> Error message displayed.
- [ ] Expired verification link shows clear error.
