/**
 * Discord Bot Service
 * Handles role assignment, DM sending, and bot operations
 */

// Note: For Cloudflare Workers, we'll use REST API instead of discord.js
// because discord.js requires Node.js runtime and doesn't work in Workers

const DISCORD_API_BASE = 'https://discord.com/api/v10';

// Environment interface for Discord service
export interface DiscordEnv {
  DISCORD_BOT_TOKEN: string;
}

/**
 * Get Discord bot token from environment
 */
function getBotToken(env: DiscordEnv): string {
  const token = env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error('DISCORD_BOT_TOKEN environment variable is not set');
  }
  return token;
}

/**
 * Assign a role to a member in a server
 */
export async function assignRole(
  env: DiscordEnv,
  guildId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getBotToken(env);

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204) {
      return { success: true };
    }

    if (response.status === 404) {
      return { success: false, error: 'Member not found or bot not in server' };
    }

    if (response.status === 403) {
      return { success: false, error: 'Bot lacks MANAGE_ROLES permission' };
    }

    const error = await response.text();
    return { success: false, error: error || 'Failed to assign role' };
  } catch (error) {
    console.error('Error assigning Discord role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Remove a role from a member in a server
 */
export async function removeRole(
  env: DiscordEnv,
  guildId: string,
  userId: string,
  roleId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getBotToken(env);

    const response = await fetch(
      `${DISCORD_API_BASE}/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204) {
      return { success: true };
    }

    if (response.status === 404) {
      return { success: false, error: 'Member not found or bot not in server' };
    }

    if (response.status === 403) {
      return { success: false, error: 'Bot lacks MANAGE_ROLES permission' };
    }

    const error = await response.text();
    return { success: false, error: error || 'Failed to remove role' };
  } catch (error) {
    console.error('Error removing Discord role:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Send a direct message to a user
 */
export async function sendDM(
  env: DiscordEnv,
  userId: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getBotToken(env);

    // First, create DM channel
    const dmResponse = await fetch(`${DISCORD_API_BASE}/users/@me/channels`, {
      method: 'POST',
      headers: {
        'Authorization': `Bot ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        recipient_id: userId,
      }),
    });

    if (!dmResponse.ok) {
      if (dmResponse.status === 403) {
        return { success: false, error: 'DM_FAILED' }; // User has DMs disabled
      }
      const error = await dmResponse.text();
      return { success: false, error: error || 'Failed to create DM channel' };
    }

    const dmChannel = await dmResponse.json();

    // Then send message
    const msgResponse = await fetch(
      `${DISCORD_API_BASE}/channels/${dmChannel.id}/messages`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      }
    );

    if (!msgResponse.ok) {
      const error = await msgResponse.text();
      return { success: false, error: error || 'Failed to send DM' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending Discord DM:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate bot permissions in a server
 */
export async function validateBotPermissions(
  env: DiscordEnv,
  guildId: string,
  requiredPermissions: bigint = 0x00000020 // MANAGE_ROLES
): Promise<{ success: boolean; error?: string }> {
  try {
    const token = getBotToken(env);

    // Get bot's guild member object
    const response = await fetch(
      `${DISCORD_API_BASE}/users/@me/guilds/${guildId}/member`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bot ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Bot not in server' };
      }
      return { success: false, error: 'Failed to fetch bot member' };
    }

    const member = await response.json();
    const permissions = BigInt(member.permissions || '0');

    if ((permissions & requiredPermissions) !== requiredPermissions) {
      return { success: false, error: 'Bot lacks required permissions (MANAGE_ROLES)' };
    }

    return { success: true };
  } catch (error) {
    console.error('Error validating bot permissions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Check if a user is connected to Discord (has Discord ID)
 */
export function isUserConnected(discordUserId: string | null): boolean {
  return discordUserId !== null && discordUserId !== undefined && discordUserId !== '';
}
