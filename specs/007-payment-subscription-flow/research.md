# Research: Payment & Subscription Flow

**Feature**: 007-payment-subscription-flow
**Date**: 2026-01-03
**Status**: Complete

## Overview

This document captures research findings for implementing the payment and subscription flow, covering Midtrans integration patterns, Discord bot role management, webhook best practices, email verification implementation, and Cloudflare Workers constraints.

---

## 1. Midtrans Integration

### Decision: Use Midtrans Core API with Snap Redirect

**Rationale**: Midtrans offers two integration approaches - Snap Redirect (recommended for SaaS) and Direct API integration. Snap Redirect provides:
- Hosted payment page (PCI-DSS compliance handled by Midtrans)
- Support for all Indonesian payment methods (GoPay, OVO, Dana, bank transfer, cards)
- Simpler implementation (no sensitive card data touches our servers)
- Better mobile experience

**Implementation Approach**:
1. Create transaction via Midtrans Core API (`/v2/charge` with `payment_type: "snap"`)
2. Receive `redirect_url` in response
3. Redirect user to Snap payment page
4. Midtrans sends webhook to our endpoint after payment
5. Process webhook and assign Discord role

**Alternatives Considered**:
- **Direct API Integration**: Rejected due to PCI-DSS complexity and higher security burden
- **Snap Popup**: Rejected due to poor mobile UX compared to redirect

### Webhook Signature Verification

**Decision**: Implement SHA512 signature verification as per Midtrans documentation

**Rationale**: Midtrans sends webhook with `X-Signature` header computed as:
```
SHA512(order_id + status_code + gross_amount + SERVER_KEY)
```
Verification prevents fraudulent webhook spoofing.

**Implementation Pattern**:
```typescript
// Pseudo-code for signature verification
const expectedSignature = sha512(
  body.order_id +
  body.status_code +
  body.gross_amount +
  MIDTRANS_SERVER_KEY
);
if (webhookSignature !== expectedSignature) {
  return new Response('Invalid signature', { status: 401 });
}
```

### Idempotency Strategy

**Decision**: Use Midtrans `order_id` as unique constraint with database-level uniqueness

**Rationale**: Midtrans guarantees unique `order_id` per transaction. Database uniqueness constraint prevents duplicate processing even if webhook is delivered multiple times.

**Implementation**:
- Store `transaction_id` (Midtrans order_id) as UNIQUE in transactions table
- Check for existing transaction before processing webhook
- Return 200 if already processed (idempotent response)

---

## 2. Discord Bot Role Management

### Decision: Use Discord.js (Bun-compatible) for role assignment

**Rationale**: Discord.js has excellent Bun support, comprehensive documentation, and async/await patterns that work well with Cloudflare Workers.

**Key Discord API Endpoints**:
- `PUT /guilds/{guild.id}/members/{user.id}/roles/{role.id}` - Assign role
- `DELETE /guilds/{guild.id}/members/{user.id}/roles/{role.id}` - Remove role
- `GET /users/@me/channels` - Create DM channel
- `POST /channels/{channel.id}/messages` - Send DM

**Rate Limiting Considerations**:
- Discord allows 1 role update/sec per server (global bucket)
- Implementation: Use Cloudflare Queues or simple retry with exponential backoff
- For 100 concurrent role assignments: expect ~100 seconds completion time

### DM Delivery Failure Handling

**Decision**: Implement try-catch with email fallback

**Rationale**: Discord members can disable DMs from bots or block the bot entirely. Attempting to DM in these scenarios throws API errors.

**Implementation Pattern**:
```typescript
try {
  await sendDM(memberId, message);
} catch (error) {
  if (error.code === 50007) { // Cannot send messages to this user
    await sendEmailFallback(member.email, message);
  }
}
```

---

## 3. Subscription Lifecycle Management

### Decision: State machine with database constraints

**Subscription States**:
- `Pending` - Initial state after transaction creation
- `Active` - Successful payment, role assigned
- `Failed` - Payment failed/declined
- `Cancelled` - Refunded or manually cancelled
- `Expired` - Past expiry date (Level 2 feature, schema prepared now)

### Pending Subscription Auto-Cancel

**Decision**: Cloudflare Workers Cron Trigger for hourly cleanup

**Rationale**: Pending subscriptions must auto-cancel after 1 hour. Cloudflare Workers supports scheduled events (Cron Triggers) on paid plans.

**Implementation**:
- Create cron worker with schedule: `0 * * * *` (hourly)
- Query: `UPDATE subscriptions SET status = 'Cancelled' WHERE status = 'Pending' AND created_at < datetime('now', '-1 hour')`

### One Subscription Per Member Per Server

**Decision**: Database unique constraint on `(member_id, server_id)` for active subscriptions

**Rationale**: Enforces business rule at data level, prevents race conditions.

**Implementation**:
```sql
CREATE UNIQUE INDEX idx_active_subscription
ON subscriptions (member_id, server_id)
WHERE status = 'Active';
```

### Pro-Rated Credit Calculation

**Decision**: Calculate unused days and apply as discount to new subscription

**Formula**:
```
unused_days = (expiry_date - current_date) / 86400
unused_value = (unused_days / days_in_old_tier) * old_tier_price
new_expiry = current_date + (new_tier_duration + (unused_value / new_tier_price) * new_tier_duration)
```

**Example**:
- User has 15 days left on $10/month tier (30-day month)
- Upgrades to $20/month tier
- Unused value: (15/30) * $10 = $5
- $5 credit applied to $20 = $15 net charge
- New expiry: today + 30 days (full month from upgrade date)

---

## 4. Email Verification Flow

### Decision: Send verification email on OAuth callback, store token in database

**Rationale**: Members arrive via Discord OAuth which doesn't provide email by default. Need to collect email separately and verify before allowing subscription purchase.

**Implementation Flow**:
1. Discord OAuth callback → exchange code for access token
2. Get user info from Discord API (may not include email)
3. Redirect to email collection page
4. User submits email → generate verification token (36-char UUID)
5. Send email with verification link: `/verify-email?token={uuid}`
6. Click link → update member record `email_verified = true`
7. Allow checkout flow

**Email Service Options**:
- Cloudflare Workers supports sending via:
  - Mailgun (HTTP API)
  - SendGrid (HTTP API)
  - AWS SES (HTTP API)
- **Recommendation**: Use Resend (simplest API, generous free tier, Cloudflare-friendly)

---

## 5. Cloudflare Workers Constraints

### CPU Time Limits

**Constraint**: Free tier = 30ms CPU time per request, Paid = 10s

**Implications**:
- Webhook processing must be efficient
- Discord API calls (typically 100-500ms) count toward CPU time
- Email sending (HTTP API) also counts

**Mitigation**:
- Use Cloudflare Queues for heavy operations (role assignment, email sending)
- Webhook handler returns 200 immediately, queues background jobs
- Monitoring: Track CPU time usage in Cloudflare Analytics

### Database (D1) Limits

**Free Tier**:
- 5M read operations/day
- 100K write operations/day
- 500MB storage

**Projection for 10K subscriptions**:
- Reads: ~50K/day (5% of free tier) ✓
- Writes: ~20K/day (20% of free tier) ✓
- Storage: ~5MB (1% of free tier) ✓

**Decision**: Free tier sufficient for MVP, monitor for growth

---

## 6. Testing Strategy

### Decision: Playwright for E2E, Bun test for integration

**Rationale**: Constitution requires E2E testing. Playwright works for both frontend and API testing.

**Test Coverage Plan**:

**Phase 1 (Data Model + Contracts)**:
- Unit tests for pro-rated credit calculation
- Integration tests for subscription CRUD operations
- Webhook signature verification tests

**Phase 2 (Implementation)**:
- Full checkout flow: OAuth → payment → webhook → role assignment
- Edge cases: DM failure, pending timeout, duplicate webhooks
- Member portal access and display
- Manual role assignment by server owner

---

## 7. Security Considerations

### Webhook Security
- ✅ SHA512 signature verification
- ✅ HTTPS only enforced
- ✅ Rate limiting on webhook endpoint (Cloudflare DDoS protection)

### Payment Security
- ✅ PCI-DSS delegated to Midtrans (Snap Redirect)
- ✅ No card data stored in our systems
- ✅ Transaction amounts stored only for audit (not PAN data)

### Member Data
- ✅ Email addresses stored with verification status
- ✅ Discord user IDs (no PII from Discord)
- ✅ Midtrans transaction IDs (reference only, no payment credentials)

---

## 8. PRP Alignment Check

### Checkpoints Addressed

From prp.md Section 7 (Checkpoints & Definition of Done):

**Milestone 2: Midtrans Payment Flow**:
- ✅ Midtrans SDK integrated (covered: Section 1)
- ✅ POST /payments/create endpoint (planned: contracts/api.yaml)
- ✅ POST /webhooks/midtrans handler (covered: Section 1)
- ✅ Signature verification (covered: Section 1)
- ✅ Idempotency (covered: Section 1)

**Milestone 3: Discord Bot Integration**:
- ✅ Role assignment API (covered: Section 2)
- ✅ Rate limiting handling (covered: Section 2)
- ✅ DM delivery with fallback (covered: Section 2)

### DOD Verification

From prp.md Section 7 (Security Basics):
- ✅ No hardcoded API keys (env vars documented)
- ✅ Rate limiting on API endpoints (Cloudflare DDoS)
- ✅ HTTPS enforced (Cloudflare auto)
- ✅ CSRF protection (Hono middleware planned)
- ✅ Input validation (Zod schemas planned)

---

## Summary of Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Midtrans Integration | Snap Redirect (hosted payment page) | PCI-DSS compliance, better UX, simpler |
| Webhook Verification | SHA512 signature + order_id uniqueness | Security, idempotency |
| Discord Library | Discord.js (Bun-compatible) | Excellent Bun support, async patterns |
| Pending Cleanup | Cloudflare Workers Cron Trigger | Serverless, no infra overhead |
| Email Service | Resend | Simple API, generous free tier |
| Testing | Playwright (E2E) + Bun (unit/integration) | Constitution requirement |

---

## Open Questions Resolved

All items from Technical Context have been resolved through research. No NEEDS CLARIFICATION markers remain.

**Next Phase**: Proceed to Phase 1 - Design & Contracts (data-model.md, contracts/, quickstart.md)
