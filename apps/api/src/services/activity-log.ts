/**
 * Activity Log Service
 * Audit trail for system actions
 */

import { activityLogs } from '@membran/db';
import { eq } from 'drizzle-orm';

export interface LogActivityParams {
  subscriptionId?: string;
  actorType: 'system' | 'server_owner';
  action: string;
  details?: Record<string, unknown>;
}

/**
 * Log an activity event
 */
export async function logActivity(
  db: any,
  params: LogActivityParams
): Promise<void> {
  try {
    const activityId = crypto.randomUUID();

    await db.insert(activityLogs).values({
      id: activityId,
      subscriptionId: params.subscriptionId || null,
      actorType: params.actorType,
      actorId: null, // System actions have no actor ID
      action: params.action,
      details: params.details ? JSON.stringify(params.details) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error logging activity:', error);
    // Don't throw - logging failure shouldn't block operations
  }
}

/**
 * Get activity history for a subscription
 */
export async function getActivityHistory(
  db: any,
  subscriptionId: string,
  limit = 50
): Promise<Array<{
  id: string;
  actorType: string;
  action: string;
  details: Record<string, unknown> | null;
  createdAt: Date;
}>> {
  try {
    const activities = await db
      .select()
      .from(activityLogs)
      .where(eq(activityLogs.subscriptionId, subscriptionId))
      .limit(limit)
      .orderBy(activityLogs.createdAt, 'desc')
      .execute();

    return activities.map((activity: any) => ({
      id: activity.id,
      actorType: activity.actorType,
      action: activity.action,
      details: activity.details ? JSON.parse(activity.details) : null,
      createdAt: new Date(Number(activity.createdAt)),
    }));
  } catch (error) {
    console.error('Error fetching activity history:', error);
    return [];
  }
}
