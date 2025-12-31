import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { discordServers } from "./discord-servers";

/**
 * DiscordRole - Represents a Discord role synced from a connected server
 *
 * Caches Discord roles for validation and selection during tier configuration.
 * Tracks which roles the bot can manage based on bot's position in role hierarchy.
 */
export const discordRoles = sqliteTable("discord_roles", {
  id: text("id").primaryKey(),
  discordServerId: text("discord_server_id")
    .notNull()
    .references(() => discordServers.id, { onDelete: "cascade" }),
  discordRoleId: text("discord_role_id").notNull(),
  roleName: text("role_name").notNull(),
  botCanManage: integer("bot_can_manage", { mode: "boolean" })
    .notNull()
    .default(false),
  position: integer("position").notNull().default(0),
  color: integer("color"),
  hoist: integer("hoist", { mode: "boolean" }).notNull().default(false),
  permissions: text("permissions"),
  syncedAt: integer("synced_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  uniqueServerRole: unique("unique_server_role").on(table.discordServerId, table.discordRoleId),
  serverManageableIdx: index("server_manageable_idx").on(table.discordServerId, table.botCanManage),
}));

export const discordRolesRelations = relations(discordRoles, ({ one }) => ({
  discordServer: one(discordServers, {
    fields: [discordRoles.discordServerId],
    references: [discordServers.id],
  }),
}));

export type DiscordRole = typeof discordRoles.$inferSelect;
export type NewDiscordRole = typeof discordRoles.$inferInsert;
