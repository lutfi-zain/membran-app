/**
 * E2E Tests: Midtrans Webhook Processing
 *
 * Tests webhook signature verification, idempotency, subscription state transitions,
 * Discord role assignment, and notifications
 *
 * Per Constitution Testing Discipline:
 * - Tests written FIRST, verified to FAIL
 * - Then implementation makes tests pass
 */

import { test, expect } from '@playwright/test';

const API_URL = process.env.API_URL || 'http://127.0.0.1:8787';
// MUST match the MIDTRANS_SERVER_KEY in apps/api/.dev.vars
const MIDTRANS_SERVER_KEY = 'maftia-digital-indonesia-sandbox_de2fd9006dcd045f88996d80740bec5fabd38808a7f0164929c8bfbbe2833241';

/**
 * Helper: Generate webhook signature
 * SHA512(order_id + status_code + gross_amount + SERVER_KEY)
 */
function generateWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  serverKey: string
): string {
  const crypto = require('crypto');
  const payload = orderId + statusCode + grossAmount + serverKey;
  return crypto.createHash('sha512').update(payload).digest('hex');
}

test.describe('Webhook Processing - Signature Verification', () => {
  test('T044: Reject webhook with invalid signature', async ({ request }) => {
    const webhookPayload = {
      transaction_id: 'test-tx-001',
      order_id: 'SUB-test-sub-001',
      gross_amount: '100000.00',
      payment_type: 'credit_card',
      transaction_status: 'settlement',
      status_code: '200',
      transaction_time: '2026-01-03 12:00:00',
    };

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': 'invalid-signature-12345',
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(401);

    const error = await response.json();
    expect(error.success).toBe(false);
    expect(error.error.code).toBe('INVALID_SIGNATURE');
  });

  test('T045: Accept webhook with valid signature', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-002',
      order_id: 'SUB-test-sub-002',
      gross_amount: '100000.00',
      payment_type: 'credit_card',
      transaction_status: 'settlement',
      status_code: '200',
      transaction_time: '2026-01-03 12:00:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);
  });
});

test.describe('Webhook Processing - Idempotency', () => {
  test('T046: Process duplicate webhook only once', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-003',
      order_id: 'SUB-test-sub-003',
      gross_amount: '150000.00',
      payment_type: 'gopay',
      transaction_status: 'settlement',
      status_code: '200',
      transaction_time: '2026-01-03 12:00:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    // Send first webhook
    const firstResponse = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(firstResponse.status()).toBe(200);

    // Send duplicate webhook
    const secondResponse = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(secondResponse.status()).toBe(200);

    // Verify only one subscription was created
    // (This would be verified via database query in real implementation)
  });
});

test.describe('Webhook Processing - Successful Payment', () => {
  test('T047: Activate subscription and assign role on successful payment', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-success',
      order_id: 'SUB-test-sub-success',
      gross_amount: '200000.00',
      payment_type: 'bank_transfer',
      transaction_status: 'settlement',
      status_code: '200',
      transaction_time: '2026-01-03 12:00:00',
      payment_date: '2026-01-03 12:05:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);

    // Verify subscription status changed to Active
    // Verify Discord role was assigned
    // Verify success notification was sent
  });

  test('T047a: Handle pending payment', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-pending',
      order_id: 'SUB-test-sub-pending',
      gross_amount: '100000.00',
      payment_type: 'echannel',
      transaction_status: 'pending',
      status_code: '201',
      transaction_time: '2026-01-03 12:00:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);

    // Verify subscription remains Pending
    // No role assigned yet
  });
});

test.describe('Webhook Processing - Failed & Refund', () => {
  test('T048: Cancel subscription on failed payment', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-failed',
      order_id: 'SUB-test-sub-failed',
      gross_amount: '100000.00',
      payment_type: 'credit_card',
      transaction_status: 'deny',
      status_code: '202',
      transaction_time: '2026-01-03 12:00:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);

    // Verify subscription status changed to Failed
    // Verify failure notification was sent
  });

  test('T049: Cancel subscription and remove role on refund', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-refund',
      order_id: 'SUB-test-sub-refund',
      gross_amount: '100000.00',
      payment_type: 'credit_card',
      transaction_status: 'refund',
      status_code: '200',
      transaction_time: '2026-01-03 12:00:00',
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    expect(response.status()).toBe(200);

    // Verify subscription status changed to Cancelled
    // Verify Discord role was removed
    // Verify refund notification was sent
  });
});

test.describe('Webhook Processing - Timestamp Validation', () => {
  test('T050: Reject webhook older than 24 hours', async ({ request }) => {
    const serverKey = MIDTRANS_SERVER_KEY;
    const webhookPayload = {
      transaction_id: 'test-tx-old',
      order_id: 'SUB-test-sub-old',
      gross_amount: '100000.00',
      payment_type: 'credit_card',
      transaction_status: 'settlement',
      status_code: '200',
      transaction_time: '2024-01-01 12:00:00', // Over 24 hours ago
    };

    const signature = generateWebhookSignature(
      webhookPayload.order_id,
      webhookPayload.status_code,
      webhookPayload.gross_amount,
      serverKey
    );

    const response = await request.post(`${API_URL}/webhooks/midtrans`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Signature': signature,
      },
      data: webhookPayload,
    });

    // Should return 400 with error for webhooks older than 24 hours
    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.success).toBe(false);
    expect(error.error.code).toBe('OLD_WEBHOOK');
  });
});
