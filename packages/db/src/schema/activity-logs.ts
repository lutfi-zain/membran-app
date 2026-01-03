import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { subscriptions } from "./subscriptions";

/**
 * ActivityLog - Audit trail for all system actions
 *
 * Records payment receipts, role assignments, manual interventions,
 * and other significant events for compliance and debugging.
 */
export const activityLogs = sqliteTable("activity_logs", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id").references(
    () => subscriptions.id,
    { onDelete: "set null" }
  ),
  actorType: text("actor_type", {
    enum: ["system", "server_owner"],
  }).notNull(),
  actorId: text("actor_id"),
  action: text("action").notNull(),
  details: text("details"), // JSON string
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  activitySubscriptionIdx: index("activity_subscription_idx").on(table.subscriptionId),
  actorIdx: index("actor_idx").on(table.actorType, table.actorId),
  activityCreatedIdx: index("activity_created_idx").on(table.createdAt),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [activityLogs.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
