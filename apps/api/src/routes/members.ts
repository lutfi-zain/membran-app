/**
 * Members Routes
 *
 * Manual role management endpoints for server owners to assign/remove
 * subscription roles for edge cases and support scenarios.
 *
 * T076 [US4]: Create manual role assignment endpoint (POST /members/:memberId/roles)
 * T077 [US4]: Create manual role removal endpoint (DELETE /members/:memberId/roles)
 * T078 [US4]: Implement server owner authorization check
 * T079 [US4]: Validate member Discord connection before role assignment
 * T080 [US4]: Log manual role assignments to activity_logs
 * T081 [US4]: Log manual role removals to activity_logs
 */

import { zValidator } from '@hono/zod-validator';
import { createDb, users, pricingTiers, discordServers } from '@membran/db';
import { eq, and } from 'drizzle-orm';
import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { assignRole, removeRole, isUserConnected } from '../services/discord';
import { logActivity } from '../services/activity-log';

const membersRouter = new Hono<{
  Bindings: {
    DB: D1Database;
    DISCORD_BOT_TOKEN: string;
  };
}>();

// Validation schemas
const assignRoleSchema = {
  serverId: 'string',
  tierId: 'string',
  reason: 'string?', // Optional reason for audit trail
};

const removeRoleSchema = {
  serverId: 'string',
  reason: 'string?', // Optional reason for audit trail
};

/**
 * T078 [US4]: Server owner authorization check middleware
 *
 * Verifies that the requesting user is the owner of the server
 */
async function checkServerOwner(
  db: any,
  userId: string,
  serverId: string
): Promise<{ isOwner: boolean; error?: string }> {
  try {
    // Get the server and verify ownership
    const server = await db.query.discordServers.findFirst({
      where: (discordServers, { eq }) => eq(discordServers.id, serverId),
    });

    if (!server) {
      return { isOwner: false, error: 'Server not found' };
    }

    if (server.ownerId !== userId) {
      return { isOwner: false, error: 'Only server owners can perform this action' };
    }

    return { isOwner: true };
  } catch (error) {
    console.error('Error checking server ownership:', error);
    return {
      isOwner: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * T079 [US4]: Validate member Discord connection before role assignment
 *
 * Checks if the member has connected their Discord account
 */
async function validateDiscordConnection(
  db: any,
  memberId: string
): Promise<{ isConnected: boolean; discordUserId?: string; error?: string }> {
  try {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, memberId),
    });

    if (!user) {
      return { isConnected: false, error: 'Member not found' };
    }

    if (!isUserConnected(user.discordUserId)) {
      return {
        isConnected: false,
        error: 'Member has not connected their Discord account',
      };
    }

    return { isConnected: true, discordUserId: user.discordUserId! };
  } catch (error) {
    console.error('Error validating Discord connection:', error);
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * T076 [US4]: POST /members/:memberId/roles
 *
 * Manual role assignment endpoint for server owners
 */
membersRouter.post(
  '/:memberId/roles',
  zValidator('json', assignRoleSchema),
  async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    const memberId = c.req.param('memberId');
    const { serverId, tierId, reason } = c.req.valid('json');

    // Authentication check
    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        401
      );
    }

    const db = createDb(c.env.DB);

    // Get current user
    const session = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, sessionId),
      with: {
        user: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        },
        401
      );
    }

    const currentUserId = session.user.id;

    // T078: Check server owner authorization
    const ownerCheck = await checkServerOwner(db, currentUserId, serverId);
    if (!ownerCheck.isOwner) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: ownerCheck.error || 'Insufficient permissions' },
        },
        403
      );
    }

    // T079: Validate member Discord connection
    const connectionCheck = await validateDiscordConnection(db, memberId);
    if (!connectionCheck.isConnected) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCORD_NOT_CONNECTED',
            message: connectionCheck.error || 'Member has not connected Discord',
          },
        },
        400
      );
    }

    // Get tier to find Discord role ID
    const tier = await db.query.pricingTiers.findFirst({
      where: (pricingTiers, { eq }) => eq(pricingTiers.id, tierId),
    });

    if (!tier) {
      return c.json(
        {
          success: false,
          error: { code: 'NOT_FOUND', message: 'Pricing tier not found' },
        },
        404
      );
    }

    if (!tier.discordRoleId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TIER_NOT_CONFIGURED',
            message: 'Tier does not have a Discord role configured',
          },
        },
        400
      );
    }

    // Assign role in Discord
    const roleResult = await assignRole(
      { DISCORD_BOT_TOKEN: c.env.DISCORD_BOT_TOKEN },
      serverId,
      connectionCheck.discordUserId!,
      tier.discordRoleId
    );

    if (!roleResult.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCORD_API_ERROR',
            message: roleResult.error || 'Failed to assign role in Discord',
          },
        },
        500
      );
    }

    // T080: Log manual role assignment to activity_logs
    await logActivity(db, {
      subscriptionId: memberId, // Use memberId as subscriptionId for manual actions
      actorType: 'server_owner',
      actorId: currentUserId,
      action: 'MANUAL_ROLE_ASSIGN',
      details: {
        memberId,
        serverId,
        tierId,
        discordRoleId: tier.discordRoleId,
        reason: reason || 'Manual role assignment',
      },
    });

    return c.json({
      success: true,
      data: {
        roleAssigned: true,
        discordRoleId: tier.discordRoleId,
        memberId,
        tierId: tier.id,
        tierName: tier.name,
      },
    });
  }
);

/**
 * T077 [US4]: DELETE /members/:memberId/roles
 *
 * Manual role removal endpoint for server owners
 */
membersRouter.delete(
  '/:memberId/roles',
  zValidator('json', removeRoleSchema),
  async (c) => {
    const sessionId = getCookie(c, 'auth_session');
    const memberId = c.req.param('memberId');
    const { serverId, reason } = c.req.valid('json');

    // Authentication check
    if (!sessionId) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        },
        401
      );
    }

    const db = createDb(c.env.DB);

    // Get current user
    const session = await db.query.sessions.findFirst({
      where: (sessions, { eq }) => eq(sessions.id, sessionId),
      with: {
        user: true,
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return c.json(
        {
          success: false,
          error: { code: 'UNAUTHORIZED', message: 'Invalid session' },
        },
        401
      );
    }

    const currentUserId = session.user.id;

    // T078: Check server owner authorization
    const ownerCheck = await checkServerOwner(db, currentUserId, serverId);
    if (!ownerCheck.isOwner) {
      return c.json(
        {
          success: false,
          error: { code: 'FORBIDDEN', message: ownerCheck.error || 'Insufficient permissions' },
        },
        403
      );
    }

    // T079: Validate member Discord connection
    const connectionCheck = await validateDiscordConnection(db, memberId);
    if (!connectionCheck.isConnected) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCORD_NOT_CONNECTED',
            message: connectionCheck.error || 'Member has not connected Discord',
          },
        },
        400
      );
    }

    // Find the member's active subscription to get the tier role
    const subscription = await db.query.subscriptions.findFirst({
      where: (subscriptions, { and }) =>
        and(
          eq(subscriptions.memberId, memberId),
          eq(subscriptions.serverId, serverId),
          eq(subscriptions.status, 'Active')
        ),
      with: {
        tier: true,
      },
    });

    if (!subscription || !subscription.tier) {
      return c.json(
        {
          success: false,
          error: {
            code: 'NO_ACTIVE_SUBSCRIPTION',
            message: 'Member does not have an active subscription with a role to remove',
          },
        },
        404
      );
    }

    const tier = subscription.tier;
    if (!tier.discordRoleId) {
      return c.json(
        {
          success: false,
          error: {
            code: 'TIER_NOT_CONFIGURED',
            message: 'Tier does not have a Discord role configured',
          },
        },
        400
      );
    }

    // Remove role in Discord
    const roleResult = await removeRole(
      { DISCORD_BOT_TOKEN: c.env.DISCORD_BOT_TOKEN },
      serverId,
      connectionCheck.discordUserId!,
      tier.discordRoleId
    );

    if (!roleResult.success) {
      return c.json(
        {
          success: false,
          error: {
            code: 'DISCORD_API_ERROR',
            message: roleResult.error || 'Failed to remove role in Discord',
          },
        },
        500
      );
    }

    // T081: Log manual role removal to activity_logs
    await logActivity(db, {
      subscriptionId: subscription.id,
      actorType: 'server_owner',
      actorId: currentUserId,
      action: 'MANUAL_ROLE_REMOVE',
      details: {
        memberId,
        serverId,
        tierId: tier.id,
        discordRoleId: tier.discordRoleId,
        reason: reason || 'Manual role removal',
      },
    });

    return c.json({
      success: true,
      data: {
        roleRemoved: true,
        removedDiscordRoleId: tier.discordRoleId,
        memberId,
        tierId: tier.id,
        tierName: tier.name,
      },
    });
  }
);

export { membersRouter };
