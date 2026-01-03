# Webhook API Contract

**Feature**: Payment & Subscription Flow
**Version**: 1.0.0
**Status**: Draft

## Overview

The Webhook API handles incoming payment notifications from Midtrans. This is a critical endpoint that must be highly available (99.99% uptime target) and process webhooks idempotently.

## Endpoint

### POST /webhooks/midtrans

**Description**: Receives and processes payment status notifications from Midtrans

**Headers**:
```
Content-Type: application/json
X-Signature: <sha512_hash>
User-Agent: Midtrans/2.0
```

**Request Body**: Midtrans webhook payload (varies by payment type)

**Success Response** (200 OK):
```json
{
  "success": true,
  "message": "Webhook processed successfully",
  "transactionId": "uuid-v4",
  "subscriptionStatus": "Active"
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": {
    "code": "INVALID_SIGNATURE",
    "message": "Webhook signature verification failed"
  }
}
```

## Signature Verification

**Algorithm**: SHA512 HMAC
**Calculation**: `SHA512(order_id + status_code + gross_amount + SERVER_KEY)`

## Idempotency

Uses database unique constraint on `midtrans_order_id` to prevent duplicate processing.

## SLA Requirements

| Metric | Target |
|--------|--------|
| Uptime | 99.99% |
| Response Time | <5 seconds (P95) |
| Signature Verification | 100% |
| Idempotency | 100% |
