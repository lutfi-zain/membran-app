import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text, index, unique } from "drizzle-orm/sqlite-core";
import { subscriptions } from "./subscriptions";

/**
 * Transaction - Midtrans payment transaction records
 *
 * Stores all payment transactions including status, payment method,
 * and Midtrans order/transaction IDs for reconciliation.
 */
export const transactions = sqliteTable("transactions", {
  id: text("id").primaryKey(),
  subscriptionId: text("subscription_id")
    .notNull()
    .references(() => subscriptions.id, { onDelete: "cascade" }),
  midtransOrderId: text("midtrans_order_id").notNull().unique(),
  midtransTransactionId: text("midtrans_transaction_id"),
  amount: integer("amount").notNull(),
  currency: text("currency").notNull().default("IDR"),
  status: text("status", {
    enum: ["Pending", "Success", "Failed", "Refunded"],
  }).notNull(),
  paymentMethod: text("payment_method"),
  paymentDate: integer("payment_date", { mode: "timestamp" }),
  grossAmount: integer("gross_amount"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
}, (table) => ({
  orderIdUnique: unique("order_id_unique").on(table.midtransOrderId),
  transactionSubscriptionIdx: index("transaction_subscription_idx").on(table.subscriptionId),
  transactionStatusIdx: index("transaction_status_idx").on(table.status),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
  subscription: one(subscriptions, {
    fields: [transactions.subscriptionId],
    references: [subscriptions.id],
  }),
}));

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
