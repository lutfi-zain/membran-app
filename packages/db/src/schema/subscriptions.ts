import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { discordServers } from "./discord-servers";
import { pricingTiers } from "./pricing-tiers";

/**
 * Subscription - Represents a member's subscription to a pricing tier on a server
 *
 * State transitions:
 * - Pending → Active (payment successful)
 * - Pending → Cancelled (timeout after 1 hour)
 * - Active → Expired (past expiry_date)
 * - Active → Cancelled (refund or manual cancellation)
 * - Failed → (terminal state)
 * - Cancelled → (terminal state)
 *
 * Note: The one-active-subscription-per-member-per-server constraint is
 * enforced at the application level, not via database unique constraint.
 */
export const subscriptions = sqliteTable("subscriptions", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  serverId: text("server_id")
    .notNull()
    .references(() => discordServers.id, { onDelete: "cascade" }),
  tierId: text("tier_id")
    .notNull()
    .references(() => pricingTiers.id),
  status: text("status", {
    enum: ["Active", "Pending", "Expired", "Cancelled", "Failed"],
  }).notNull(),
  startDate: integer("start_date", { mode: "timestamp" }).notNull(),
  expiryDate: integer("expiry_date", { mode: "timestamp" }),
  lastPaymentAmount: integer("last_payment_amount"),
  lastPaymentDate: integer("last_payment_date", { mode: "timestamp" }),
  gracePeriodUntil: integer("grace_period_until", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  memberServerIdx: index("member_server_idx").on(table.memberId, table.serverId),
  statusIdx: index("status_idx").on(table.status),
  expiryIdx: index("expiry_idx").on(table.expiryDate),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one, many }) => ({
  member: one(users, {
    fields: [subscriptions.memberId],
    references: [users.id],
  }),
  server: one(discordServers, {
    fields: [subscriptions.serverId],
    references: [discordServers.id],
  }),
  tier: one(pricingTiers, {
    fields: [subscriptions.tierId],
    references: [pricingTiers.id],
  }),
}));

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
