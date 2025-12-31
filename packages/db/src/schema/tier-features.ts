import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { pricingTiers } from "./pricing-tiers";

/**
 * TierFeature - Represents a single feature/benefit within a pricing tier
 *
 * Stores individual feature descriptions for each tier. Max 20 features per tier.
 * Cascade deletes when parent tier is deleted.
 */
export const tierFeatures = sqliteTable("tier_features", {
  id: text("id").primaryKey(),
  tierId: text("tier_id")
    .notNull()
    .references(() => pricingTiers.id, { onDelete: "cascade" }),
  description: text("description").notNull(),
  displayOrder: integer("display_order").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  tierOrderIdx: index("tier_order_idx").on(table.tierId, table.displayOrder),
  uniqueTierOrder: unique("unique_tier_order").on(table.tierId, table.displayOrder),
}));

export const tierFeaturesRelations = relations(tierFeatures, ({ one }) => ({
  tier: one(pricingTiers, {
    fields: [tierFeatures.tierId],
    references: [pricingTiers.id],
  }),
}));

export type TierFeature = typeof tierFeatures.$inferSelect;
export type NewTierFeature = typeof tierFeatures.$inferInsert;
