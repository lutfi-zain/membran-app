import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, index } from "drizzle-orm/sqlite-core";

/**
 * WebhookEvent - Audit log for received Midtrans webhooks
 *
 * Logs all webhook payloads for debugging, replay attack prevention,
 * and compliance. Stores signature verification result and processing status.
 */
export const webhookEvents = sqliteTable("webhook_events", {
  id: text("id").primaryKey(),
  midtransOrderId: text("midtrans_order_id").notNull(),
  payload: text("payload").notNull(), // JSON string
  signature: text("signature").notNull(),
  verified: integer("verified", { mode: "boolean" }).notNull(),
  processed: integer("processed", { mode: "boolean" })
    .notNull()
    .default(false),
  processingError: text("processing_error"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  webhookOrderIdIdx: index("webhook_order_id_idx").on(table.midtransOrderId),
  webhookCreatedIdx: index("webhook_created_idx").on(table.createdAt),
}));

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
