# Checkout API Contract

**Feature**: Payment & Subscription Flow
**Version**: 1.0.0
**Status**: Draft

---

## Overview

The Checkout API handles the member subscription purchase flow, from tier selection through Discord OAuth to Midtrans payment initiation.

---

## Endpoints

### 1. Initiate Checkout

**Endpoint**: `POST /api/checkout/initiate`
**Auth**: Required (Discord OAuth session)
**Description**: Initiates the checkout flow for a selected pricing tier

**Request Body**:
```json
{
  "tierId": "uuid-v4",
  "serverId": "discord-snowflake-or-uuid"
}
```

**Response** (200 OK):
```json
{
  "status": "requires_oauth",
  "oauthUrl": "https://discord.com/oauth2/authorize?client_id=...&redirect_uri=...",
  "state": "random-state-string"
}
```

**Response** (200 OK - already authenticated):
```json
{
  "status": "requires_email_verification",
  "email": "user@example.com",
  "verified": false
}
```

**Response** (200 OK - ready for payment):
```json
{
  "status": "ready_for_payment",
  "tier": {
    "id": "uuid",
    "name": "Premium",
    "price": 50000,
    "currency": "IDR",
    "duration": "monthly"
  }
}
```

**Error Responses**:
- `400 Bad Request`: Invalid tier ID, tier not active, server not connected
- `401 Unauthorized`: No session
- `409 Conflict`: Member already has an active subscription (upgrade flow required)

---

### 2. Create Payment Transaction

**Endpoint**: `POST /api/checkout/create-payment`
**Auth**: Required (Discord OAuth + email verified)
**Description**: Creates a Midtrans transaction and returns redirect URL

**Request Body**:
```json
{
  "tierId": "uuid-v4",
  "serverId": "discord-snowflake-or-uuid",
  "existingSubscriptionId": "uuid-or-null"  // For upgrades
}
```

**Response** (200 OK):
```json
{
  "transactionId": "uuid-v4",
  "midtransOrderId": "ORDER-uuid",
  "redirectUrl": "https://app.midtrans.com/payment-link/...",
  "amount": 50000,
  "currency": "IDR",
  "expiry": "2024-01-03T12:00:00Z"
}
```

**Error Responses**:
- `400 Bad Request`: Email not verified, invalid tier
- `401 Unauthorized`: Session invalid or email not verified
- `409 Conflict`: Pending subscription already exists (auto-cancel after 1 hour)

---

### 3. Get Checkout Status

**Endpoint**: `GET /api/checkout/status/:transactionId`
**Auth**: Optional (public for payment completion redirect)
**Description**: Returns the current status of a checkout transaction

**Response** (200 OK):
```json
{
  "transactionId": "uuid",
  "status": "Pending",  // Pending | Success | Failed | Cancelled
  "subscriptionId": "uuid-or-null",
  "roleAssigned": false,
  "message": "Awaiting payment confirmation"
}
```

**Error Responses**:
- `404 Not Found`: Transaction not found

---

## Webhooks (Midtrans → Our System)

### POST /webhooks/midtrans

**Description**: Receives payment notification from Midtrans
**Auth**: Signature verification (SHA512 HMAC)
**Rate Limit**: None (Midtrans controlled)

**Request Headers**:
```
Content-Type: application/json
X-Signature: sha512_hash
```

**Request Body** (examples):
```json
// Success
{
  "order_id": "ORDER-uuid",
  "status_code": "200",
  "gross_amount": "50000.00",
  "transaction_status": "settlement",
  "payment_type": "qris",
  "transaction_id": "midtrans-tx-id",
  "transaction_time": "2024-01-03 12:00:00"
}

// Pending
{
  "order_id": "ORDER-uuid",
  "status_code": "201",
  "gross_amount": "50000.00",
  "transaction_status": "pending",
  "payment_type": "bank_transfer"
}

// Failed
{
  "order_id": "ORDER-uuid",
  "status_code": "202",
  "gross_amount": "50000.00",
  "transaction_status": "deny"
}
```

**Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook processed"
}
```

**Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature verification failed"
  }
}
```

**Response** (400 Bad Request):
```json
{
  "error": {
    "code": "TRANSACTION_TOO_OLD",
    "message": "Transaction timestamp exceeds 24 hour limit"
  }
}
```

---

## Schemas

### CheckoutStatus
```typescript
type CheckoutStatus = 
  | 'requires_oauth'
  | 'requires_email_verification'
  | 'ready_for_payment'
  | 'payment_pending'
  | 'payment_success'
  | 'payment_failed';
```

### TransactionStatus
```typescript
type TransactionStatus = 'Pending' | 'Success' | 'Failed' | 'Refunded';
```

### ErrorResponse
```typescript
interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}
```

---

## Flow Diagram

```
Member                API                   Midtrans           Discord
  |                    |                       |                  |
  |--POST /initiate-->|                       |                  |
  |<--oauth_url--------|                       |                  |
  |                    |                       |                  |
  |--OAuth redirect-->|                       |                  |
  |                    |--GET /user_me------->|                  |
  |<---session---------|                       |                  |
  |                    |                       |                  |
  |--POST /create-payment->|                  |                  |
  |                    |--POST /charge------->|                  |
  |<---redirect_url----|                       |                  |
  |                    |<---order_id----------|                  |
  |                    |                       |                  |
  |--Midtrans payment->|                       |                  |
  |                    |<-webhook (success)----|                  |
  |                    |                       |                  |
  |                    |--Assign role---------------------------->|
  |                    |<--200 OK-------------------------------|
  |                    |                       |                  |
  |<--role_assigned----|                       |                  |
```

---

## Security Considerations

1. **State Parameter**: OAuth flow uses random state parameter to prevent CSRF
2. **Session Validation**: All checkout endpoints require valid Discord session
3. **Email Verification**: Payment creation requires verified email
4. **Rate Limiting**: Checkout initiate limited to 5 requests/minute per member
5. **Webhook Signature**: All webhooks verified using SHA512 HMAC

---

## Testing

See `tests/e2e/007-checkout-flow.spec.ts` for E2E tests covering:
- OAuth flow completion
- Email verification
- Payment creation
- Webhook processing
- Role assignment

