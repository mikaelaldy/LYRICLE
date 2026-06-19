import { logger } from "./logger";

const MXM_BASE = "https://api.musixmatch.com/ws/1.1";
const MXM_KEY = process.env.MXM_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MxmTrack {
  track_id: number;
  track_name: string;
  artist_name: string;
  album_name: string;
  album_coverart_100x100: string;
  album_coverart_800x800: string;
  track_spotify_id: string;
  has_lyrics: number;
  has_richsync: number;
  first_release_date: string;
}

export interface MxmLyrics {
  lyrics_body: string;
  lyrics_copyright: string;
}

export interface MxmSnippet {
  snippet_body: string;
}

export interface MxmRichsyncLine {
  ts: number;
  te: number;
  l: Array<{ c: string; o: number }>;
}

export interface MxmTranslation {
  description: string;
  language: string;
}

export interface MxmLyricslens {
  mood_clusters: Array<{ label: string; value: number }>;
  theme_clusters: Array<{ label: string; value: number }>;
  language_detection: { language: string };
}

// ─── HTTP helper ─────────────────────────────────────────────────────────────

async function mxmGet<T>(path: string, params: Record<string, string | number> = {}): Promise<T | null> {
  if (!MXM_KEY) {
    logger.warn("MXM_KEY not set — Musixmatch calls will fail");
    return null;
  }

  const url = new URL(`${MXM_BASE}/${path}`);
  url.searchParams.set("apikey", MXM_KEY);
  url.searchParams.set("format", "json");
  for (const [k, v] of Object.entries(params)) {
    url.searchParams.set(k, String(v));
  }

  try {
    const res = await fetch(url.toString());
    if (!res.ok) {
      logger.warn({ path, status: res.status }, "MXM HTTP error");
      return null;
    }
    const json = (await res.json()) as { message: { header: { status_code: number }; body: T } };
    if (json.message.header.status_code !== 200) {
      logger.warn({ path, mxmStatus: json.message.header.status_code }, "MXM API non-200");
      return null;
    }
    return json.message.body;
  } catch (err) {
    logger.error({ path, err }, "MXM fetch error");
    return null;
  }
}

// ─── Public functions ─────────────────────────────────────────────────────────

export async function fetchChartTracks(pageSize = 100): Promise<MxmTrack[]> {
  const body = await mxmGet<{ track_list: Array<{ track: MxmTrack }> }>(
    "chart.tracks.get",
    { chart_name: "top", page: 1, page_size: pageSize, country: "us", f_has_lyrics: 1 },
  );
  return body?.track_list?.map((t) => t.track) ?? [];
}

export async function searchTracks(q: string, pageSize = 8): Promise<MxmTrack[]> {
  const body = await mxmGet<{ track_list: Array<{ track: MxmTrack }> }>(
    "track.search",
    { q, page_size: pageSize, s_track_rating: "desc", f_has_lyrics: 1 },
  );
  return body?.track_list?.map((t) => t.track) ?? [];
}

export async function fetchLyrics(trackId: number): Promise<MxmLyrics | null> {
  const body = await mxmGet<{ lyrics: MxmLyrics }>("track.lyrics.get", { track_id: trackId });
  return body?.lyrics ?? null;
}

export async function fetchSnippet(trackId: number): Promise<MxmSnippet | null> {
  const body = await mxmGet<{ snippet: MxmSnippet }>("track.snippet.get", { track_id: trackId });
  return body?.snippet ?? null;
}

export async function fetchRichsync(trackId: number): Promise<MxmRichsyncLine[] | null> {
  const body = await mxmGet<{ richsync: { richsync_body: string } }>(
    "track.richsync.get",
    { track_id: trackId },
  );
  if (!body?.richsync?.richsync_body) return null;
  try {
    return JSON.parse(body.richsync.richsync_body) as MxmRichsyncLine[];
  } catch {
    return null;
  }
}

export async function fetchTranslations(trackId: number): Promise<MxmTranslation[]> {
  // Musixmatch Pro — returns translations; graceful fallback if unavailable
  const body = await mxmGet<{ translations_list: Array<{ translation: MxmTranslation }> }>(
    "crowd.track.translations.get",
    { track_id: trackId, selected_language: "es", comment_format: "text" },
  );
  return body?.translations_list?.map((t) => t.translation) ?? [];
}

export async function fetchLyricslens(trackId: number): Promise<MxmLyricslens | null> {
  // Musixmatch Pro — lyricslens feature; graceful fallback if unavailable
  const body = await mxmGet<{ lyrics: { lyrics_body: string } }>(
    "track.lyrics.get",
    { track_id: trackId },
  );
  // lyricslens proper endpoint; fallback to lyrics body if unavailable
  if (!body) return null;

  // Try the lyricslens endpoint
  const lensBody = await mxmGet<MxmLyricslens>(
    "track.lyrics.mood.get",
    { track_id: trackId },
  );
  return lensBody ?? null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function normalizeTitle(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s*[\(\[].+?[\)\]]\s*/g, "")  // remove parens/brackets
    .replace(/\bfeat\.?\s+.+/i, "")           // remove feat.
    .replace(/[^\w\s]/g, "")
    .trim();
}

export function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^\w\s]/g, "").trim();
}

/** Pick a target language for translation based on puzzle number */
export function pickTranslationLanguage(puzzleNumber: number): { code: string; name: string } {
  const langs = [
    { code: "es", name: "Spanish" },
    { code: "fr", name: "French" },
    { code: "de", name: "German" },
    { code: "pt", name: "Portuguese" },
    { code: "it", name: "Italian" },
    { code: "ja", name: "Japanese" },
    { code: "ko", name: "Korean" },
    { code: "nl", name: "Dutch" },
    { code: "sv", name: "Swedish" },
    { code: "pl", name: "Polish" },
  ];
  return langs[puzzleNumber % langs.length];
}
