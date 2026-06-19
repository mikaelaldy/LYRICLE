#!/bin/bash
set -e

pnpm install --frozen-lockfile
pnpm --filter db push

# Mirror to GitHub using a temporary credential store (avoids exposing the
# token in process listings that would occur if it were embedded in the URL).
if [ -n "$GITHUB_TOKEN" ]; then
  echo "Syncing to GitHub (mikaelaldy/lyricle)..."

  CRED_FILE=$(mktemp)
  trap 'rm -f "$CRED_FILE"' EXIT

  printf 'https://x-access-token:%s@github.com\n' "$GITHUB_TOKEN" > "$CRED_FILE"
  chmod 600 "$CRED_FILE"

  # Replit is always the authoritative source. Use --force so that any
  # commits that landed directly on GitHub (e.g. from a task-agent push
  # during setup) are overwritten by the Replit workspace state.
  if git -c "credential.helper=store --file=$CRED_FILE" \
         push --force https://github.com/mikaelaldy/lyricle.git HEAD:main 2>&1; then
    echo "GitHub sync complete."
  else
    echo "WARNING: GitHub sync failed — check that GITHUB_TOKEN has Contents:write" \
         "permission on mikaelaldy/lyricle and has not expired."
  fi
else
  echo "GITHUB_TOKEN not set — skipping GitHub sync."
fi
