import { Router, type IRouter, type Request } from "express";
import { getAuth } from "@clerk/express";
import { db } from "@workspace/db";
import { customPuzzlesTable, userStatsTable, puzzlePlaysTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { searchTracks, fetchLyrics } from "../lib/musixmatch";
import { lookupItunesTrack } from "../lib/itunes";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const FREE_PLAYS_PER_DAY = 3;
const UNLOCK_COST_POINTS = 50;

// ─── Shared helpers ───────────────────────────────────────────────────────────

/** Return user stats, resetting playsToday if more than 24 h have passed. */
async function getOrResetUserStats(userId: string) {
  const rows = await db
    .select()
    .from(userStatsTable)
    .where(eq(userStatsTable.userId, userId))
    .limit(1);

  if (rows.length === 0) return null;

  const stats = rows[0];
  const msPerDay = 24 * 60 * 60 * 1000;
  const resetAt = stats.playsResetAt ? new Date(stats.playsResetAt).getTime() : 0;

  if (Date.now() - resetAt >= msPerDay) {
    await db
      .update(userStatsTable)
      .set({ playsToday: 0, playsResetAt: new Date() })
      .where(eq(userStatsTable.userId, userId));
    return { ...stats, playsToday: 0 };
  }

  return stats;
}

/** Normalise a string for fuzzy answer matching. */
function norm(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*[\(\[].+?[\)\]]\s*/g, "")
    .replace(/\bfeat\.?\s+.+/i, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function guessIsCorrect(guess: string, trackName: string, artistName: string): boolean {
  const g = norm(guess);
  if (g.length < 2) return false;
  const t = norm(trackName);
  const a = norm(artistName);
  return (
    t === g ||
    a === g ||
    (g.length >= 3 && t.startsWith(g)) ||
    (g.length >= 3 && a.startsWith(g)) ||
    (g.length >= 4 && t.includes(g)) ||
    (g.length >= 4 && a.includes(g))
  );
}

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /search?q=<query>
router.get("/search", async (req, res): Promise<void> => {
  const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (q.length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  try {
    const tracks = await searchTracks(q, 10);
    res.json({
      tracks: tracks.map((t) => ({
        trackId: t.track_id,
        title: t.track_name,
        artist: t.artist_name,
        albumArt: t.album_coverart_100x100 || t.album_coverart_800x800 || null,
      })),
    });
  } catch (err) {
    logger.error({ err }, "MXM search error");
    res.status(502).json({ error: "Search unavailable" });
  }
});

// GET /lyrics/:trackId
router.get("/lyrics/:trackId", async (req, res): Promise<void> => {
  const trackId = parseInt(req.params.trackId, 10);
  if (isNaN(trackId)) {
    res.status(400).json({ error: "Invalid track ID" });
    return;
  }

  try {
    const lyrics = await fetchLyrics(trackId);
    if (!lyrics || !lyrics.lyrics_body) {
      res.status(404).json({ error: "Lyrics not found for this track" });
      return;
    }

    const lines = lyrics.lyrics_body
      .split("\n")
      .map((l) => l.trim())
      .filter(
        (l) =>
          l.length > 0 &&
          !l.startsWith("*") &&
          !l.toLowerCase().includes("lyrics is not for commercial"),
      );

    res.json({ lines });
  } catch (err) {
    logger.error({ err, trackId }, "Lyrics fetch error");
    res.status(502).json({ error: "Lyrics unavailable" });
  }
});

// POST /puzzles
router.post("/puzzles", async (req: Request, res): Promise<void> => {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "You must be signed in to create a puzzle" });
    return;
  }

  const { trackId, trackName, artistName, albumArt, personalClue, maskedLyricIndex } = req.body as {
    trackId: string | number;
    trackName: string;
    artistName: string;
    albumArt?: string | null;
    personalClue: string;
    maskedLyricIndex: number;
  };

  if (!trackId || !trackName || !artistName || !personalClue || maskedLyricIndex == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (typeof personalClue !== "string" || personalClue.trim().length < 10) {
    res.status(400).json({ error: "Personal clue must be at least 10 characters" });
    return;
  }
  if (typeof maskedLyricIndex !== "number" || maskedLyricIndex < 0) {
    res.status(400).json({ error: "Invalid masked lyric index" });
    return;
  }

  try {
    const [puzzle] = await db
      .insert(customPuzzlesTable)
      .values({
        trackId: String(trackId),
        trackName: String(trackName),
        artistName: String(artistName),
        albumArt: albumArt || null,
        personalClue: personalClue.trim(),
        maskedLyricIndex: Number(maskedLyricIndex),
        creatorId: userId,
      })
      .returning();

    await db
      .insert(userStatsTable)
      .values({ userId, points: 10, puzzlesCreated: 1, puzzlesPlayed: 0, puzzlesWon: 0, playsToday: 0 })
      .onConflictDoUpdate({
        target: userStatsTable.userId,
        set: {
          points: sql`${userStatsTable.points} + 10`,
          puzzlesCreated: sql`${userStatsTable.puzzlesCreated} + 1`,
        },
      });

    res.status(201).json({ puzzleId: puzzle.id });
  } catch (err) {
    logger.error({ err, userId }, "Puzzle creation error");
    res.status(500).json({ error: "Failed to create puzzle" });
  }
});

// GET /puzzles/:id
// Returns puzzle metadata for the player — answer fields (trackName, artistName) are OMITTED.
// Unauthenticated callers always receive playsRemaining: 0 so the play gate shows correctly.
router.get("/puzzles/:id", async (req: Request, res): Promise<void> => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  try {
    const rows = await db
      .select()
      .from(customPuzzlesTable)
      .where(eq(customPuzzlesTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }

    const puzzle = rows[0];

    // Unauthenticated users get playsRemaining: 0 — they must sign in to play.
    let playsRemaining = 0;
    let userPoints = 0;

    if (userId) {
      const stats = await getOrResetUserStats(userId);
      if (stats) {
        playsRemaining = Math.max(0, FREE_PLAYS_PER_DAY - stats.playsToday);
        userPoints = stats.points;
      } else {
        // No stats row yet — first time player, full plays available.
        playsRemaining = FREE_PLAYS_PER_DAY;
      }
    }

    // NOTE: trackName and artistName are intentionally excluded to prevent answer leakage.
    res.json({
      id: puzzle.id,
      trackId: puzzle.trackId,
      albumArt: puzzle.albumArt,
      personalClue: puzzle.personalClue,
      maskedLyricIndex: puzzle.maskedLyricIndex,
      playCount: puzzle.playCount,
      createdAt: puzzle.createdAt,
      playsRemaining,
      userPoints,
      requiresAuth: !userId,
    });
  } catch (err) {
    logger.error({ err, id }, "Puzzle fetch error");
    res.status(500).json({ error: "Failed to fetch puzzle" });
  }
});

// GET /puzzles/:id/media
// Returns lyrics + iTunes audio URL + enhanced album art for progressive reveal stages.
router.get("/puzzles/:id/media", async (req: Request, res): Promise<void> => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Sign in to play this puzzle" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(customPuzzlesTable)
      .where(eq(customPuzzlesTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }

    const puzzle = rows[0];

    const [lyricsData, itunesTrack] = await Promise.all([
      fetchLyrics(parseInt(puzzle.trackId, 10)).catch(() => null),
      lookupItunesTrack(puzzle.artistName, puzzle.trackName).catch(() => null),
    ]);

    const lines: string[] = lyricsData?.lyrics_body
      ? lyricsData.lyrics_body
          .split("\n")
          .map((l) => l.trim())
          .filter(
            (l) =>
              l.length > 0 &&
              !l.startsWith("*") &&
              !l.toLowerCase().includes("lyrics is not for commercial"),
          )
      : [];

    res.json({
      lyrics: lines,
      audioPreviewUrl: itunesTrack?.previewUrl ?? null,
      albumArt: itunesTrack?.artworkUrl600 ?? puzzle.albumArt ?? null,
    });
  } catch (err) {
    logger.error({ err, id }, "Media fetch error");
    res.status(502).json({ error: "Media unavailable" });
  }
});

// POST /puzzles/:id/guess
// Validates a single guess server-side without exposing the answer.
// Returns { correct, isGameOver, finalReveal? } — finalReveal only included when game ends.
router.post("/puzzles/:id/guess", async (req: Request, res): Promise<void> => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Sign in to play this puzzle" });
    return;
  }

  const { artist, title, guessNumber } = req.body as {
    artist: string;
    title: string;
    guessNumber: number; // 1-indexed; game ends when guessNumber >= MAX_GUESSES and not correct
  };

  if (!artist || !title || typeof guessNumber !== "number") {
    res.status(400).json({ error: "Missing required fields: artist, title, guessNumber" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(customPuzzlesTable)
      .where(eq(customPuzzlesTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }

    const puzzle = rows[0];
    const MAX_GUESSES = 4;

    const correct =
      guessIsCorrect(artist, puzzle.trackName, puzzle.artistName) ||
      guessIsCorrect(title, puzzle.trackName, puzzle.artistName);

    const isGameOver = correct || guessNumber >= MAX_GUESSES;

    res.json({
      correct,
      isGameOver,
      // Only reveal the answer when the game is definitively over.
      ...(isGameOver
        ? { finalReveal: { trackName: puzzle.trackName, artistName: puzzle.artistName, albumArt: puzzle.albumArt } }
        : {}),
    });
  } catch (err) {
    logger.error({ err, id }, "Guess validation error");
    res.status(500).json({ error: "Failed to validate guess" });
  }
});

// POST /puzzles/:id/unlock
// Spends 50 points to grant one extra play by decrementing playsToday.
// Does NOT record a play or update puzzle stats — that happens via /play after the game completes.
router.post("/puzzles/:id/unlock", async (req: Request, res): Promise<void> => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Sign in to unlock a play" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(customPuzzlesTable)
      .where(eq(customPuzzlesTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }

    // Ensure stats row exists.
    await db
      .insert(userStatsTable)
      .values({ userId, points: 0, puzzlesCreated: 0, puzzlesPlayed: 0, puzzlesWon: 0, playsToday: 0 })
      .onConflictDoNothing();

    const stats = await getOrResetUserStats(userId);
    const currentPoints = stats?.points ?? 0;

    if (currentPoints < UNLOCK_COST_POINTS) {
      res.status(402).json({ error: "Not enough points to unlock a play", userPoints: currentPoints });
      return;
    }

    // Deduct points and decrement playsToday to grant one more play slot.
    await db
      .update(userStatsTable)
      .set({
        points: sql`${userStatsTable.points} - ${UNLOCK_COST_POINTS}`,
        playsToday: sql`GREATEST(0, ${userStatsTable.playsToday} - 1)`,
      })
      .where(eq(userStatsTable.userId, userId));

    res.json({
      ok: true,
      playsRemaining: 1,
      userPoints: currentPoints - UNLOCK_COST_POINTS,
    });
  } catch (err) {
    logger.error({ err, id }, "Unlock error");
    res.status(500).json({ error: "Failed to unlock play" });
  }
});

// POST /puzzles/:id/play
// Records a completed game (win or loss) and awards points.
// Requires authentication — unauthenticated plays cannot be tracked.
router.post("/puzzles/:id/play", async (req: Request, res): Promise<void> => {
  const { id } = req.params;
  const { userId } = getAuth(req);

  if (!userId) {
    res.status(401).json({ error: "Sign in to record your play" });
    return;
  }

  const { won, stagesUsed } = req.body as { won: boolean; stagesUsed: number };

  if (typeof won !== "boolean" || typeof stagesUsed !== "number") {
    res.status(400).json({ error: "Missing required fields: won, stagesUsed" });
    return;
  }

  try {
    const rows = await db
      .select()
      .from(customPuzzlesTable)
      .where(eq(customPuzzlesTable.id, id))
      .limit(1);

    if (rows.length === 0) {
      res.status(404).json({ error: "Puzzle not found" });
      return;
    }

    const puzzle = rows[0];

    // Ensure stats row exists.
    await db
      .insert(userStatsTable)
      .values({ userId, points: 0, puzzlesCreated: 0, puzzlesPlayed: 0, puzzlesWon: 0, playsToday: 0 })
      .onConflictDoNothing();

    const stats = await getOrResetUserStats(userId);
    const currentPlays = stats?.playsToday ?? 0;

    if (currentPlays >= FREE_PLAYS_PER_DAY) {
      res.status(429).json({
        error: "Daily play limit reached — use /unlock to spend points for an extra play",
        playsRemaining: 0,
        userPoints: stats?.points ?? 0,
        unlockCost: UNLOCK_COST_POINTS,
      });
      return;
    }

    // Points earned for the player: +20 for win, +5 per stage survived.
    const pointsEarned = (won ? 20 : 0) + 5 * Math.max(0, stagesUsed - 1);

    await db
      .update(userStatsTable)
      .set({
        puzzlesPlayed: sql`${userStatsTable.puzzlesPlayed} + 1`,
        puzzlesWon: sql`${userStatsTable.puzzlesWon} + ${won ? 1 : 0}`,
        playsToday: sql`${userStatsTable.playsToday} + 1`,
        points: sql`${userStatsTable.points} + ${pointsEarned}`,
      })
      .where(eq(userStatsTable.userId, userId));

    // Creator earns +2 per play (skip if creator plays their own puzzle).
    if (puzzle.creatorId !== userId) {
      await db
        .insert(userStatsTable)
        .values({ userId: puzzle.creatorId, points: 2, puzzlesCreated: 0, puzzlesPlayed: 0, puzzlesWon: 0, playsToday: 0 })
        .onConflictDoUpdate({
          target: userStatsTable.userId,
          set: { points: sql`${userStatsTable.points} + 2` },
        });
    }

    // Record individual play row.
    await db.insert(puzzlePlaysTable).values({ puzzleId: id, playerId: userId, won, stagesUsed });

    // Increment puzzle play count.
    await db
      .update(customPuzzlesTable)
      .set({ playCount: sql`${customPuzzlesTable.playCount} + 1` })
      .where(eq(customPuzzlesTable.id, id));

    res.json({ ok: true, pointsEarned });
  } catch (err) {
    logger.error({ err, id }, "Play recording error");
    res.status(500).json({ error: "Failed to record play" });
  }
});

export default router;
