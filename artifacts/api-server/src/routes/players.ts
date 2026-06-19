import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { dailyResultsTable, playerStreaksTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import { GetPlayerStreakParams } from "@workspace/api-zod";

const router: IRouter = Router();

// GET /players/:playerId/streak
router.get("/players/:playerId/streak", async (req, res): Promise<void> => {
  const params = GetPlayerStreakParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const rows = await db
    .select()
    .from(playerStreaksTable)
    .where(eq(playerStreaksTable.playerId, params.data.playerId))
    .limit(1);

  if (rows.length === 0) {
    res.status(404).json({ error: "Player not found" });
    return;
  }

  const row = rows[0];
  res.json({
    playerId: row.playerId,
    currentStreak: row.currentStreak,
    maxStreak: row.maxStreak,
    lastPlayedDate: row.lastPlayedDate ?? null,
    totalPlays: row.totalPlays,
    winCount: row.winCount,
  });
});

// GET /players/me/stats — requires Clerk auth
router.get("/players/me/stats", async (req, res): Promise<void> => {
  // @ts-expect-error Clerk types attached by middleware
  const auth = req.auth as { userId?: string } | undefined;
  if (!auth?.userId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const clerkUserId = auth.userId;

  // Aggregate all plays for this Clerk user
  const results = await db
    .select()
    .from(dailyResultsTable)
    .where(eq(dailyResultsTable.clerkUserId, clerkUserId));

  const totalPlays = results.length;
  const winCount = results.filter((r) => r.won).length;
  const winRate = totalPlays > 0 ? winCount / totalPlays : 0;

  // Streak from player_streaks (use clerkUserId as playerId for logged-in users)
  const streakRows = await db
    .select()
    .from(playerStreaksTable)
    .where(eq(playerStreaksTable.playerId, clerkUserId))
    .limit(1);

  const streak = streakRows[0] ?? null;

  // Clue distribution
  const distMap = new Map<string, number>();
  for (const r of results) {
    const key = `${r.cluesUsed}:${r.won}`;
    distMap.set(key, (distMap.get(key) ?? 0) + 1);
  }
  const clueDistribution = Array.from(distMap.entries()).map(([k, count]) => {
    const [cluesStr, wonStr] = k.split(":");
    return { cluesUsed: parseInt(cluesStr, 10), won: wonStr === "true", count };
  });

  res.json({
    clerkUserId,
    displayName: null,
    totalPlays,
    winCount,
    winRate,
    currentStreak: streak?.currentStreak ?? 0,
    maxStreak: streak?.maxStreak ?? 0,
    lastPlayedDate: streak?.lastPlayedDate ?? null,
    clueDistribution,
  });
});

// GET /players/leaderboard — weekly streak leaderboard, top 20
router.get("/players/leaderboard", async (_req, res): Promise<void> => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().slice(0, 10);

  const rows = await db
    .select({
      playerId: playerStreaksTable.playerId,
      currentStreak: playerStreaksTable.currentStreak,
      winCount: playerStreaksTable.winCount,
      maxStreak: playerStreaksTable.maxStreak,
      totalPlays: playerStreaksTable.totalPlays,
      displayName: sql<string>`(
        SELECT display_name FROM daily_results
        WHERE player_id = ${playerStreaksTable.playerId}
        ORDER BY created_at DESC
        LIMIT 1
      )`,
    })
    .from(playerStreaksTable)
    .where(sql`${playerStreaksTable.lastPlayedDate} >= ${weekAgoStr}`)
    .orderBy(desc(playerStreaksTable.currentStreak), desc(playerStreaksTable.winCount))
    .limit(20);

  const leaderboard = rows.map((r, i) => ({
    rank: i + 1,
    displayName: r.displayName ?? "Anonymous",
    currentStreak: r.currentStreak,
    winCount: r.winCount,
    maxStreak: r.maxStreak,
    totalPlays: r.totalPlays,
  }));

  res.json(leaderboard);
});

export default router;
