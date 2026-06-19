import { logger } from "./logger";
import {
  fetchChartTracks,
  fetchLyrics,
  fetchLyricslens,
  fetchRichsync,
  fetchSnippet,
  fetchTranslations,
  normalizeName,
  normalizeTitle,
  pickTranslationLanguage,
  type MxmTrack,
} from "./musixmatch";

// ─── Puzzle epoch ─────────────────────────────────────────────────────────────
// Day 1 of Lyricle = 2026-01-01 UTC
const EPOCH_DATE = new Date("2026-01-01T00:00:00Z");

export function getTodayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function getPuzzleNumber(dateStr?: string): number {
  const d = dateStr ? new Date(`${dateStr}T00:00:00Z`) : new Date();
  const today = new Date(d.toISOString().slice(0, 10) + "T00:00:00Z");
  const diff = today.getTime() - EPOCH_DATE.getTime();
  return Math.max(1, Math.floor(diff / (24 * 60 * 60 * 1000)) + 1);
}

export function getNextPuzzleAt(): string {
  const now = new Date();
  const tomorrow = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1),
  );
  return tomorrow.toISOString();
}

// ─── In-memory cache ──────────────────────────────────────────────────────────

interface PuzzleCache {
  date: string;
  puzzleNumber: number;
  track: MxmTrack;
  clues: Partial<Record<number, ClueData>>;
}

export type ClueData = {
  stage: number;
  stageLabel: string;
  // Stage 0
  themes?: string[] | null;
  mood?: string | null;
  // Stage 1
  translatedLine?: string | null;
  translationLanguage?: string | null;
  translationLanguageCode?: string | null;
  // Stage 2
  snippet?: string | null;
  // Stage 3
  richsyncWords?: Array<{ word: string; startMs: number; endMs: number }> | null;
  richsyncDurationMs?: number | null;
  // Stage 4
  previewUrl?: string | null;
  albumArtUrl?: string | null;
  spotifyTrackId?: string | null;
};

const STAGE_LABELS = [
  "Vibes & Themes",
  "Lost in Translation",
  "Lyric Snippet",
  "Word by Word",
  "Audio Preview",
];

let cache: PuzzleCache | null = null;

async function loadTodayTrack(): Promise<MxmTrack | null> {
  try {
    const tracks = await fetchChartTracks(100);
    if (!tracks.length) {
      logger.error("Musixmatch chart returned 0 tracks");
      return null;
    }
    const pn = getPuzzleNumber();
    const idx = (pn - 1) % tracks.length;
    const track = tracks[idx];
    logger.info({ trackId: track.track_id, title: track.track_name, artist: track.artist_name }, "Today's puzzle track selected");
    return track;
  } catch (err) {
    logger.error({ err }, "Failed to load today's track from chart");
    return null;
  }
}

export async function getPuzzleCache(): Promise<PuzzleCache | null> {
  const today = getTodayDateString();
  if (cache && cache.date === today) return cache;

  const track = await loadTodayTrack();
  if (!track) return null;

  cache = {
    date: today,
    puzzleNumber: getPuzzleNumber(),
    track,
    clues: {},
  };
  return cache;
}

// ─── Clue builders ────────────────────────────────────────────────────────────

async function buildClue0(puzzle: PuzzleCache): Promise<ClueData> {
  const { track } = puzzle;
  let themes: string[] | null = null;
  let mood: string | null = null;

  try {
    const lens = await fetchLyricslens(track.track_id);
    if (lens) {
      themes = lens.theme_clusters?.slice(0, 4).map((t) => t.label) ?? null;
      mood = lens.mood_clusters?.[0]?.label ?? null;
    }
  } catch {}

  // Fallback: derive from lyrics keywords if lyricslens unavailable
  if (!themes) {
    try {
      const lyrics = await fetchLyrics(track.track_id);
      if (lyrics?.lyrics_body) {
        const words = lyrics.lyrics_body
          .split(/\s+/)
          .filter((w) => w.length > 4)
          .slice(0, 3);
        themes = words.length ? words : ["mystery", "feeling", "rhythm"];
      }
    } catch {}
  }

  return {
    stage: 0,
    stageLabel: STAGE_LABELS[0],
    themes: themes ?? ["mystery", "longing", "night"],
    mood: mood ?? "Emotional",
  };
}

async function buildClue1(puzzle: PuzzleCache): Promise<ClueData> {
  const { track, puzzleNumber } = puzzle;
  const lang = pickTranslationLanguage(puzzleNumber);
  let translatedLine: string | null = null;

  try {
    const translations = await fetchTranslations(track.track_id);
    const match = translations.find((t) => t.language === lang.code);
    if (match?.description) {
      translatedLine = match.description;
    }
  } catch {}

  // Fallback: use snippet line if translation unavailable
  if (!translatedLine) {
    try {
      const snippet = await fetchSnippet(track.track_id);
      if (snippet?.snippet_body) {
        translatedLine = snippet.snippet_body;
      }
    } catch {}
  }

  return {
    stage: 1,
    stageLabel: STAGE_LABELS[1],
    translatedLine,
    translationLanguage: translatedLine ? lang.name : null,
    translationLanguageCode: translatedLine ? lang.code : null,
  };
}

async function buildClue2(puzzle: PuzzleCache): Promise<ClueData> {
  const { track } = puzzle;
  let snippet: string | null = null;

  try {
    const data = await fetchSnippet(track.track_id);
    if (data?.snippet_body) snippet = data.snippet_body;
  } catch {}

  if (!snippet) {
    try {
      const lyrics = await fetchLyrics(track.track_id);
      if (lyrics?.lyrics_body) {
        const lines = lyrics.lyrics_body.split("\n").filter((l) => l.trim().length > 0);
        snippet = lines[1] ?? lines[0] ?? null;
      }
    } catch {}
  }

  return {
    stage: 2,
    stageLabel: STAGE_LABELS[2],
    snippet,
  };
}

async function buildClue3(puzzle: PuzzleCache): Promise<ClueData> {
  const { track } = puzzle;
  let richsyncWords: ClueData["richsyncWords"] = null;
  let richsyncDurationMs: number | null = null;

  try {
    const lines = await fetchRichsync(track.track_id);
    if (lines && lines.length > 0) {
      // Pick the most lyric-dense line (pick from middle of song)
      const midIdx = Math.floor(lines.length * 0.4);
      const line = lines[midIdx];
      if (line?.l?.length > 0) {
        const durationMs = Math.round((line.te - line.ts) * 1000);
        richsyncWords = line.l.map((w) => ({
          word: w.c,
          startMs: Math.round((line.ts + w.o) * 1000),
          endMs: Math.round((line.ts + w.o) * 1000) + Math.max(300, Math.round(durationMs / line.l.length)),
        }));
        richsyncDurationMs = durationMs;
      }
    }
  } catch {}

  return {
    stage: 3,
    stageLabel: STAGE_LABELS[3],
    richsyncWords,
    richsyncDurationMs,
  };
}

async function buildClue4(puzzle: PuzzleCache): Promise<ClueData> {
  const { track } = puzzle;
  return {
    stage: 4,
    stageLabel: STAGE_LABELS[4],
    previewUrl: null,                   // Spotify preview — MXM doesn't directly provide
    albumArtUrl: track.album_coverart_800x800 || track.album_coverart_100x100 || null,
    spotifyTrackId: track.track_spotify_id || null,
  };
}

export async function getClue(stage: number): Promise<ClueData | null> {
  const puzzle = await getPuzzleCache();
  if (!puzzle) return null;

  // Return cached clue if available
  if (puzzle.clues[stage]) return puzzle.clues[stage]!;

  let clue: ClueData;
  switch (stage) {
    case 0: clue = await buildClue0(puzzle); break;
    case 1: clue = await buildClue1(puzzle); break;
    case 2: clue = await buildClue2(puzzle); break;
    case 3: clue = await buildClue3(puzzle); break;
    case 4: clue = await buildClue4(puzzle); break;
    default: return null;
  }

  puzzle.clues[stage] = clue;
  return clue;
}

// ─── Guess checking ───────────────────────────────────────────────────────────

export async function checkGuess(
  artist: string,
  title: string,
): Promise<{ correct: boolean; normalizedGuess: string; hint: string | null }> {
  const puzzle = await getPuzzleCache();
  if (!puzzle) {
    return { correct: false, normalizedGuess: `${artist} — ${title}`, hint: null };
  }

  const { track } = puzzle;
  const normalizedGuess = `${normalizeName(artist)} — ${normalizeTitle(title)}`;
  const normalizedAnswer = `${normalizeName(track.artist_name)} — ${normalizeTitle(track.track_name)}`;

  const titleMatch = normalizeTitle(title) === normalizeTitle(track.track_name);
  const artistMatch = normalizeName(artist) === normalizeName(track.artist_name);
  const correct = titleMatch && artistMatch;

  let hint: string | null = null;
  if (!correct) {
    if (titleMatch && !artistMatch) hint = "Right song, wrong artist!";
    else if (!titleMatch && artistMatch) hint = "Right artist, wrong song!";
  }

  return { correct, normalizedGuess, hint };
}

export async function getSongReveal(): Promise<{
  title: string;
  artist: string;
  albumArtUrl: string | null;
  spotifyTrackId: string | null;
  previewUrl: string | null;
  meaning: string | null;
  releaseYear: number | null;
} | null> {
  const puzzle = await getPuzzleCache();
  if (!puzzle) return null;

  const { track } = puzzle;
  const releaseYear = track.first_release_date
    ? parseInt(track.first_release_date.slice(0, 4), 10)
    : null;

  return {
    title: track.track_name,
    artist: track.artist_name,
    albumArtUrl: track.album_coverart_800x800 || track.album_coverart_100x100 || null,
    spotifyTrackId: track.track_spotify_id || null,
    previewUrl: null,
    meaning: null,
    releaseYear: isNaN(releaseYear!) ? null : releaseYear,
  };
}
