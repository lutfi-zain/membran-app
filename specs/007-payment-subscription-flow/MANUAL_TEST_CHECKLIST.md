# Manual Testing Checklist: Payment & Subscription Flow

**Feature**: 007-payment-subscription-flow
**Environment**: Local Development (localhost)
**Date**: 2026-01-04

---

## Pre-Test Setup

### Environment Verification

- [ ] API server running on http://localhost:8787
- [ ] Web server running on http://localhost:5173
- [ ] Database initialized (D1 local)
- [ ] Midtrans sandbox credentials configured
- [ ] Discord bot token configured

### Test Accounts Needed

- [ ] Discord account for testing OAuth
- [ ] Midtrans sandbox test card: `4811 1111 1111 1114` (CVV: `123`)
- [ ] Test Discord server with bot invited

### Quick Environment Check

```bash
# Verify API is running
curl http://localhost:8787/
# Expected: "Membran API"

# Verify Web is running
curl http://localhost:5173/
# Expected: HTML response (200 OK)

# Check database tables
cd apps/api
bunx wrangler d1 execute membran-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
# Expected: List of 16 tables
```

---

## Test Suite 1: Pricing Page (US1 - Checkout Flow)

### Test 1.1: Pricing Page Loads

**Steps**:
1. Open browser to: http://localhost:5173/pricing
2. Observe the page

**Expected Results**:
- [ ] Page loads without errors
- [ ] Title "Choose Your Subscription Plan" is visible
- [ ] Subheading about unlocking premium features is visible
- [ ] FAQ section is visible at the bottom

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 1.2: Tier Display

**Steps**:
1. Navigate to http://localhost:5173/pricing
2. Check for tier cards

**Expected Results**:
- [ ] Tier cards are displayed (if pricing tiers configured)
- [ ] Or empty state shown (no tiers configured yet)
- [ ] "Subscribe" or "Purchase" buttons visible

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 1.3: Authentication Warning

**Steps**:
1. Navigate to http://localhost:5173/pricing (logged out state)
2. Check for authentication prompts

**Expected Results**:
- [ ] Warning message visible for unauthenticated users
- [ ] "Sign in with Discord" link visible
- [ ] Email verification warning visible if applicable

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 2: Discord OAuth Flow (US1)

### Test 2.1: OAuth Initiation

**Steps**:
1. Navigate to http://localhost:5173/pricing
2. Click "Subscribe" on any tier
3. Observe redirect

**Expected Results**:
- [ ] Redirected to Discord OAuth authorization page
- [ ] URL contains `discord.com/oauth2/authorize`
- [ ] Bot name and permissions are shown

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 2.2: OAuth Authorization

**Steps**:
1. On Discord OAuth page, click "Authorize"
2. Wait for redirect back to app

**Expected Results**:
- [ ] Redirected back to http://localhost:5173
- [ ] Session created (check browser cookies for `auth_session`)
- [ ] User is now authenticated

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 2.3: Email Verification Check

**Steps**:
1. After OAuth, check if email is verified
2. If not verified, attempt to subscribe

**Expected Results**:
- [ ] If email not verified: warning message displayed
- [ ] Button or link to send verification email visible
- [ ] Checkout blocked until email verified

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 3: Payment Creation & Midtrans Redirect (US1)

### Test 3.1: Payment Transaction Creation

**Steps**:
1. After OAuth, select a tier
2. Click "Subscribe" or similar button
3. Observe the response

**Expected Results**:
- [ ] API call to `/api/payments/create` succeeds
- [ ] Transaction record created in database
- [ ] Pending subscription created
- [ ] Redirect URL received from Midtrans

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 3.2: Midtrans Redirect

**Steps**:
1. After payment creation, follow redirect to Midtrans
2. Observe Midtrans payment page

**Expected Results**:
- [ ] Redirected to Midtrans sandbox URL
- [ ] Correct amount displayed (e.g., Rp 100.000)
- [ ] Item details show tier name
- [ ] Customer email pre-filled

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 3.3: Payment Page Options

**Steps**:
1. On Midtrans payment page
2. Check available payment methods

**Expected Results**:
- [ ] Multiple payment options shown (QRIS, bank transfer, etc.)
- [ ] Test card option available
- [ ] Amount matches selected tier price

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 4: Test Payment Completion (US1)

### Test 4.1: Complete Test Payment

**Steps**:
1. On Midtrans payment page
2. Select "Credit Card" or similar
3. Enter test card details:
   - Card Number: `4811 1111 1111 1114`
   - CVV: `123`
   - Expiry: Any future date (e.g., `12/25`)
4. Click "Pay Now"

**Expected Results**:
- [ ] Payment processes successfully
- [ ] Redirected to checkout/success page
- [ ] Success message displayed

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 4.2: Webhook Processing

**Steps**:
1. After payment, check if webhook was received
2. Check database for subscription updates

**Database Queries**:
```bash
cd apps/api

# Check subscription
bunx wrangler d1 execute membran-db --local --command "SELECT * FROM subscriptions ORDER BY created_at DESC LIMIT 1;"

# Check transaction
bunx wrangler d1 execute membran-db --local --command "SELECT * FROM transactions ORDER BY created_at DESC LIMIT 1;"

# Check webhook events
bunx wrangler d1 execute membran-db --local --command "SELECT * FROM webhook_events ORDER BY created_at DESC LIMIT 1;"

# Check activity logs
bunx wrangler d1 execute membran-db --local --command "SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 1;"
```

**Expected Results**:
- [ ] Subscription status = "Active"
- [ ] Transaction status = "settlement" or "success"
- [ ] Webhook event logged
- [ ] Activity log entry for payment received
- [ ] Discord role assigned (check Discord server)

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 5: Member Portal (US3)

### Test 5.1: Portal Access

**Steps**:
1. Navigate to: http://localhost:5173/member-portal
2. Observe the page

**Expected Results**:
- [ ] Page loads without errors
- [ ] If active subscription exists: subscription card visible
- [ ] If no subscription: empty state or redirect to pricing

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 5.2: Active Subscription Display

**Steps**:
1. Navigate to http://localhost:5173/member-portal
2. Check subscription details (if active subscription exists)

**Expected Results**:
- [ ] Tier name displayed
- [ ] Expiry date shown
- [ ] Subscription status badge visible (Active/Pending/Expired)
- [ ] Renewal button present

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

### Test 5.3: Expiry Warning Banner

**Steps**:
1. Check if subscription expires within 7 days
2. Navigate to member portal

**Expected Results**:
- [ ] If expiring < 7 days: warning banner visible
- [ ] Banner shows "Expiring soon" or similar
- [ ] Days remaining indicated

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail ☐ N/A

---

### Test 5.4: Empty State (No Subscription)

**Steps**:
1. Use a user/account with no subscription
2. Navigate to http://localhost:5173/member-portal

**Expected Results**:
- [ ] Empty state message visible
- [ ] "No active subscription" or similar text
- [ ] CTA button to view pricing plans
- [ ] Button links to /pricing

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 6: Manual Role Management (US4)

### Test 6.1: Manual Role Assignment Endpoint

**Prerequisites**: Server owner account, member with Discord connected

**Steps**:
1. Get member ID and server ID
2. Use curl to test manual role assignment:

```bash
# Replace {memberId}, {serverId}, {tierId} with actual values
curl -X POST http://localhost:8787/api/members/{memberId}/roles \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_session=<your-session-cookie>" \
  -d '{
    "serverId": "{serverId}",
    "tierId": "{tierId}",
    "reason": "Manual test"
  }'
```

**Expected Results**:
- [ ] 200 OK response (if authenticated as server owner)
- [ ] Or 403 Forbidden (if not server owner)
- [ ] Or 401 Unauthorized (if not authenticated)
- [ ] Response includes: `success: true`, `roleAssigned: true`

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail ☐ N/A

---

### Test 6.2: Manual Role Removal Endpoint

**Steps**:
1. Use curl to test manual role removal:

```bash
curl -X DELETE http://localhost:8787/api/members/{memberId}/roles \
  -H "Content-Type: application/json" \
  -H "Cookie: auth_session=<your-session-cookie>" \
  -d '{
    "serverId": "{serverId}",
    "reason": "Manual removal test"
  }'
```

**Expected Results**:
- [ ] 200 OK response (if authorized)
- [ ] Response includes: `success: true`, `roleRemoved: true`
- [ ] Discord role removed in test server

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail ☐ N/A

---

### Test 6.3: Activity Logging for Manual Actions

**Steps**:
1. Perform manual role assignment
2. Check activity logs:

```bash
cd apps/api
bunx wrangler d1 execute membran-db --local --command "SELECT * FROM activity_logs WHERE action LIKE 'MANUAL%' ORDER BY created_at DESC LIMIT 5;"
```

**Expected Results**:
- [ ] Activity log entry created for manual assignment
- [ ] `action` = "MANUAL_ROLE_ASSIGN" or similar
- [ ] `actorType` = "server_owner"
- [ ] Details include reason and member info

**Actual Results**: _____________________

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 7: API Endpoints Health Check

### Test 7.1: Authentication Endpoints

```bash
# Health check
curl http://localhost:8787/
```

**Expected**: `Membran API` (200 OK)

**Status**: ☐ Pass

---

### Test 7.2: Subscriptions Endpoint

```bash
# Get subscriptions (requires auth)
curl http://localhost:8787/api/subscriptions
```

**Expected**:
- [ ] 200 OK (if authenticated)
- [ ] 401 Unauthorized (if not authenticated)
- [ ] JSON response with `success: true` and `data` array

**Status**: ☐ Pass

---

### Test 7.3: Pricing Tiers Endpoint

```bash
# Get pricing tiers
curl http://localhost:8787/api/pricing/tiers
```

**Expected**:
- [ ] 200 OK
- [ ] JSON response with tiers array
- [ ] Or 404 if no tiers configured

**Status**: ☐ Pass

---

### Test 7.4: Webhook Endpoint

```bash
# Test webhook endpoint (will fail signature verification)
curl -X POST http://localhost:8787/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"transaction_status":"settlement"}'
```

**Expected**:
- [ ] 401 Unauthorized (invalid signature)
- [ ] OR 200 OK with error about signature

**Status**: ☐ Pass

---

## Test Suite 8: Database Verification

### Test 8.1: Verify All Tables Exist

```bash
cd apps/api
bunx wrangler d1 execute membran-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected Tables**:
- [ ] `users`
- [ ] `sessions`
- [ ] `discord_servers`
- [ ] `pricing_tiers`
- [ ] `subscriptions`
- [ ] `transactions`
- [ ] `webhook_events`
- [ ] `activity_logs`

**Status**: ☐ Pass ☐ Fail

---

### Test 8.2: Verify Sample Data

```bash
# Check users
bunx wrangler d1 execute membran-db --local --command "SELECT COUNT(*) as count FROM users;"

# Check subscriptions
bunx wrangler d1 execute membran-db --local --command "SELECT status, COUNT(*) FROM subscriptions GROUP BY status;"

# Check transactions
bunx wrangler d1 execute membran-db --local --command "SELECT payment_status, COUNT(*) FROM transactions GROUP BY payment_status;"
```

**Actual Results**:
- Users: _____
- Subscriptions: _____
- Transactions: _____

**Status**: ☐ Data Verified

---

## Test Suite 9: Error Handling

### Test 9.1: Invalid Webhook Signature

**Steps**:
1. Send webhook with invalid signature:

```bash
curl -X POST http://localhost:8787/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -H "X-Signature: invalid_signature_123" \
  -d '{"transaction_status":"settlement"}'
```

**Expected**:
- [ ] 401 Unauthorized response
- [ ] Error message about invalid signature
- [ ] No subscription created

**Status**: ☐ Pass ☐ Fail

---

### Test 9.2: Duplicate Subscription Prevention

**Steps**:
1. Attempt to create a second active subscription for same member/server
2. Check error response

**Expected**:
- [ ] Error message about existing subscription
- [ ] Or option to upgrade/replace existing subscription
- [ ] No duplicate subscriptions created

**Status**: ☐ Pass ☐ Fail

---

### Test 9.3: Unconnected Discord Account

**Steps**:
1. Try to assign role to member without Discord connection
2. Use manual role assignment endpoint

**Expected**:
- [ ] Error: "Member has not connected Discord"
- [ ] Error code: `DISCORD_NOT_CONNECTED`
- [ ] No role assignment attempted

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 10: Performance Checks

### Test 10.1: Page Load Times

**Steps**:
1. Open browser DevTools (F12)
2. Navigate to http://localhost:5173/pricing
3. Check Network tab for page load time

**Expected**:
- [ ] Pricing page loads < 3 seconds (SC-001 target)
- [ ] Member portal loads < 2 seconds (SC-006 target)

**Actual**: Pricing _____ ms, Portal _____ ms

**Status**: ☐ Pass ☐ Fail

---

### Test 10.2: API Response Times

**Steps**:
1. Use DevTools or curl with timing
2. Measure API response times:

```bash
# Measure subscriptions API response time
time curl http://localhost:8787/api/subscriptions
```

**Expected**:
- [ ] API responds within 2 seconds
- [ ] Webhook endpoint responds < 5 seconds (SC-010)

**Actual**: _____ ms

**Status**: ☐ Pass ☐ Fail

---

## Test Suite 11: Edge Cases

### Test 11.1: Pending Subscription Expiry

**Steps**:
1. Create a pending subscription
2. Wait (or manually trigger expiry check)
3. Verify pending subscriptions are cancelled

**Expected**:
- [ ] Pending subscriptions older than 1 hour are auto-cancelled
- [ ] Status changed to "Cancelled" or "Failed"

**Status**: ☐ Pass ☐ Fail ☐ N/A (requires cron)

---

### Test 11.2: Failed Payment Handling

**Steps**:
1. Initiate payment but cancel/fail on Midtrans
2. Check subscription status

**Expected**:
- [ ] Subscription status = "Failed"
- [ ] No Discord role assigned
- [ ] Can retry payment

**Status**: ☐ Pass ☐ Fail

---

## Final Verification

### Overall System Health

- [ ] All core features working
- [ ] No console errors in browser
- [ ] API endpoints responding correctly
- [ ] Database operations successful
- [ ] Discord integration functional (if bot configured)

### Issues Found

List any issues discovered during testing:

1. _____________________
2. _____________________
3. _____________________

---

## Test Summary

| Suite | Tests | Passed | Failed | N/A |
|-------|-------|--------|--------|-----|
| Pricing Page | 3 | ☐ | ☐ | ☐ |
| OAuth Flow | 3 | ☐ | ☐ | ☐ |
| Payment Flow | 3 | ☐ | ☐ | ☐ |
| Member Portal | 4 | ☐ | ☐ | ☐ |
| Manual Roles | 3 | ☐ | ☐ | ☐ |
| API Health | 4 | ☐ | ☐ | ☐ |
| Database | 2 | ☐ | ☐ | ☐ |
| Error Handling | 3 | ☐ | ☐ | ☐ |
| Performance | 2 | ☐ | ☐ | ☐ |
| Edge Cases | 2 | ☐ | ☐ | ☐ |
| **TOTAL** | **29** | **___** | **___** | **___** |

---

## Notes

- Use browser DevTools (F12) for debugging
- Check browser console for JavaScript errors
- Check Network tab for API requests/responses
- Use `bunx wrangler d1 execute` for database queries
- Test both success and failure scenarios
- Verify Discord role assignments in your test server

---

**Tester**: _____________________
**Date**: _____________________
**Browser**: _____________________
**Test Environment**: Local (localhost)

