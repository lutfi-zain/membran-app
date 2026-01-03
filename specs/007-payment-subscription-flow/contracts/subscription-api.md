# Subscription Management API Contract

**Feature**: Payment & Subscription Flow
**Version**: 1.0.0
**Status**: Draft

## Overview

APIs for managing subscriptions, including retrieval, updates, cancellations, and manual role assignment by server owners.

## Endpoints

### GET /api/subscriptions/:id

**Auth**: Required (member or server owner)
**Description**: Get subscription details

**Response** (200 OK):
```json
{
  "id": "uuid",
  "memberId": "uuid",
  "serverId": "uuid",
  "tier": {
    "id": "uuid",
    "name": "Premium",
    "price": 50000,
    "currency": "IDR",
    "duration": "monthly"
  },
  "status": "Active",
  "startDate": "2024-01-01T00:00:00Z",
  "expiryDate": "2024-02-01T00:00:00Z",
  "lastPaymentAmount": 50000,
  "lastPaymentDate": "2024-01-01T00:00:00Z"
}
```

### GET /api/subscriptions

**Auth**: Required
**Query Params**: `serverId`, `memberId`, `status`
**Description**: List subscriptions with filters

### POST /api/subscriptions/cancel

**Auth**: Required (subscription owner or server owner)
**Description**: Cancel an active subscription

**Request Body**:
```json
{
  "subscriptionId": "uuid",
  "reason": "optional"
}
```

### POST /api/admin/subscriptions/assign-role

**Auth**: Required (server owner only)
**Description**: Manually assign a subscription role to a member

**Request Body**:
```json
{
  "memberId": "uuid",
  "serverId": "uuid",
  "tierId": "uuid"
}
```

### DELETE /api/admin/subscriptions/:id/role

**Auth**: Required (server owner only)
**Description**: Manually remove a subscription role from a member

## Status Types

- `Active`: Payment confirmed, role assigned
- `Pending`: Payment initiated, awaiting confirmation
- `Expired`: Subscription period ended
- `Cancelled`: User cancelled or refunded
- `Failed`: Payment failed
