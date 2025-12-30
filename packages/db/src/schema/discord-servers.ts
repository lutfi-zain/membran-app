import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

/**
 * DiscordServer - Represents a Discord server connected to a user account
 *
 * MVP enforces one-to-one relationship with users via user_id UNIQUE constraint.
 * State machine: Pending → Connected ↔ Disconnected
 */
export const discordServers = sqliteTable("discord_servers", {
  id: text("id").primaryKey(),
  discordId: text("discord_id").notNull(), // NOT unique - multiple users can connect to same server
  name: text("name").notNull(),
  icon: text("icon"),
  memberCount: integer("member_count").notNull().default(0),
  botStatus: text("bot_status", {
    enum: ["Connected", "Disconnected", "Pending"],
  })
    .notNull()
    .default("Pending"),
  botAddedAt: integer("bot_added_at", { mode: "timestamp" }).notNull(),
  permissions: text("permissions").notNull(), // Comma-separated flags e.g. "8,1024,2048"
  accessToken: text("access_token").notNull(), // Store encrypted
  refreshToken: text("refresh_token").notNull(), // Store encrypted
  tokenExpiresAt: integer("token_expires_at", { mode: "timestamp" }).notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id)
    .unique(), // MVP: one-to-one
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const discordServersRelations = relations(discordServers, ({ one }) => ({
  user: one(users, {
    fields: [discordServers.userId],
    references: [users.id],
  }),
}));

// Type exports for TypeScript usage
export type DiscordServer = typeof discordServers.$inferSelect;
export type NewDiscordServer = typeof discordServers.$inferInsert;
