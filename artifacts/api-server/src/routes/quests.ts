import { Router, type Request } from "express";
import { getAuth } from "@clerk/express";
import { db, userQuestsTable, userStatsTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";

const router = Router();

const QUEST_POOL = [
  { questId: "concert_radar", label: "View upcoming tour dates", targetValue: 1, pointsReward: 25 },
  { questId: "stat_explorer", label: "Unlock the “By the Numbers” card", targetValue: 1, pointsReward: 25 },
  { questId: "tour_supporter", label: "Click a tour ticket link", targetValue: 1, pointsReward: 50 },
  { questId: "vibe_checker", label: "Guess song before Audio stage", targetValue: 1, pointsReward: 40 },
  { questId: "sonic_speed", label: "Solve daily puzzle in under 45s", targetValue: 1, pointsReward: 50 },
  { questId: "duelist", label: "Win 1 PvP Duel today", targetValue: 1, pointsReward: 50 },
];

router.get("/quests/daily", async (req, res): Promise<void> => {
  const auth = getAuth(req as Request);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const todayStr = new Date().toISOString().split("T")[0];
  const userQuests = await db.select().from(userQuestsTable).where(
    and(eq(userQuestsTable.userId, auth.userId), eq(userQuestsTable.date, todayStr))
  );

  if (userQuests.length > 0) {
    res.json({ quests: userQuests });
    return;
  }

  // Shuffle and pick 3 quests
  const shuffled = [...QUEST_POOL].sort(() => 0.5 - Math.random());
  const selected = shuffled.slice(0, 3);

  const inserted = await Promise.all(selected.map(async (q) => {
    const [row] = await db.insert(userQuestsTable).values({
      userId: auth.userId!,
      date: todayStr,
      questId: q.questId,
      label: q.label,
      targetValue: q.targetValue,
      pointsReward: q.pointsReward,
    }).returning();
    return row;
  }));

  res.json({ quests: inserted });
});

router.post("/quests/:id/claim", async (req, res): Promise<void> => {
  const auth = getAuth(req as Request);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  const [quest] = await db.select().from(userQuestsTable).where(
    and(eq(userQuestsTable.id, id), eq(userQuestsTable.userId, auth.userId))
  ).limit(1);

  if (!quest) {
    res.status(404).json({ error: "Quest not found" });
    return;
  }

  if (quest.claimed) {
    res.status(400).json({ error: "Quest already claimed" });
    return;
  }

  if (!quest.completed && quest.currentValue < quest.targetValue) {
    res.status(400).json({ error: "Quest not completed" });
    return;
  }

  // Mark claimed & update user points
  await db.update(userQuestsTable).set({ claimed: true, completed: true }).where(eq(userQuestsTable.id, id));
  await db.update(userStatsTable).set({
    points: sql`${userStatsTable.points} + ${quest.pointsReward}`
  }).where(eq(userStatsTable.userId, auth.userId));

  res.json({ success: true, claimedReward: quest.pointsReward });
});

export default router;
