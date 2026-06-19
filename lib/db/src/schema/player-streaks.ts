import { pgTable, text, integer, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const playerStreaksTable = pgTable("player_streaks", {
  playerId: text("player_id").primaryKey(),
  currentStreak: integer("current_streak").notNull().default(0),
  maxStreak: integer("max_streak").notNull().default(0),
  lastPlayedDate: date("last_played_date", { mode: "string" }),
  totalPlays: integer("total_plays").notNull().default(0),
  winCount: integer("win_count").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertPlayerStreakSchema = createInsertSchema(playerStreaksTable).omit({
  updatedAt: true,
});
export type InsertPlayerStreak = z.infer<typeof insertPlayerStreakSchema>;
export type PlayerStreak = typeof playerStreaksTable.$inferSelect;
