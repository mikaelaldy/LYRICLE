---
name: Lyricle Architecture
description: Key decisions and constraints for the Lyricle daily song-guessing game built for Musicathon 2026.
---

# Lyricle Architecture

## Stack
- Frontend: React + Vite + Tailwind v4, Wouter, TanStack Query, framer-motion, Clerk Auth
- Backend: Express 5 + Drizzle ORM + PostgreSQL (Replit managed)
- API contract: OpenAPI spec → Orval codegen → typed hooks + Zod schemas

## Critical env vars
- `MXM_KEY` — Musixmatch Pro API key (secret). Required for all clue/guess/autocomplete endpoints. `GET /api/puzzle/today` does NOT call Musixmatch and works without it.
- `CLERK_PUBLISHABLE_KEY`, `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY` — auto-set by setupClerkWhitelabelAuth()

## Puzzle selection
- Daily puzzle selected from Musixmatch chart.tracks.get (top 100 US)
- Deterministic: puzzleNumber % tracks.length → same track worldwide each day
- Puzzle epoch: 2026-01-01 UTC (day 1 = puzzle #1)
- In-memory cache keyed by date; resets when cache.date !== today

## Clue stages (0–4)
- 0: lyricslens themes/mood (track.lyrics.mood.get — Pro feature, fallback to lyrics keywords)
- 1: translation (crowd.track.translations.get — Pro feature, fallback to snippet)
- 2: snippet (track.snippet.get)
- 3: richsync word-by-word (track.richsync.get)
- 4: album art + Spotify embed (albumArtUrl from chart track data)

**Why:** Graceful fallbacks are critical — hackathon Pro features (lyricslens, translations) may not work on all accounts.

## DB schema
- `daily_results`: one row per player per puzzle date (playerId + puzzleDate unique)
- `player_streaks`: one row per playerId (anonymous UUID or clerkUserId)

## Frontend design
- Palette: near-black #0f0e0c bg, parchment #f5eedc text, acid yellow #e8d44d accent
- Fonts: Playfair Display (serifs/headers), Space Grotesk (body), JetBrains Mono (data)
- Clerk appearance: shadcn theme, cssLayerName="clerk", Tailwind layer order required in index.css
- Tailwind v4: must have `@layer theme, base, clerk, components, utilities;` BEFORE `@import 'tailwindcss'`
- vite.config.ts: `tailwindcss({ optimize: false })` required for Clerk themes in prod

## Route structure
- `/` → Game (puzzle page) — always accessible unauthenticated
- `/leaderboard` → Leaderboard page
- `/sign-in/*?` and `/sign-up/*?` → Clerk auth pages (routing="path" + full basePath)
