#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Publish the read-only site to GitHub Pages.
#
#   ./publish.sh
#
# Exports the current database content + images into the frontend, builds the
# static site and pushes it to the gh-pages branch.
#
# Live at: https://ramonebidhem.github.io/rca-assistant/
# ---------------------------------------------------------------------------
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="https://github.com/ramonebidhem/rca-assistant.git"
BASE_PATH="/rca-assistant/"
PG_CONTAINER="defautheque-pg"

info() { printf "\033[1;34m›\033[0m %s\n" "$1"; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m✗\033[0m %s\n" "$1"; }

# The export reads from the local database, so make sure it is up.
if ! docker exec "$PG_CONTAINER" pg_isready -U defautheque >/dev/null 2>&1; then
  info "Starting database…"
  colima status >/dev/null 2>&1 || colima start >/dev/null 2>&1
  docker start "$PG_CONTAINER" >/dev/null 2>&1
  for _ in $(seq 1 60); do
    docker exec "$PG_CONTAINER" pg_isready -U defautheque >/dev/null 2>&1 && break
    sleep 1
  done
fi
docker exec "$PG_CONTAINER" pg_isready -U defautheque >/dev/null 2>&1 \
  || { err "Database not reachable — cannot export content"; exit 1; }
ok "Database ready"

info "Exporting content and images…"
cd "$PROJECT_DIR/backend" && npx tsx prisma/export-static.ts || { err "Export failed"; exit 1; }

info "Building static site…"
cd "$PROJECT_DIR/frontend"
VITE_STATIC=1 BASE_PATH="$BASE_PATH" npm run build >/dev/null || { err "Build failed"; exit 1; }
# SPA fallback for deep links + skip Jekyll processing.
cp dist/index.html dist/404.html
touch dist/.nojekyll
ok "Built"

info "Publishing to gh-pages…"
cd "$PROJECT_DIR/frontend/dist"
rm -rf .git
git init -q
git checkout -q -b gh-pages
git add -A
git -c user.email=benomar.mehdi@gmail.com -c user.name="Mehdi" \
  commit -q -m "Deploy RCA Assistant static site"
git push -q -f "$REPO" gh-pages || { err "Push failed"; exit 1; }
rm -rf .git

echo
printf "\033[1;32m══════════════════════════════════════════════════════════\033[0m\n"
printf "  Published:  \033[1;36mhttps://ramonebidhem.github.io/rca-assistant/\033[0m\n"
printf "\033[1;32m══════════════════════════════════════════════════════════\033[0m\n"
printf "  GitHub Pages can take ~1 minute to refresh.\n"
echo
