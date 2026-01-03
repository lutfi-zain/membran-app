# Member Portal API Contract

**Feature**: Payment & Subscription Flow
**Version**: 1.0.0
**Status**: Draft

## Overview

APIs for the member self-service portal where members can view their subscriptions and manage renewals.

## Endpoints

### GET /api/portal/subscriptions

**Auth**: Required (Discord OAuth)
**Description**: Get all subscriptions for the authenticated member

**Response** (200 OK):
```json
{
  "subscriptions": [
    {
      "id": "uuid",
      "server": {
        "id": "uuid",
        "name": "Awesome Community",
        "icon": "https://cdn.discordapp.com/..."
      },
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
      "daysRemaining": 15,
      "isExpiringSoon": true
    }
  ]
}
```

### GET /api/portal/subscriptions/:id

**Auth**: Required
**Description**: Get detailed subscription information

**Response** (200 OK):
```json
{
  "subscription": {
    "id": "uuid",
    "status": "Active",
    "tier": { ... },
    "server": { ... },
    "startDate": "2024-01-01T00:00:00Z",
    "expiryDate": "2024-02-01T00:00:00Z",
    "lastPayment": {
      "amount": 50000,
      "date": "2024-01-01T00:00:00Z",
      "method": "qris"
    },
    "renewalOptions": [
      {
        "tierId": "uuid",
        "name": "Premium Monthly",
        "price": 50000,
        "duration": "monthly"
      }
    ]
  }
}
```

### POST /api/portal/renew

**Auth**: Required
**Description**: Initiate subscription renewal

**Request Body**:
```json
{
  "subscriptionId": "uuid",
  "newTierId": "uuid"
}
```

**Response** (200 OK):
```json
{
  "transactionId": "uuid",
  "redirectUrl": "https://app.midtrans.com/payment-link/...",
  "creditApplied": 15000
}
```

## Notifications

### GET /api/portal/notifications

**Auth**: Required
**Description**: Get portal notifications for the member

**Response** (200 OK):
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "expiry_warning",
      "message": "Your subscription expires in 3 days",
      "subscriptionId": "uuid",
      "read": false,
      "createdAt": "2024-01-29T00:00:00Z"
    }
  ]
}
```

## Page Load Time Target

< 2 seconds for portal page load (SC-006)
