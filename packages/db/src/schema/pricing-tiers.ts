import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { discordServers } from "./discord-servers";
import { discordRoles } from "./discord-roles";
import { tierFeatures } from "./tier-features";

/**
 * PricingTier - Represents a subscription tier configuration for a server
 *
 * Defines what members can purchase, including price, duration, linked Discord role,
 * and features. Includes optimistic locking (version) for concurrent edit detection.
 */
export const pricingTiers = sqliteTable("pricing_tiers", {
  id: text("id").primaryKey(),
  discordServerId: text("discord_server_id")
    .notNull()
    .references(() => discordServers.id, { onDelete: "cascade" }),
  discordRoleId: text("discord_role_id").references(() => discordRoles.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  description: text("description"),
  priceCents: integer("price_cents").notNull(),
  currency: text("currency").notNull().default("USD"),
  duration: text("duration", { enum: ["monthly", "yearly", "lifetime"] }).notNull(),
  isFeatured: integer("is_featured", { mode: "boolean" })
    .notNull()
    .default(false),
  isActive: integer("is_active", { mode: "boolean" })
    .notNull()
    .default(true),
  displayOrder: integer("display_order").notNull(),
  version: integer("version").notNull().default(1),
  needsSync: integer("needs_sync", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  uniqueServerName: unique("unique_server_name").on(table.discordServerId, table.name),
  serverOrderIdx: index("server_order_idx").on(table.discordServerId, table.displayOrder),
  serverActiveIdx: index("server_active_idx").on(table.discordServerId, table.isActive),
  // Note: featured tier constraint is enforced at application level
  // SQLite doesn't support partial unique indexes in this version of Drizzle
}));

export const pricingTiersRelations = relations(pricingTiers, ({ one, many }) => ({
  discordServer: one(discordServers, {
    fields: [pricingTiers.discordServerId],
    references: [discordServers.id],
  }),
  discordRole: one(discordRoles, {
    fields: [pricingTiers.discordRoleId],
    references: [discordRoles.id],
  }),
  features: many(tierFeatures),
}));

export type PricingTier = typeof pricingTiers.$inferSelect;
export type NewPricingTier = typeof pricingTiers.$inferInsert;
