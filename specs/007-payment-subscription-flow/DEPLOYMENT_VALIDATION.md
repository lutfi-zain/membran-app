# Staging Deployment Validation: Payment & Subscription Flow

**T090 [Polish]**: Deploy to staging and validate quickstart.md steps

This document provides the staging deployment validation checklist for the payment and subscription flow feature.

---

## Pre-Deployment Checklist

### Environment Variables

- [ ] Midtrans Sandbox credentials configured
  - [ ] `MIDTRANS_SERVER_KEY` set to SB-MID-SERVER-xxx
  - [ ] `MIDTRANS_CLIENT_KEY` set to SB-MID-CLIENT-xxx
  - [ ] `MIDTRANS_ENVIRONMENT=sandbox`

- [ ] Discord Bot configuration
  - [ ] `DISCORD_BOT_TOKEN` valid for test server
  - [ ] `DISCORD_CLIENT_ID` matches application
  - [ ] `DISCORD_CLIENT_SECRET` valid

- [ ] Database configuration
  - [ ] D1 database created: `membran-db-staging`
  - [ ] Migrations applied to staging database

- [ ] Email service
  - [ ] `RESEND_API_KEY` valid
  - [ ] `FROM_EMAIL` configured

- [ ] Session & OAuth
  - [ ] `SESSION_SECRET` generated (32+ chars)
  - [ ] `OAUTH_REDIRECT_URI` points to staging URL

---

## Step 1: Database Setup Validation

### 1.1 Create Staging Database

```bash
# Create staging D1 database
bunx wrangler d1 create membran-db-staging
```

**Expected Output**: Database created with ID

### 1.2 Apply Migrations

```bash
cd apps/api
bunx wrangler d1 migrations apply membran-db-staging --remote
```

**Expected Output**: All migrations applied successfully

### 1.3 Verify Tables

```bash
bunx wrangler d1 execute membran-db-staging --remote --command "SELECT name FROM sqlite_master WHERE type='table';"
```

**Expected Tables**:
- ✅ `users`
- ✅ `discord_servers`
- ✅ `pricing_tiers`
- ✅ `subscriptions`
- ✅ `transactions`
- ✅ `webhook_events`
- ✅ `activity_logs`
- ✅ `sessions`

---

## Step 2: API Deployment Validation

### 2.1 Deploy to Workers

```bash
cd apps/api
bun run deploy
```

**Expected Output**: Deployment successful with URL

### 2.2 Verify API Health

```bash
# Replace with your staging URL
curl https://api-staging.membran.app/
```

**Expected Response**: `Membran API`

### 2.3 Verify Webhook Endpoint

```bash
# Health check (should return 401 without valid signature)
curl -X POST https://api-staging.membran.app/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"transaction_status":"settlement"}'
```

**Expected Response**: `401 Unauthorized` (endpoint exists, rejects invalid signature)

---

## Step 3: Frontend Deployment Validation

### 3.1 Build & Deploy

```bash
cd apps/web
bun run build
bun run deploy
```

**Expected Output**: Deployment successful with URL

### 3.2 Verify Frontend

```bash
# Open in browser
open https://app-staging.membran.app
```

**Expected**:
- ✅ Page loads without errors
- ✅ Pricing page accessible
- ✅ Member portal accessible (requires auth)

---

## Step 4: Integration Testing (Staging)

### Test Case 1: OAuth Flow

1. Navigate to: `https://app-staging.membran.app/pricing`
2. Click "Subscribe" on any tier
3. **Expected**: Redirect to Discord authorization
4. Authorize the application
5. **Expected**: Redirect back to app with session

**Validation Checklist**:
- [ ] Discord OAuth completes successfully
- [ ] Session created in database
- [ ] User redirected correctly

### Test Case 2: Payment Creation

1. After OAuth, select a tier
2. Click "Subscribe"
3. **Expected**: Redirect to Midtrans sandbox

**Validation Checklist**:
- [ ] Payment record created in `transactions` table
- [ ] `pending` subscription created in `subscriptions` table
- [ ] Midtrans redirect URL includes correct amount

### Test Case 3: Webhook Processing

Use Midtrans dashboard to send test webhook:

```bash
# Or use curl with staging webhook URL
curl -X POST https://api-staging.membran.app/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -H "X-Signature: <calculated_signature>" \
  -d '{
    "transaction_status": "settlement",
    "transaction_id": "STAGING-TEST-001",
    "status_code": "200",
    "gross_amount": "100000.00",
    "currency": "IDR"
  }'
```

**Validation Checklist**:
- [ ] Webhook received (200 status)
- [ ] `webhook_events` table has record
- [ ] `subscriptions` table updated to `Active`
- [ ] Discord role assigned in test server
- [ ] `activity_logs` has role assignment entry

### Test Case 4: Member Portal

1. Navigate to: `https://app-staging.membran.app/member-portal`
2. **Expected**: See active subscription details

**Validation Checklist**:
- [ ] Current tier displayed
- [ ] Expiry date shown
- [ ] Renewal button visible
- [ ] Page load time < 2 seconds (SC-006)

### Test Case 5: Manual Role Management

1. As server owner, access member management
2. Select a member and assign role
3. **Expected**: Role assigned within 10 seconds

**Validation Checklist**:
- [ ] Server owner authorization works
- [ ] Manual assignment endpoint responds
- [ ] Discord role assigned
- [ ] Activity log entry created

---

## Step 5: Performance Validation

### Webhook Response Time

```bash
# Measure webhook response time (should be < 5s per SC-010)
time curl -X POST https://api-staging.membran.app/webhooks/midtrans \
  -H "Content-Type: application/json" \
  -d '{"transaction_status":"settlement"}'
```

**Expected**: Response time < 5000ms

### Role Assignment Time

Check Discord for role assignment timing:
1. Trigger payment webhook
2. Note webhook receipt time
3. Check Discord for role assignment time
4. **Expected**: Role assigned within 10 seconds (SC-002)

---

## Step 6: Monitoring Setup

### Cloudflare Analytics

- [ ] Workers Analytics enabled
- [ ] Request volume monitoring configured
- [ ] Error rate monitoring configured

### Sentry (Optional)

- [ ] Sentry DSN configured
- [ ] Error tracking verified
- [ ] Performance monitoring enabled

### Midtrans Dashboard

- [ ] Transaction monitoring configured
- [ ] Webhook logging enabled
- [ ] Success rate metrics visible

---

## Step 7: Rollback Plan

If critical issues are found:

### Immediate Rollback

```bash
# Workers: Redeploy previous version
cd apps/api
bun run deploy:rollback

# Pages: Redeploy previous version
cd apps/web
bun run deploy:rollback
```

### Database Rollback (if needed)

```bash
# Disable migrations in wrangler.toml
# Redeploy without migration changes
```

---

## Post-Deployment Verification

### Smoke Tests

Run after every deployment:

```bash
# API health
curl https://api-staging.membran.app/

# Webhook endpoint (expect 401)
curl -X POST https://api-staging.membran.app/webhooks/midtrans

# Frontend
curl -I https://app-staging.membran.app
```

### Integration Tests

Run full E2E test suite against staging:

```bash
# Update environment variables for staging
export WEB_URL=https://app-staging.membran.app
export API_URL=https://api-staging.membran.app

# Run tests
bunx playwright test
```

---

## Success Criteria

Deployment is successful when:

- ✅ All 7 database tables exist
- ✅ API responds to health checks
- ✅ Frontend loads without errors
- ✅ OAuth flow completes
- ✅ Payment creation redirects to Midtrans
- ✅ Webhook processing updates subscriptions
- ✅ Discord roles are assigned
- ✅ Member portal displays subscriptions
- ✅ Manual role management works
- ✅ Performance metrics meet spec:
  - Webhook response < 5s
  - Role assignment < 10s
  - Portal load time < 2s

---

## Known Issues & Workarounds

### Issue: Discord Bot Not in Staging Server

**Workaround**: Invite bot to staging server using OAuth URL:
```
https://discord.com/api/oauth2/authorize?client_id=<CLIENT_ID>&permissions=8&scope=bot%20applications.commands
```

### Issue: Midtrans Sandbox Webhook Not Reaching Staging

**Workaround**:
1. Use Midtrans dashboard to set webhook URL
2. Ensure URL is public (not localhost)
3. Check firewall rules

### Issue: Email Not Sending

**Workaround**:
1. Verify Resend API key is valid for staging domain
2. Check email domain is verified in Resend dashboard
3. Check spam folder

---

## Next Steps After Staging Validation

1. ✅ Beta testing with 3 server owners
2. ✅ Monitor metrics for 1 week
3. ✅ Address any bugs
4. ✅ Production deployment (T090 complete)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-04
**Status**: Ready for validation
