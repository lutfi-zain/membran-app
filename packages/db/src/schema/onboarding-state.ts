import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const onboardingStates = sqliteTable("onboarding_states", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  botConnected: integer("bot_connected", { mode: "boolean" })
    .notNull()
    .default(false),
  pricingConfigured: integer("pricing_configured", { mode: "boolean" })
    .notNull()
    .default(false),
  completedAt: integer("completed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const onboardingStatesRelations = relations(onboardingStates, ({ one }) => ({
  user: one(users, {
    fields: [onboardingStates.userId],
    references: [users.id],
  }),
}));
