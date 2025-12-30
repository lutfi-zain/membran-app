import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * OAuth States Table
 *
 * Stores OAuth state parameters for CSRF protection during Discord bot
 * invitation flow. States expire after 5 minutes.
 */
export const oauthStates = sqliteTable("oauth_states", {
  id: text("id").primaryKey(),
  state: text("state").notNull().unique(),
  userId: text("user_id").notNull(),
  metadata: text("metadata"), // JSON string for additional data
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

// Type exports
export type OAuthState = typeof oauthStates.$inferSelect;
export type NewOAuthState = typeof oauthStates.$inferInsert;
