import { Router, type Request } from "express";
import { getAuth } from "@clerk/express";
import { db, duelsTable, userStatsTable, userQuestsTable } from "@workspace/db";
import { eq, and, isNull, sql } from "drizzle-orm";

const router = Router();

const MAX_WAGER = 10_000;
const MAX_CLUES = 5;
const MAX_SOLVE_MS = 1_800_000; // 30 minutes

router.post("/duels", async (req, res): Promise<void> => {
  const auth = getAuth(req as Request);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { puzzleType, puzzleRef, wager, cluesUsed, solveTimeMs, won, displayName } = req.body;

  // Validate inputs strictly
  const parsedWager = Number(wager);
  const parsedClues = Number(cluesUsed);
  const parsedTime = Number(solveTimeMs);

  if (
    !Number.isInteger(parsedWager) || parsedWager < 0 || parsedWager > MAX_WAGER ||
    !Number.isInteger(parsedClues) || parsedClues < 1 || parsedClues > MAX_CLUES ||
    !Number.isFinite(parsedTime) || parsedTime < 0 || parsedTime > MAX_SOLVE_MS ||
    typeof won !== "boolean" ||
    !puzzleType || !puzzleRef
  ) {
    res.status(400).json({ error: "Invalid request parameters" });
    return;
  }

  // Validate points balance
  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, auth.userId)).limit(1);
  if (!stats || stats.points < parsedWager) {
    res.status(400).json({ error: "Insufficient points balance for wager" });
    return;
  }

  // Deduct points
  await db.update(userStatsTable).set({ points: stats.points - parsedWager }).where(eq(userStatsTable.userId, auth.userId));

  // Insert Duel record
  const [duel] = await db.insert(duelsTable).values({
    creatorId: auth.userId,
    creatorName: String(displayName || "Anonymous").slice(0, 50),
    puzzleType,
    puzzleRef,
    wager: parsedWager,
    creatorCluesUsed: parsedClues,
    creatorSolveTimeMs: parsedTime,
    creatorWon: won,
    status: "pending",
  }).returning();

  res.json({ duel });
});

router.get("/duels/public", async (req, res): Promise<void> => {
  const openDuels = await db.select().from(duelsTable).where(
    and(eq(duelsTable.status, "pending"), isNull(duelsTable.opponentId))
  );
  res.json({ duels: openDuels });
});

router.get("/duels/:id", async (req, res): Promise<void> => {
  const { id } = req.params;
  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel) {
    res.status(404).json({ error: "Duel not found" });
    return;
  }
  res.json({ duel });
});

router.post("/duels/:id/accept", async (req, res): Promise<void> => {
  const auth = getAuth(req as Request);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;
  const { displayName } = req.body;

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel || duel.status !== "pending") {
    res.status(400).json({ error: "Duel unavailable" });
    return;
  }

  if (duel.creatorId === auth.userId) {
    res.status(400).json({ error: "Cannot accept your own duel" });
    return;
  }

  const [stats] = await db.select().from(userStatsTable).where(eq(userStatsTable.userId, auth.userId)).limit(1);
  if (!stats || stats.points < duel.wager) {
    res.status(400).json({ error: "Insufficient points" });
    return;
  }

  // Deduct wager
  await db.update(userStatsTable).set({ points: stats.points - duel.wager }).where(eq(userStatsTable.userId, auth.userId));

  // Accept duel
  await db.update(duelsTable).set({
    opponentId: auth.userId,
    opponentName: String(displayName || "Anonymous").slice(0, 50),
    status: "playing",
  }).where(eq(duelsTable.id, id));

  res.json({ success: true });
});

router.post("/duels/:id/submit", async (req, res): Promise<void> => {
  const auth = getAuth(req as Request);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;
  const { cluesUsed, solveTimeMs, won } = req.body;

  const parsedClues = Number(cluesUsed);
  const parsedTime = Number(solveTimeMs);

  if (
    !Number.isInteger(parsedClues) || parsedClues < 1 || parsedClues > MAX_CLUES ||
    !Number.isFinite(parsedTime) || parsedTime < 0 || parsedTime > MAX_SOLVE_MS ||
    typeof won !== "boolean"
  ) {
    res.status(400).json({ error: "Invalid request parameters" });
    return;
  }

  const [duel] = await db.select().from(duelsTable).where(eq(duelsTable.id, id)).limit(1);
  if (!duel || duel.status !== "playing") {
    res.status(400).json({ error: "Duel not in playing state" });
    return;
  }

  // Enforce that only the recorded opponent can submit
  if (duel.opponentId !== auth.userId) {
    res.status(403).json({ error: "You are not the opponent in this duel" });
    return;
  }

  let winnerId: string | null = null;

  if (won && !duel.creatorWon) {
    winnerId = auth.userId;
  } else if (!won && duel.creatorWon) {
    winnerId = duel.creatorId;
  } else if (won && duel.creatorWon) {
    if (parsedClues < duel.creatorCluesUsed) {
      winnerId = auth.userId;
    } else if (duel.creatorCluesUsed < parsedClues) {
      winnerId = duel.creatorId;
    } else {
      if (parsedTime < duel.creatorSolveTimeMs) {
        winnerId = auth.userId;
      } else if (duel.creatorSolveTimeMs < parsedTime) {
        winnerId = duel.creatorId;
      } else {
        winnerId = null;
      }
    }
  }

  // Update duel
  await db.update(duelsTable).set({
    opponentCluesUsed: parsedClues,
    opponentSolveTimeMs: parsedTime,
    opponentWon: won,
    winnerId,
    status: "completed",
    completedAt: new Date(),
  }).where(eq(duelsTable.id, id));

  // Payout wagers
  const pool = duel.wager * 2;
  if (winnerId) {
    await db.update(userStatsTable).set({
      points: sql`${userStatsTable.points} + ${pool}`
    }).where(eq(userStatsTable.userId, winnerId));
  } else {
    // Refund wagers on tie
    await db.update(userStatsTable).set({
      points: sql`${userStatsTable.points} + ${duel.wager}`
    }).where(eq(userStatsTable.userId, duel.creatorId));
    await db.update(userStatsTable).set({
      points: sql`${userStatsTable.points} + ${duel.wager}`
    }).where(eq(userStatsTable.userId, auth.userId));
  }

  // Increment "duelist" quest for the winner
  if (winnerId) {
    const todayStr = new Date().toISOString().split("T")[0];
    const [duelistQuest] = await db
      .select()
      .from(userQuestsTable)
      .where(
        and(
          eq(userQuestsTable.userId, winnerId),
          eq(userQuestsTable.date, todayStr),
          eq(userQuestsTable.questId, "duelist")
        )
      )
      .limit(1);

    if (duelistQuest && !duelistQuest.completed) {
      const newValue = Math.min(duelistQuest.targetValue, duelistQuest.currentValue + 1);
      await db
        .update(userQuestsTable)
        .set({
          currentValue: newValue,
          completed: newValue >= duelistQuest.targetValue,
        })
        .where(eq(userQuestsTable.id, duelistQuest.id));
    }
  }

  res.json({ success: true, winnerId });
});

export default router;
