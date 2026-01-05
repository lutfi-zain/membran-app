# Feature Specification: Payment & Subscription Flow

**Feature Branch**: `007-payment-subscription-flow`
**Created**: 2026-01-03
**Status**: Draft
**Input**: User description: "complete level 1 feature from @prp.md"

## Clarifications

### Session 2026-01-03

- Q: When a payment is in "Pending" status but never completes, what should happen to the subscription? → A: Auto-cancel after 1 hour
- Q: What availability target is required for the webhook endpoint that processes Midtrans payment notifications? → A: 99.99% uptime (~4.3 minutes downtime/month)
- Q: When a member's Discord privacy settings prevent DMs, how should the system handle DM delivery failures for payment confirmations? → A: Create subscription and send email notification as fallback
- Q: Can a single member have multiple active subscriptions to the same server, or should the system enforce only one active subscription per member per server? → A: One active subscription per member per server (new purchases replace or upgrade existing)
- Q: When a member with an existing active subscription purchases a new tier (upgrade/downgrade), what should happen to the existing subscription's expiry date and any unused time? → A: Pro-rated credit applied from old tier to new tier (unused time credited toward new subscription)
- Q: What is the relationship between "Subscription" and "MemberSubscription" entities mentioned in the spec? → A: They are the same - a Subscription represents a Discord member's relationship with a server's pricing tier. Use "Subscription" consistently (MemberSubscription removed)
- Q: How should the pro-rated credit be calculated when upgrading/downgrading tiers? → A: Time-based method: credit = (unused days ÷ total days in period) × old tier price. Credit applied as discount on new tier payment, with expiry date recalculated from payment date

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Member Checkout & Payment (Priority: P1)

A Discord member clicks on a server's pricing page link, selects a subscription tier, connects their Discord account, completes payment through Midtrans, and immediately receives the corresponding role in the server.

**Why this priority**: This is the core revenue-generating flow. Without this, server owners cannot monetize their communities. It delivers immediate value by automating what is currently a manual 24-48 hour process.

**Independent Test**: Can be fully tested by creating a test pricing page, selecting a tier, connecting Discord, completing a test Midtrans payment, and verifying the role is assigned within 10 seconds. The delivered value is instant member access after payment.

**Acceptance Scenarios**:

1. **Given** a member is on a server's pricing page, **When** they select a tier and click "Subscribe", **Then** they are redirected to Discord OAuth authorization
2. **Given** a member authorizes the Discord bot, **When** authorization completes, **Then** they are redirected to the Midtrans payment page with their selected tier pre-selected
3. **Given** a member completes payment on Midtrans, **When** the payment webhook is received, **Then** the corresponding Discord role is assigned within 10 seconds and the member receives a DM confirmation
4. **Given** a member's payment fails or is cancelled, **When** the failure webhook is received, **Then** no role is assigned and the member can retry payment
5. **Given** a payment is pending (awaiting bank transfer), **When** the pending webhook is received, **Then** the subscription status is set to "Pending" and role is assigned only when payment is confirmed

---

### User Story 2 - Midtrans Webhook Processing (Priority: P2)

The system receives payment notifications from Midtrans via webhooks, verifies their authenticity, processes the transaction status, and triggers appropriate actions (role assignment, subscription updates, notifications).

**Why this priority**: Without webhook processing, payment confirmation cannot happen automatically. This is critical for the entire subscription system to function. It's P2 because it's backend infrastructure that enables P1.

**Independent Test**: Can be fully tested by sending simulated Midtrans webhook payloads (success, pending, failure, refund) to the webhook endpoint and verifying that subscriptions are updated correctly and Discord role actions are triggered accordingly.

**Acceptance Scenarios**:

1. **Given** a valid Midtrans webhook with success status, **When** the webhook is received, **Then** the subscription is marked active, expiry date is set, and Discord role is assigned
2. **Given** a Midtrans webhook with invalid signature, **When** the webhook is received, **Then** the request is rejected with 401 status and no actions are taken
3. **Given** a duplicate webhook (same transaction ID), **When** the webhook is received, **Then** the system recognizes it as duplicate and processes it only once
4. **Given** a Midtrans refund webhook, **When** the webhook is received, **Then** the subscription is cancelled and the Discord role is removed
5. **Given** a Midtrans webhook for an unknown transaction ID, **When** the webhook is received, **Then** the system logs an error and returns 404

---

### User Story 3 - Member Subscription Portal (Priority: P3)

A member can view their current subscription status, see expiry date, and access renewal options through a self-service portal.

**Why this priority**: This provides member visibility and self-service capability, reducing support burden. It's P3 because the core payment flow (P1) works without it - members just wouldn't have visibility into their subscription status.

**Independent Test**: Can be fully tested by a logged-in member accessing the portal, viewing their subscription details (status, expiry date, tier), and initiating a renewal if needed.

**Acceptance Scenarios**:

1. **Given** a member with an active subscription, **When** they access the member portal, **Then** they see their current tier, expiry date, and renewal button
2. **Given** a member with an expiring subscription (within 7 days), **When** they access the member portal, **Then** they see a warning banner about upcoming expiry
3. **Given** a member with an expired subscription, **When** they access the member portal, **Then** they see their expired status and can initiate renewal
4. **Given** a member with no subscription, **When** they access the member portal, **Then** they are prompted to subscribe from the pricing page

---

### User Story 4 - Manual Role Management (Priority: P4)

A server owner can manually assign or remove subscription roles for members through the dashboard, useful for handling edge cases, comped subscriptions, or support scenarios.

**Why this priority**: This is an operational tool for server owners to handle exceptions. It's P4 because the automated system handles 99% of cases - this is for the remaining 1% of manual interventions.

**Independent Test**: Can be fully tested by a server owner accessing the member list in the dashboard, selecting a member, and manually assigning/removing a role, then verifying the action is reflected in Discord.

**Acceptance Scenarios**:

1. **Given** a server owner viewing the member list, **When** they click "Assign Role" for a member, **Then** they can select a tier and the role is assigned in Discord within 10 seconds
2. **Given** a server owner viewing the member list, **When** they click "Remove Role" for a member, **Then** the role is removed in Discord within 10 seconds and subscription status is updated
3. **Given** a server owner attempting manual role assignment, **When** the member has never connected Discord, **Then** they see an error that the member must connect Discord first
4. **Given** a server owner manually assigning a role, **When** the action completes, **Then** an activity log entry is created recording the manual intervention

---

### Edge Cases

- What happens when a member initiates payment but Midtrans webhook is delayed more than 5 minutes? → Webhook accepted up to 24 hours per FR-022, after that rejected with error
- What happens when a payment is in "Pending" status but the member never completes payment? (Auto-cancelled after 1 hour)
- How does system handle a member who starts checkout for Tier A but completes payment for Tier B (modified on Midtrans side)? → System accepts webhook, applies pro-rated credit if member has existing subscription, creates subscription for Tier B
- How does system handle tier upgrades/downgrades for members with existing active subscriptions? (Pro-rated credit from old tier applied to new tier)
- What happens when Discord API is temporarily down during role assignment attempt? → Retry 3 times with exponential backoff per FR-023
- How does system handle a member who has multiple pending payments for the same server? (System enforces one subscription; new payments replace/upgrade existing)
- What happens when Midtrans sends a webhook for a transaction that was already processed (duplicate delivery)? → System recognizes duplicate via transaction ID uniqueness and processes only once per FR-011
- How does system handle a refund webhook for a subscription that was already cancelled? → Subscription remains cancelled, no action taken
- What happens when a member's Discord account is deleted after subscription is active? → Subscription expires automatically at expiry date, notify server owner via activity log
- How does system handle webhook replay attacks where timestamp is manipulated? → Timestamp validation rejects webhooks older than 24 hours per FR-022
- What happens when a payment is confirmed but role assignment fails due to missing Discord permissions? → Validate bot permissions before assignment per FR-024, log failure, notify server owner
- How does system handle a member who subscribes, gets role, then immediately refunds before role is fully assigned? → Refund webhook triggers role removal per FR-014
- What happens when Discord DM delivery fails due to member privacy settings or blocked bot? → Email fallback notification sent per FR-012

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow Discord members to initiate subscription checkout from a server's pricing page
- **FR-002**: System MUST redirect members to Discord OAuth authorization before payment processing
- **FR-003**: System MUST create a Midtrans transaction with the correct amount, item details, and customer information after Discord authorization
- **FR-004**: System MUST redirect members to Midtrans payment page with pre-populated transaction details
- **FR-005**: System MUST expose a webhook endpoint that accepts POST requests from Midtrans
- **FR-006**: System MUST verify Midtrans webhook signatures using the server key before processing any webhook
- **FR-007**: System MUST process successful payment webhooks by creating a subscription record and assigning Discord roles
- **FR-008**: System MUST set subscription expiry date based on the pricing tier's duration (monthly/yearly) from the payment date
- **FR-009**: System MUST handle pending payment status by creating a subscription in "Pending" state without assigning roles, and auto-cancel subscriptions that remain in "Pending" status for more than 1 hour
- **FR-010**: System MUST handle failed or cancelled payment webhooks by updating subscription status to "Failed" without assigning roles
- **FR-011**: System MUST implement idempotency for webhook processing using Midtrans transaction ID to prevent duplicate role assignments
- **FR-012**: System MUST send a DM to members upon successful role assignment with subscription details and expiry date, falling back to email notification if DM fails due to privacy settings
- **FR-013**: System MUST send a DM to members upon payment failure with instructions to retry, falling back to email notification if DM fails due to privacy settings
- **FR-014**: System MUST handle refund webhooks by cancelling the subscription and removing the Discord role
- **FR-015**: System MUST log all webhook events (success, failure, refund, pending) with timestamp and transaction details for audit purposes
- **FR-016**: System MUST return appropriate HTTP status codes for webhook endpoints (200 for success, 401 for invalid signature, 404 for unknown transaction)
- **FR-017**: System MUST allow members to view their subscription status, current tier, and expiry date through a member portal
- **FR-018**: System MUST display a renewal button in the member portal for active or expiring subscriptions
- **FR-019**: System MUST allow server owners to manually assign subscription roles to members through the dashboard
- **FR-020**: System MUST allow server owners to manually remove subscription roles from members through the dashboard
- **FR-021**: System MUST record all manual role assignments/removals in an activity log with timestamp and server owner identity
- **FR-022**: System MUST prevent webhook processing for transactions older than 24 hours to prevent stale webhook issues
- **FR-023**: System MUST retry failed Discord role assignments up to 3 times with exponential backoff before logging as failed
- **FR-024**: System MUST validate that Discord bot has required permissions before attempting role assignment
- **FR-025**: System MUST require email confirmation after member registration (via Discord OAuth or email signup) before allowing subscription purchase
- **FR-026**: System MUST send a confirmation email with verification link upon member registration
- **FR-027**: System MUST prevent subscription checkout until member's email is verified
- **FR-028**: System MUST enforce only one active subscription per member per server; new purchases must replace or upgrade the existing subscription
- **FR-029**: System MUST calculate pro-rated credit using time-based method: credit = (unused days ÷ total days in billing period) × old tier price, then apply credit as discount on new tier payment and recalculate expiry date from payment date

### Key Entities

- **Subscription**: Represents a Discord member's subscription to a specific server's pricing tier (the member-server relationship), including member Discord ID, server Discord ID, pricing tier ID, status (Active, Pending, Expired, Cancelled, Failed), start date, expiry date, last payment amount, and Midtrans transaction ID
- **Transaction**: Represents a payment transaction through Midtrans, including amount, currency, status (Pending, Success, Failed, Refunded), transaction ID, payment method, applied pro-rated credit amount, and timestamp
- **WebhookEvent**: Represents a received Midtrans webhook, including payload, signature verification status, processing status, and timestamp
- **ActivityLog**: Represents an audit trail of actions (payment received, role assigned, role removed, manual intervention), including actor (system or server owner), action type, timestamp, and relevant IDs

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Members can complete the full checkout flow (select tier → authorize Discord → complete payment → receive role) in under 3 minutes
- **SC-002**: Discord role is assigned within 10 seconds of successful Midtrans webhook receipt in 99% of cases
- **SC-003**: Midtrans webhooks are processed successfully with valid signatures in 100% of cases (no bypasses)
- **SC-004**: Duplicate webhook deliveries (same transaction ID) are correctly identified and processed only once in 100% of cases
- **SC-005**: Payment failure rate due to webhook processing issues is under 0.1% (excluding Midtrans or Discord outages)
- **SC-006**: Members can view their subscription status and expiry date through the member portal with page load time under 2 seconds
- **SC-007**: Server owners can manually assign or remove roles through the dashboard with action completion within 15 seconds
- **SC-008**: 95% of members successfully receive their DM confirmation after successful payment
- **SC-009**: System can handle 1000 concurrent payment initiations without degradation in response time
- **SC-010**: Webhook endpoint responds within 5 seconds for valid requests (Midtrans timeout requirement)
- **SC-011**: Webhook endpoint maintains 99.99% uptime availability (maximum 4.3 minutes downtime per month)

## Assumptions

- Server owners have already configured their Midtrans API keys and pricing tiers (completed in previous features)
- Discord bot is already invited to servers with required permissions (completed in previous features)
- Midtrans sandbox environment is available for testing payment flows
- Discord bot has permissions to: manage roles, send DMs to members, and read member information
- Midtrans supports webhooks with signature verification using server keys
- Members have a valid Discord account to complete OAuth authorization
- Server owners' Midtrans accounts are configured to accept Indonesian Rupiah (IDR) and/or other supported currencies
- Midtrans webhooks may be delivered out of order or delayed (system must handle this)
- Discord API rate limits allow for the expected volume of role assignments (global rate limits apply)

## Scope Boundaries

### In Scope

- Midtrans payment transaction creation and redirect to payment page
- Midtrans webhook receiving, signature verification, and processing
- Discord role assignment and removal based on payment status
- Member portal for subscription status viewing
- Manual role management by server owners
- Basic subscription status tracking (Active, Pending, Expired, Cancelled, Failed)
- Activity logging for all payment and role operations
- DM notifications to members on payment events (with email fallback for delivery failures)
- Email confirmation after member registration (via Discord OAuth or email signup)

### Out of Scope

- Automated expiry checking and reminder emails (Level 2 feature)
- Grace period system (Level 2 feature)
- Analytics dashboard (Level 2 feature)
- Coupon/discount system (Level 3 feature)
- Refund handling beyond webhook processing (manual refunds only)
- Subscription pause/resume functionality
- Multi-currency conversion (uses server owner's configured currency)
- Payment method filtering (all Midtrans methods available)
- Subscription upgrade/downgrade mid-term
- Webhook retry queue for failed Discord API calls (basic retry only)
- Advanced fraud detection
- Tax calculation or invoicing
