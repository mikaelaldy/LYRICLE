# 🎵 Lyricle — Daily Lyric Battle

[![Live Demo](https://img.shields.io/badge/Live%20Demo-lyricle.replit.app-gold?style=flat-square&logo=replit)](https://lyricle.replit.app)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)
[![Musicathon 2026](https://img.shields.io/badge/Musicathon%202026-Submission-blueviolet?style=flat-square)](https://www.musixmatch.com/pro/api/musicathon)

> **Guess the song from five escalating clues — one new puzzle for everyone, every day.**

---

## Hackathon Submission

**Musicathon 2026 · Musixmatch Pro API**
**Submission deadline: June 22, 2026 at 14:00 CEST / 05:00 PT**

### Submission Checklist

| Field | Value |
|-------|-------|
| **Title** | Lyricle — Daily Lyric Battle |
| **One-liner** | See below |
| **Description** | See below |
| **Demo URL** | https://lyricle.replit.app |
| **Demo video** | *(link TBD — required before June 22)* |
| **Public repo** | https://github.com/<your-org>/lyricle |
| **Team** | *(team name / member list)* |

### One-Liner

> Lyricle is a daily Wordle-style music game where every player worldwide solves the same puzzle using five escalating clues powered by the Musixmatch Pro API — from Lyricslens mood clusters to lyric snippets and audio previews.

### Full Description

Lyricle is a daily music game built around Musixmatch's Pro-only data. Each day a single mystery song is shared by every player on the planet. You get five clues, unlocked one at a time, and the fewer you need the higher your score.

**Originality:** The five-stage escalation design is unique to Lyricle. No other music game chains a lyric-based personal hint → mood-and-theme clusters → a lyric snippet → album art → audio preview into a single, globally-shared puzzle arc. The daily song is drawn from the Musixmatch top chart, keeping every puzzle culturally current. Signed-in players can also create and share their own custom puzzles through a four-step wizard, earning points in a gamified points economy whenever someone plays their creation.

**Craft:** The stack is built for resilience and polish — a React 19 + Vite frontend with Tailwind CSS, an Express 5 API server, PostgreSQL via Drizzle ORM, and optional Clerk auth. Anonymous play is fully supported with no signup required. The API layer degrades gracefully at every step: if the Musixmatch chart is unreachable the app falls through to an Apple Music chart cross-reference, then to a curated 30-song bank, so the game is always playable. Post-game context cards powered by JamBase (upcoming concerts) and Songstats (cross-platform stream stats) turn a guessing game into a discovery moment. The UI follows a vinyl liner-note editorial aesthetic — dark warm background, cream text, gold accent, Playfair Display + Space Grotesk typography.

**Use of MXM Pro API:** Stage 1 of the daily puzzle shows Lyricslens mood and theme clusters (`track.lyrics.mood.get`), a signal available only through Musixmatch. Stage 2 delivers a representative lyric snippet (`track.snippet.get`). The puzzle song itself is pulled from the US top chart (`chart.tracks.get`). Full lyrics power the opening personal clue and supplement the snippet (`track.lyrics.get`). The full-catalog autocomplete in the guess input and the UGC puzzle builder both use `track.search`. That is five distinct Pro-only endpoints, each load-bearing in the product.

**Impact:** Lyricle is playable by anyone — no account, no install. The shared daily puzzle creates a social moment where everyone can compare their clue count. Signed-in players build win streaks and create puzzles for friends. The discovery layer — upcoming concerts and cross-platform stream counts after the solve — extends the game's value past the final guess.

---

## How It Works

Each day a new song is chosen. You get five clue stages, unlocked one at a time. The fewer clues you need, the better your score.

| Stage | Clue | Source |
|-------|------|--------|
| 0 | **Personal Clue** — a lyric-based hint to open the puzzle | `track.lyrics.get` (live MXM) · curated hand-crafted line (fallback) |
| 1 | **Vibes & Themes** — mood label and thematic keyword clusters derived from the lyrics | `track.lyrics.mood.get` (Lyricslens) · keyword extraction fallback |
| 2 | **Lyric Snippet** — a one-line representative lyric clue | `track.snippet.get` · `track.lyrics.get` fallback |
| 3 | **Album Art** — the album cover | Spotify oEmbed · iTunes Search API fallback |
| 4 | **Audio Preview** — a 30-second audio clip | Spotify CDN · iTunes Search API fallback |

After your game, share your score as a text-based emoji grid — no spoilers.

---

## Musixmatch Pro API

Lyricle uses five Pro-only endpoints. Each one is load-bearing — removing any one degrades a stage.

| Endpoint | Role in Lyricle | Why Pro-only |
|----------|----------------|--------------|
| `chart.tracks.get` | Selects today's puzzle from the US top chart — ensures the mystery song is always culturally relevant | Chart data is a Pro tier feature |
| `track.search` | Powers full-catalog autocomplete in the guess input and the UGC puzzle builder | Full-catalog search with metadata is Pro |
| `track.lyrics.get` | Fetches full lyrics used to build the Stage 0 personal clue and as a fallback for the Stage 2 snippet | Lyrics access requires Pro |
| `track.snippet.get` | Returns a single representative lyric line for the Stage 2 clue | Snippet API is Pro |
| `track.lyrics.mood.get` | Returns Lyricslens mood and theme clusters that become the Stage 1 clue — no other data source has this signal | Lyricslens is a Pro-exclusive feature |

---

## Content & API Compliance

Lyricle is built in accordance with the Musicathon 2026 content-usage rules:

- **No bulk storage of lyrics.** All MXM API responses are fetched at request time for real-time display and are never written to a permanent store. Lyric text is not cached to disk or retained in the database.
- **Disk persistence is minimal.** The server caches only today's album art URL and audio preview URL to disk (a single JSON file per day, keyed by track ID and date). This avoids redundant fetches for the same active puzzle; the file is automatically deleted the next day. No lyric content is included.
- **No commercial use.** Lyricle is built for demonstration and evaluation purposes as a Musicathon entry. It is not a commercial product.
- **Answer not surfaced during active play.** The frontend calls `/api/puzzle/answer` only after the game is recorded as complete. The endpoint itself is unauthenticated; the gate is enforced in the client and by the game flow, not a server-side completion check.

---

## Partner Services

| Service | Role | Required |
|---------|------|----------|
| **Replit** | Hosting, build pipeline, and deployment | Yes |
| **Spotify oEmbed** | Stage 3 album art and Stage 4 audio preview (public endpoint, no key needed) | No key needed |
| **iTunes Search API** | Album art and audio preview fallback when Spotify is unavailable | No key needed |
| **Clerk** | Optional auth — enables streak persistence, leaderboard identity, and UGC puzzle creation | Optional (`CLERK_SECRET_KEY`) |
| **Songstats** | Post-game stream count stats across Spotify, YouTube, TikTok, Shazam, Apple Music, SoundCloud, and Deezer | Optional (`SONGSTATS_API_KEY`) |
| **JamBase** | Post-game upcoming concert dates for the mystery artist | Optional (`JAMBASE_API_KEY`) |

---

## Puzzle Creator (UGC)

Any signed-in player can create a custom puzzle and share it with friends.

**Creation — 5-step wizard:**

1. **Pick a song** — search the full Musixmatch catalog via `track.search` autocomplete
2. **Review vibes & themes** — auto-generated mood/theme tags from the lyrics (players see these as Stage 1)
3. **Write a personal clue** — a memory or feeling tied to the song (10–280 characters)
4. **Choose a lyric line** — select one line shown verbatim to players as their Stage 2 lyric snippet
5. **Share the link** — a unique URL at `/p/<puzzleId>` that friends can open immediately

**Playing a shared puzzle — 5-stage reveal:**

| Stage | Clue shown | Source |
|-------|-----------|--------|
| 0 | Creator's personal clue (always visible) | Stored in DB |
| 1 | Vibes & Themes — mood and thematic tags | Curated / `track.lyrics.get` keyword extraction |
| 2 | Lyric Snippet — a short excerpt | Curated / `track.snippet.get` |
| 3 | Album art | Spotify oEmbed · iTunes Search API |
| 4 | 30-second audio preview | Spotify CDN · iTunes Search API |

Players get 5 guesses, one per stage. Each wrong guess advances to the next stage. The server validates guesses via `/api/puzzles/:id/guess` without ever returning the answer; the answer is revealed only after the game is recorded by `/api/puzzles/:id/play`.

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
- **Emoji share** — spoiler-free text-based emoji grid (🟨🟩) you can paste anywhere
- **Live stats strip** — animated banner showing today's total plays, average clues, and best streak
- **UGC puzzle creator** — build and share custom puzzles from the full MXM catalog; gamified points economy for creators and players
- **Post-game partner cards** — upcoming concerts (JamBase, optional API key) and cross-platform stream stats (Songstats, optional API key) after the reveal
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

Both services require `PORT` from the environment. The frontend also requires `BASE_PATH` (the URL path prefix — use `/` for local dev):

```bash
# Terminal 1 — API server
PORT=8080 pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend
PORT=3000 BASE_PATH=/ pnpm --filter @workspace/lyricle run dev
```

Then open `http://localhost:3000`.

---

## Project Structure

```
lyricle/
├── artifacts/
│   ├── api-server/          # Express API
│   │   └── src/
│   │       ├── lib/
│   │       │   ├── musixmatch.ts      # MXM Pro API client (5 active endpoints)
│   │       │   ├── puzzle.ts          # Daily puzzle logic & clue assembly
│   │       │   ├── itunes.ts          # iTunes Search API / Apple Music chart
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
│           │   └── Leaderboard.tsx    # Daily puzzle leaderboard
│           └── components/
│               ├── ClueCard.tsx       # Per-stage clue display
│               ├── AudioPlayer.tsx    # Custom audio player (Stage 4)
│               ├── GuessInput.tsx     # Autocomplete guess field
│               └── ResultModal.tsx    # End-of-game result and emoji share
└── lib/
    ├── db/                  # Drizzle schema + migrations
    ├── api-spec/            # Shared API type definitions
    ├── api-zod/             # Zod validators for API schemas
    └── api-client-react/    # React Query hooks for API client
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
   → US top chart; puzzle index = (puzzleNumber - 1) % chartSize
   → If the selected track matches a curated song, rich clue data is used
   → Requires a valid MXM_KEY

2. Apple Music / iTunes top chart (no key required)
   → Falls back here if the MXM chart returns an error or empty result
   → Cross-references the chart hit against the curated 30-song bank for rich clues

3. Curated 30-song bank (final fallback)
   → Hand-crafted clues for 30 iconic tracks; no API key required
   → Active today while the live MXM API key is being resolved
```

The app tries each step in order and stops at the first success. The same deterministic algorithm (puzzle epoch 2026-01-01 + day offset) ensures every player worldwide gets the same song regardless of which pipeline is active.

---

## Contributing

Pull requests are welcome. For significant changes, open an issue first to discuss what you'd like to change. Please ensure any new clue stages or API integrations degrade gracefully when the relevant key is absent.

---

## License

MIT — content accessed via the Musixmatch Pro API is subject to the [Musixmatch Pro Terms of Service](https://www.musixmatch.com/pro/api/terms).
