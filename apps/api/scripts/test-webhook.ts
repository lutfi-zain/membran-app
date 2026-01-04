/**
 * Manual Webhook Test Script
 * Simulates a Midtrans webhook to complete a subscription
 */

const SERVER_KEY = 'SB-Mid-server-damtqsYJP8w7g7X3h63FS5vh';

// Get from your transaction
const orderId = 'SUB-l84763k3oqnipkjde0orwsulg-1767503065740';
const transactionId = 'YOUR_MIDTRANS_TRANSACTION_ID'; // Check your Midtrans dashboard
const grossAmount = '1100.00';

// Create webhook payload
const webhookPayload = {
  transaction_id: transactionId || 'manual-test-' + Date.now(),
  order_id: orderId,
  gross_amount: grossAmount,
  payment_type: 'credit_card',
  transaction_status: 'settlement',
  status_code: '200',
  transaction_time: new Date().toISOString().replace('T', ' ').split('.')[0],
  signature_key: ''
};

// Generate signature
const signatureString = orderId + transactionStatus + grossAmount + SERVER_KEY;
// In production, Midtrans generates this, but we'll create a test one

console.log('Webhook Payload:');
console.log(JSON.stringify(webhookPayload, null, 2));

console.log('\nTo test, run:');
console.log(`curl -X POST http://localhost:8787/webhooks/midtrans \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(webhookPayload)}'`);
