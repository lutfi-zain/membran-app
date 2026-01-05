# Quickstart: Payment & Subscription Flow

**Feature**: 007-payment-subscription-flow
**Last Updated**: 2026-01-03

## Overview

This guide provides step-by-step instructions for implementing the payment and subscription flow feature. Follow these steps in order for a smooth development experience.

---

## Prerequisites

Before starting, ensure you have:

1. **Database Setup** (D1):
   ```bash
   # Create D1 database
   bunx wrangler d1 create membran-db
   ```

2. **Midtrans Sandbox Account**:
   - Sign up at [https://dashboard.midtrans.com](https://dashboard.midtrans.com)
   - Get Server Key and Client Key from Settings > Access Keys
   - Set environment variables:
     ```bash
     MIDTRANS_SERVER_KEY=SB-MID-SERVER-xxx
     MIDTRANS_CLIENT_KEY=SB-MID-CLIENT-xxx
     ```

3. **Discord Bot Application**:
   - Created from previous feature (003-discord-bot-connection)
   - Bot token available
   - OAuth2 redirect configured

4. **Email Service** (Resend recommended):
   ```bash
   RESEND_API_KEY=re_xxx
   ```

---

## Step 1: Database Schema Setup

### 1.1 Run Migration

```bash
# Apply database migration
cd apps/api
bunx wrangler d1 migrations apply membran-db --local
```

### 1.2 Verify Tables

```bash
# List tables
bunx wrangler d1 execute membran-db --local --command "SELECT name FROM sqlite_master WHERE type='table';"

# Expected output:
# - members
# - subscriptions
# - transactions
# - webhook_events
# - activity_logs
```

---

## Step 2: Install Dependencies

```bash
# Install all dependencies
bun install

# Verify Midtrans SDK
bun pm ls | grep midtrans
```

---

## Step 3: Environment Configuration

Create `.dev.vars` in `apps/api/`:

```bash
# Database
DATABASE_URL=file:///dev/db

# Midtrans (Sandbox)
MIDTRANS_SERVER_KEY=SB-MID-SERVER-xxx
MIDTRANS_CLIENT_KEY=SB-MID-CLIENT-xxx
MIDTRANS_ENVIRONMENT=sandbox

# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_CLIENT_SECRET=your_client_secret

# Email
RESEND_API_KEY=re_xxx
FROM_EMAIL=noreply@membran.app

# OAuth
OAUTH_REDIRECT_URI=http://localhost:5173/auth/callback
SESSION_SECRET=random_32_char_string
```

---

## Step 4: Implement Core Services

### 4.1 Midtrans Service (`apps/api/src/services/midtrans.ts`)

```typescript
import Midtrans from 'midtrans-client';

export const midtransClient = {
  snap: new Midtrans.Snap({
    isProduction: false,
    serverKey: process.env.MIDTRANS_SERVER_KEY!,
    clientKey: process.env.MIDTRANS_CLIENT_KEY!,
  }),
};

export async function createTransaction(params: {
  orderId: string;
  amount: number;
  customerEmail: string;
  tierName: string;
}) {
  return await midtransClient.snap.createTransaction({
    transaction_details: {
      order_id: params.orderId,
      gross_amount: params.amount,
    },
    customer_details: {
      email: params.customerEmail,
    },
    item_details: [{
      id: params.orderId,
      price: params.amount,
      quantity: 1,
      name: params.tierName,
    }],
  });
}
```

### 4.2 Webhook Verification (`apps/api/src/services/webhooks.ts`)

```typescript
import crypto from 'crypto';

export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  receivedSignature: string
): boolean {
  const payload = orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY;
  const expectedSignature = crypto.createHash('sha512').update(payload).digest('hex');
  return receivedSignature === expectedSignature;
}
```

---

## Step 5: Implement API Routes

### 5.1 Payment Creation Endpoint (`apps/api/src/routes/payments.ts`)

```typescript
import { Hono } from 'hono';
import { createTransaction } from '../services/midtrans';

const payments = new Hono();

payments.post('/create', async (c) => {
  const { serverId, tierId } = await c.req.json();

  // Validate member has verified email
  // Create pending subscription
  // Generate unique order ID
  // Call Midtrans createTransaction
  // Return redirect URL

  return c.json({
    success: true,
    data: {
      transactionId: '...',
      redirectUrl: '...',
      expiry: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    },
  }, 201);
});
```

### 5.2 Webhook Handler (`apps/api/src/routes/webhooks.ts`)

```typescript
import { Hono } from 'hono';
import { verifyWebhookSignature } from '../services/webhooks';

const webhooks = new Hono();

webhooks.post('/midtrans', async (c) => {
  const body = await c.req.json();
  const signature = c.req.header('X-Signature')!;

  // Verify signature
  const isValid = verifyWebhookSignature(
    body.order_id,
    body.status_code,
    body.gross_amount.toString(),
    signature
  );

  if (!isValid) {
    return c.json({ success: false, error: { code: 'INVALID_SIGNATURE' } }, 401);
  }

  // Check for duplicate (order_id uniqueness)
  // Process transaction status
  // Update subscription
  // Assign Discord role
  // Send DM/Email notification
  // Log activity

  return c.json({ status: 'ok', message: 'Webhook processed' }, 200);
});
```

---

## Step 6: Implement Discord Role Assignment

### 6.1 Discord Service (`apps/api/src/services/discord.ts`)

```typescript
import { Client, GatewayIntentBits } from 'discord.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.login(process.env.DISCORD_BOT_TOKEN);

export async function assignRole(guildId: string, userId: string, roleId: string) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);
  await member.roles.add(roleId);
}

export async function removeRole(guildId: string, userId: string, roleId: string) {
  const guild = await client.guilds.fetch(guildId);
  const member = await guild.members.fetch(userId);
  await member.roles.remove(roleId);
}

export async function sendDM(userId: string, message: string) {
  try {
    const user = await client.users.fetch(userId);
    const dm = await user.createDM();
    await dm.send(message);
  } catch (error) {
    if (error.code === 50007) {
      // Cannot send DM - user has DMs disabled
      throw new Error('DM_FAILED');
    }
    throw error;
  }
}
```

---

## Step 7: Frontend Integration

### 7.1 Payment Button Component (`apps/web/src/components/PaymentButton.tsx`)

```tsx
import { useMutation } from '@tanstack/react-query';

export function PaymentButton({ serverId, tierId }: { serverId: string; tierId: string }) {
  const createPayment = useMutation({
    mutationFn: async () => {
      const res = await fetch('/api/payments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, tierId }),
      });
      return res.json();
    },
    onSuccess: (data) => {
      window.location.href = data.data.redirectUrl;
    },
  });

  return (
    <button onClick={() => createPayment.mutate()} disabled={createPayment.isPending}>
      {createPayment.isPending ? 'Processing...' : 'Subscribe Now'}
    </button>
  );
}
```

---

## Step 8: Testing

### 8.1 Unit Tests

```bash
# Run unit tests
bun test
```

### 8.2 E2E Tests

```bash
# Run Playwright E2E tests
bunx playwright test
```

### 8.3 Manual Testing Flow

1. **Start dev servers**:
   ```bash
   # Terminal 1: API
   cd apps/api && bun run dev

   # Terminal 2: Web
   cd apps/web && bun run dev
   ```

2. **Test payment flow**:
   - Navigate to pricing page
   - Click "Subscribe" on a tier
   - Complete Discord OAuth
   - Complete test payment (use Midtrans test card: 4811 1111 1111 1114)
   - Verify role assigned in Discord
   - Check member portal shows subscription

3. **Test webhook**:
   ```bash
   # Use Midtrans dashboard to simulate webhook
   # Or use curl with test payload
   ```

---

## Step 9: Deploy to Production

### 9.1 Cloudflare Workers (API)

```bash
cd apps/api
bun run deploy
```

### 9.2 Cloudflare Pages (Web)

```bash
cd apps/web
bun run build
bun run deploy
```

### 9.3 Production Environment Variables

Set these in Cloudflare Workers dashboard:

```
MIDTRANS_SERVER_KEY=MT-PROD-xxx
MIDTRANS_CLIENT_KEY=MT-PROD-xxx
MIDTRANS_ENVIRONMENT=production
DATABASE_URL=cloudflare-d1-binding
DISCORD_BOT_TOKEN=prod_token
SESSION_SECRET=prod_secret
RESEND_API_KEY=re_prod_xxx
```

---

## Step 10: Monitor and Verify

### 10.1 Health Checks

```bash
# Check API health
curl https://api.membran.app/health

# Check webhook endpoint
curl -X POST https://api.membran.app/webhooks/midtrans
```

### 10.2 Monitoring

- Cloudflare Analytics: Request volume, errors
- Midtrans Dashboard: Transaction success rate
- Discord: Bot connected status
- Sentry (configured): Error tracking

---

## Troubleshooting

### Issue: Webhook signature verification fails

**Solution**: Ensure `MIDTRANS_SERVER_KEY` matches exactly (no extra whitespace). Check that gross_amount format matches (string vs number).

### Issue: Discord role not assigned

**Solution**: Verify bot has `MANAGE_ROLES` permission. Check bot token is valid. Verify role ID is correct snowflake.

### Issue: DM delivery fails

**Solution**: User may have DMs disabled. Email fallback should trigger. Check `RESEND_API_KEY` is valid.

### Issue: Pending subscriptions not auto-cancelling

**Solution**: Verify Cloudflare Workers Cron Trigger is configured: `0 * * * *` (hourly).

---

## Next Steps

After completing this quickstart:

1. ✅ Run full E2E test suite
2. ✅ Update `prp.md` checkpoints (Milestone 2 & 3)
3. ✅ Deploy to staging environment
4. ✅ Beta test with 3 server owners
5. ✅ Monitor metrics for 1 week
6. ✅ Address any bugs or UX issues
7. ✅ Production deployment

---

## Resources

- **Midtrans Docs**: [https://api-docs.midtrans.com](https://api-docs.midtrans.com)
- **Discord.js Docs**: [https://discord.js.org](https://discord.js.org)
- **Cloudflare D1**: [https://developers.cloudflare.com/d1](https://developers.cloudflare.com/d1)
- **Resend API**: [https://resend.com/docs](https://resend.com/docs)
