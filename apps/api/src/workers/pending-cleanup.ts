/**
 * Pending Subscription Cleanup Worker
 *
 * Cloudflare Workers Cron Trigger
 * Runs hourly to cancel pending subscriptions older than 1 hour
 *
 * Cron schedule: 0 * * * * (every hour)
 */

import { createDb, subscriptions } from '@membran/db';
import { and, eq, sql } from 'drizzle-orm';
import { cancelExpiredPendingSubscriptions } from '../services/subscriptions';

interface Env {
  DB: D1Database;
  CRON_SECRET?: string;
}

export default {
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    // Verify cron secret if set (security measure)
    if (env.CRON_SECRET) {
      const authHeader = event.requestHeaders.get('Authorization');
      if (authHeader !== `Bearer ${env.CRON_SECRET}`) {
        console.error('Unauthorized cron trigger');
        return;
      }
    }

    console.log('Starting pending subscription cleanup...');

    try {
      const db = createDb(env.DB);
      const result = await cancelExpiredPendingSubscriptions(db);

      console.log(`Cleanup complete: ${result.cancelled} subscriptions cancelled`);

      if (result.error) {
        console.error('Cleanup error:', result.error);
      }
    } catch (error) {
      console.error('Cleanup failed:', error);
    }
  },
} satisfies ExportedHandler<Env>;
