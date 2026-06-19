# 🎵 Lyricle — Daily Lyric Battle

[![Live Demo](https://img.shields.io/badge/Live%20Demo-lyricle.replit.app-gold?style=flat-square&logo=replit)](https://lyricle.replit.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Musicathon 2026](https://img.shields.io/badge/Musicathon%202026-Submission-blueviolet?style=flat-square)](https://www.musixmatch.com/pro/api/musicathon)

> **Guess the song from five escalating lyric clues — one new puzzle for everyone, every day.**

---

## Hackathon Submission

**Musicathon 2026 · Musixmatch Pro API**

### One-Liner

> Lyricle is a daily Wordle-style music game where every player worldwide solves the same puzzle using five escalating clues powered exclusively by the Musixmatch Pro API — from Lyricslens mood clusters to word-by-word Richsync reveals.

### Full Description

Lyricle is a daily music game built entirely around Musixmatch's most distinctive Pro-only data. Each day a single mystery song — drawn from the Musixmatch top chart — is shared by every player on the planet. You get five clues, unlocked one at a time, and the fewer you need the higher your score.

The Musixmatch Pro API is not decoration here — it *is* the game. Stage 1 shows Lyricslens mood and theme clusters (`track.lyrics.mood.get`), a signal that exists nowhere else. Stage 2 reveals a crowd-sourced human translation of a lyric line (`crowd.track.translations.get`), rotating through ten languages so the puzzle feels fresh daily. Stage 3 gives a one-line lyric snippet (`track.snippet.get`). Stage 4 animates the full lyric word-by-word in exact sync with the recording, made possible only by Richsync's millisecond-level timestamps (`track.richsync.get`). Stage 5 plays a Spotify audio preview alongside the album art. Every stage uses a different API capability — five distinct data products, five escalating reveals.

Beyond the daily puzzle, signed-in players can create their own custom puzzles through a four-step builder: search any song in the MXM catalog, write a personal clue, pick a lyric line to mask, and share a link. Friends play through a four-stage reveal (personal clue → masked lyric → album art → audio preview), earning points that feed leaderboards and streaks. Puzzle creators earn bonus points every time someone plays their creation. After finishing, the game surfaces post-game context cards powered by partner APIs — upcoming concerts via JamBase and cross-platform stream stats (Spotify, YouTube, TikTok, Shazam) via Songstats — turning a guessing game into a discovery moment.

The entire stack runs on Replit: a React 19 + Vite frontend, an Express 5 API server, PostgreSQL via Drizzle ORM, and optional Clerk auth for streak persistence and leaderboards. Anonymous play is fully supported — no account required.

---

## How It Works

Each day a new song is chosen. You get five clue stages, unlocked one at a time. The fewer clues you need, the better your score.

| Stage | Clue | Musixmatch API |
|-------|------|----------------|
| 1 | **Vibes & Themes** — mood tags and thematic clusters derived from the lyrics | `track.lyrics.mood.get` |
| 2 | **Translation Clue** — a crowd-sourced human translation of a lyric line, language rotating daily | `crowd.track.translations.get` |
| 3 | **Lyric Snippet** — a one-line clue from the song plus a fuller excerpt | `track.snippet.get` + `track.lyrics.get` |
| 4 | **Word by Word** — the full Richsynced lyric, revealed one word at a time in sync with the recording | `track.richsync.get` |
| 5 | **Listen** — a 30-second Spotify audio preview + album art | Spotify oEmbed / iTunes |

After your game, share your score as an emoji grid — no spoilers.

---

## Musixmatch Pro API

Lyricle uses seven Pro-only endpoints. Each one is load-bearing — removing any one collapses a stage.

| Endpoint | Role in Lyricle | Why Pro-only |
|----------|----------------|--------------|
| `chart.tracks.get` | Selects today's puzzle from the US top chart — ensures the mystery song is always culturally relevant | Chart data is a Pro tier feature |
| `track.search` | Powers full-catalog autocomplete in the guess input, complete with album art | Full-catalog search with metadata is Pro |
| `track.lyrics.get` | Fetches full lyrics for Stage 3 and as a prerequisite for Lyricslens | Lyrics access requires Pro |
| `track.snippet.get` | Returns a single representative lyric line for the Stage 3 one-line clue | Snippet API is Pro |
| `track.richsync.get` | Provides word-level timestamps that drive the animated word-reveal in Stage 4 — each word fades in timed to the original recording | Richsync is a Pro-exclusive data product |
| `crowd.track.translations.get` | Returns crowd-sourced human-quality translations for Stage 2 — the target language rotates across 10 languages by puzzle number | Crowd translations are Pro |
| `track.lyrics.mood.get` | Returns Lyricslens mood and theme clusters that become the Stage 1 clue — no other data source has this signal | Lyricslens is a Pro-exclusive feature |

---

## Partner Services

| Service | Role | Required |
|---------|------|----------|
| **Replit** | Hosting, build pipeline, and deployment | Yes |
| **Spotify oEmbed** | Daily puzzle Stage 5 audio preview embed and album art (public endpoint, no key needed) | No key needed |
| **iTunes Search API** | Audio preview and album art fallback when Spotify oEmbed is unavailable | No key needed |
| **Clerk** | Optional auth — enables streak persistence, leaderboard identity, and UGC puzzle creation | Optional (`CLERK_SECRET_KEY`) |
| **Songstats** | Post-game stream count stats across Spotify, YouTube, TikTok, Shazam, Apple Music, SoundCloud, and Deezer (`enterprise/v1/tracks/search` + `/tracks/stats`) | Optional (`SONGSTATS_API_KEY`) |
| **JamBase** | Post-game upcoming concert dates for the mystery artist (`/v3/events`) | Optional (`JAMBASE_API_KEY`) |

---

## Puzzle Creator (UGC)

Any signed-in player can create a custom puzzle and share it with friends.

**Creation — 4-step wizard:**

1. **Pick a song** — search the full Musixmatch catalog via `track.search` autocomplete
2. **Write a personal clue** — a memory or feeling tied to the song (10–280 characters)
3. **Choose a lyric line to mask** — select any line from the MXM lyrics; players see `[ ??? ]` in its place
4. **Share the link** — a unique URL at `/p/<puzzleId>` that friends can open immediately

**Playing a shared puzzle — 4-stage reveal:**

| Stage | Clue shown | Source |
|-------|-----------|--------|
| 0 | Creator's personal clue (always visible) | Stored in DB |
| 1 | Full lyrics with the chosen line masked as `[ ??? ]` | `track.lyrics.get` via MXM |
| 2 | Album art | iTunes Search API |
| 3 | 30-second audio preview | iTunes Search API |

Players get 4 guesses across the 4 stages. Each wrong guess advances to the next stage. The server validates guesses via `/api/puzzles/:id/guess` without ever returning the answer; the answer is revealed only after the game is recorded by `/api/puzzles/:id/play`.

**Points economy:**
- Creators earn **+10 pts** when their puzzle is created and **+2 pts** per play by others
- Players earn **+20 pts** for a win, **+5 pts** per stage survived
- Players get **3 free UGC plays per day**; extra plays cost **50 pts** via `/unlock`

---

## Features

- **One shared puzzle per day** — puzzle epoch is 2026-01-01; everyone globally plays puzzle #N on day N
- **Five progressive clue stages** — each reveal costs a guess attempt
- **Streak tracking** — consecutive daily wins stored per user (Clerk auth) or locally (anonymous)
- **Daily leaderboard** — ranked by clues used and solve time
- **Weekly streak leaderboard** — top streaks across all registered players
- **Emoji share card** — spoiler-free shareable result (🟨🟩 grid)
- **Live stats strip** — animated banner showing today's total plays, average clues, and best streak
- **UGC puzzle creator** — build and share custom puzzles from the full MXM catalog
- **Post-game partner cards** — upcoming concerts (JamBase) and stream stats (Songstats) after the reveal
- **Mobile-first** — fully responsive, plays great on phone

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Vite, TypeScript, Tailwind CSS |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL + Drizzle ORM |
| Auth | Clerk (optional — anonymous play supported) |
| Music data | **Musixmatch Pro API** (primary) · Spotify oEmbed · iTunes Search API (media fallback) |
| Monorepo | pnpm workspaces |
| Hosting | Replit |

**Design aesthetic:** Vinyl liner-note editorial — dark warm background (`#0f0e0c`), cream text (`#f5eedc`), gold accent (`#e8d44d`), Playfair Display + Space Grotesk typography.

---

## Running Locally

### Prerequisites

- Node.js 22+
- pnpm 9+
- PostgreSQL database

### Setup

```bash
git clone https://github.com/<your-org>/lyricle
cd lyricle
pnpm install
```

### Environment Variables

Create a `.env` file in `artifacts/api-server/`:

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/lyricle
MXM_KEY=<your Musixmatch Pro API key>

# Optional — enables Clerk authentication (streak persistence, leaderboard identity, UGC puzzle creation)
CLERK_SECRET_KEY=<your Clerk secret key>
VITE_CLERK_PUBLISHABLE_KEY=<your Clerk publishable key>

# Optional — enables post-game upcoming concerts card
JAMBASE_API_KEY=<your JamBase API key>

# Optional — enables post-game cross-platform stream stats card
SONGSTATS_API_KEY=<your Songstats API key>
```

> **Musicathon participants:** Your Musixmatch Pro API key (Scale-plan access) was emailed to you after registration, or is available at [developer.musixmatch.com/admin/applications](https://developer.musixmatch.com/admin/applications).
>
> Spotify oEmbed and iTunes Search are public endpoints — no credentials required.

### Database

```bash
pnpm --filter @workspace/db run push
```

### Development

```bash
# Terminal 1 — API server (port 8080)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (port 23036)
pnpm --filter @workspace/lyricle run dev
```

Then open `http://localhost:23036`.

---

## Project Structure

```
lyricle/
├── artifacts/
│   ├── api-server/          # Express API
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── musixmatch.ts      # MXM Pro API client (7 endpoints)
│   │       │   ├── puzzle.ts          # Daily puzzle logic & clue assembly
│   │       │   ├── itunes.ts          # iTunes Search API fallback
│   │       │   └── curated-puzzles.ts # Offline fallback song bank (30 songs)
│   │       └── routes/
│   │           ├── puzzle.ts          # /api/puzzle/* endpoints
│   │           ├── ugc.ts             # /api/ugc/* endpoints (UGC puzzle creator)
│   │           ├── partner.ts         # /api/partner/* endpoints (JamBase, Songstats)
│   │           ├── leaderboard.ts     # /api/leaderboard/*
│   │           └── stats.ts           # /api/stats
│   └── lyricle/             # React frontend
│       └── src/
│           ├── pages/
│           │   ├── Landing.tsx        # Marketing landing page
│           │   ├── Game.tsx           # Main daily game view
│           │   ├── CreatePuzzle.tsx   # UGC puzzle builder (4-step wizard)
│           │   └── Leaderboard.tsx    # Leaderboard page
│           └── components/
│               ├── ClueCard.tsx       # Per-stage clue display
│               ├── AudioPlayer.tsx    # Custom audio player (Stage 5)
│               ├── GuessInput.tsx     # Autocomplete guess field
│               └── ResultModal.tsx    # End-of-game share card
└── packages/
    └── db/                  # Drizzle schema + migrations
```

---

## API Endpoints

### Daily Puzzle

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/puzzle/today` | Today's puzzle number and metadata |
| `GET` | `/api/puzzle/clue/:stage` | Clue data for stage 0–4 |
| `POST` | `/api/puzzle/guess` | Submit a guess |
| `GET` | `/api/puzzle/autocomplete?q=` | Track search (MXM → iTunes → curated) |
| `GET` | `/api/puzzle/answer` | Today's song reveal (after game ends) |
| `POST` | `/api/puzzle/result` | Record a completed game and update streak |
| `GET` | `/api/puzzle/leaderboard` | Today's top 100 players |
| `GET` | `/api/puzzle/stats` | Live aggregate stats (plays, win rate, distribution) |

### UGC Puzzle Creator (`/api/ugc/*` — defined in `ugc.ts`)

> These routes are served directly under `/api/` (not a `/ugc/` path prefix) because the router is mounted without a sub-prefix. Logical namespace: `ugc.ts`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/search?q=` | Search MXM catalog for puzzle song selection |
| `GET` | `/api/lyrics/:trackId` | Fetch lyric lines for the line-picker step |
| `POST` | `/api/puzzles` | Create a new custom puzzle (auth required) |
| `GET` | `/api/puzzles/:id` | Fetch puzzle metadata for a player (answer omitted) |
| `GET` | `/api/puzzles/:id/media` | Fetch lyrics + audio URL for progressive reveal (auth required) |
| `POST` | `/api/puzzles/:id/guess` | Validate a guess server-side — returns `{correct}` only |
| `POST` | `/api/puzzles/:id/play` | Record a completed game and reveal the answer (auth required) |
| `POST` | `/api/puzzles/:id/unlock` | Spend 50 pts for an extra daily play (auth required) |

### Partner Data (`/api/partner/*` — defined in `partner.ts`)

> These routes are served directly under `/api/` (not a `/partner/` path prefix). Logical namespace: `partner.ts`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/artist/concerts?artist=` | Upcoming concerts via JamBase `/v3/events` |
| `GET` | `/api/track/stats?artist=&title=` | Cross-platform stream stats via Songstats `enterprise/v1` |

---

## Puzzle Selection Logic

```
1. Musixmatch top chart (chart.tracks.get)
   → US top chart filtered to tracks with has_richsync=1
   → Uses MXM track ID for all clue API calls
2. Apple Music RSS top 100 (no key required)
   → Cross-references with curated song bank for rich clues
3. Curated 30-song bank (offline fallback)
   → Hand-crafted clues for iconic tracks; no API key required
```

The same deterministic algorithm (puzzle epoch + day offset) ensures every player worldwide gets the same song.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change. Please ensure any new clue stages or API integrations degrade gracefully when the relevant key is absent.

---

## License

MIT — content accessed via the Musixmatch Pro API is subject to the [Musixmatch Pro Terms of Service](https://www.musixmatch.com/pro/api/terms).
