import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { dailyResultsTable, playerStreaksTable } from "@workspace/db";
import { eq, count, countDistinct, gte } from "drizzle-orm";
import { getTodayDateString } from "../lib/puzzle";

const router: IRouter = Router();

// GET /stats — public aggregate stats for the landing page
router.get("/stats", async (_req, res): Promise<void> => {
  const today = getTodayDateString();

  const [totalRow, todayRow, leadersRow] = await Promise.all([
    // Total puzzles completed (won) across all time
    db
      .select({ count: count() })
      .from(dailyResultsTable)
      .where(eq(dailyResultsTable.won, true)),

    // Distinct players who played today
    db
      .select({ count: countDistinct(dailyResultsTable.playerId) })
      .from(dailyResultsTable)
      .where(eq(dailyResultsTable.puzzleDate, today)),

    // Players with an active streak ≥ 2 (streak leaders)
    db
      .select({ count: count() })
      .from(playerStreaksTable)
      .where(gte(playerStreaksTable.currentStreak, 2)),
  ]);

  res.json({
    totalCompletions: totalRow[0]?.count ?? 0,
    playersToday: todayRow[0]?.count ?? 0,
    streakLeaders: leadersRow[0]?.count ?? 0,
  });
});

export default router;
