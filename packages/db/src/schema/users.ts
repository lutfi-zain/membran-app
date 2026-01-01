import { relations, sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { sessions } from "./sessions";
import { onboardingStates } from "./onboarding-state";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .notNull()
    .default(false),
  passwordHash: text("password_hash"),
  discordId: text("discord_id").unique(),
  subscriptionPlan: text("subscription_plan").notNull().default("free"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const usersRelations = relations(users, ({ many, one }) => ({
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
  verificationTokens: many(verificationTokens),
  onboardingState: one(onboardingStates, {
    fields: [onboardingStates.userId],
    references: [users.id],
  }),
}));

export const passwordResetTokens = sqliteTable("password_reset_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});

export const verificationTokens = sqliteTable("verification_tokens", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
});
