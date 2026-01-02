
/**
 * Resolve Discord role snowflake to internal database ID
 */
async function resolveDiscordRoleId(
  db: any,
  discordServerId: string,
  discordRoleIdSnowflake: string,
): Promise<string | null> {
  const role = await db
    .select()
    .from(discordRoles)
    .where(
      and(
        eq(discordRoles.discordServerId, discordServerId),
        eq(discordRoles.discordRoleId, discordRoleIdSnowflake),
      ),
    )
    .limit(1);

  return role[0]?.id ?? null;
}
