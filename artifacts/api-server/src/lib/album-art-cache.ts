/**
 * Album art pre-cache for curated songs.
 *
 * At startup (and every 24 h) we fire parallel iTunes lookups for all 30
 * curated songs and store the results in memory.  Autocomplete can then serve
 * art with zero added latency instead of doing per-request network calls.
 */

import { CURATED_SONGS } from "./curated-puzzles";
import { lookupItunesTrack } from "./itunes";
import { logger } from "./logger";

const REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1000;

const artCache = new Map<number, string | null>();

let refreshTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Fetch iTunes art for every curated song, storing results in the in-memory
 * cache.  Errors per-song are caught and logged; they result in a null entry
 * so the cache always has an entry for every song after the first call.
 */
async function populateCache(): Promise<void> {
  const start = Date.now();
  const results = await Promise.allSettled(
    CURATED_SONGS.map(async (song) => {
      try {
        const hit = await lookupItunesTrack(song.artistName, song.trackName);
        artCache.set(song.id, hit?.artworkUrl600 ?? null);
      } catch (err) {
        artCache.set(song.id, null);
        logger.warn({ songId: song.id, err }, "album-art-cache: lookup failed");
      }
    }),
  );

  const failed = results.filter((r) => r.status === "rejected").length;
  logger.info(
    { total: CURATED_SONGS.length, failed, ms: Date.now() - start },
    "album-art-cache: populated",
  );
}

/**
 * Initialise the cache on server startup.  The first populate runs
 * immediately (non-blocking — callers don't need to await it); subsequent
 * refreshes run every 24 h.
 */
export function initAlbumArtCache(): void {
  populateCache().catch((err) =>
    logger.error({ err }, "album-art-cache: initial populate failed"),
  );

  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(() => {
    populateCache().catch((err) =>
      logger.error({ err }, "album-art-cache: periodic refresh failed"),
    );
  }, REFRESH_INTERVAL_MS);

  if (refreshTimer.unref) refreshTimer.unref();
}

/**
 * Return the cached album art URL for a curated song, or null if it wasn't
 * found / the cache hasn't been populated yet.
 */
export function getCachedAlbumArt(songId: number): string | null {
  return artCache.get(songId) ?? null;
}
