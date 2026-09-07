#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Start RCA Assistant and expose it on a public link.
#
#   ./share.sh
#
# Brings up Docker, the Postgres container, applies migrations, builds if
# needed, starts the app, opens a Cloudflare tunnel and prints the public URL.
# Keep the window open; press Ctrl+C to stop sharing.
# ---------------------------------------------------------------------------
set -uo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PG_CONTAINER="defautheque-pg"
PG_PORT=5433
APP_PORT=4000

info() { printf "\033[1;34m›\033[0m %s\n" "$1"; }
ok()   { printf "\033[1;32m✓\033[0m %s\n" "$1"; }
err()  { printf "\033[1;31m✗\033[0m %s\n" "$1"; }

SERVER_PID=""
TUNNEL_PID=""
cleanup() {
  echo
  info "Stopping…"
  [ -n "$TUNNEL_PID" ] && kill "$TUNNEL_PID" 2>/dev/null
  [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null
  exit 0
}
trap cleanup INT TERM

# 1 ── Docker runtime -------------------------------------------------------
if ! colima status >/dev/null 2>&1; then
  info "Starting Docker (colima) — may take a minute…"
  colima start >/dev/null 2>&1 || { err "Could not start colima"; exit 1; }
fi
ok "Docker running"

# 2 ── Database -------------------------------------------------------------
if ! docker ps --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
  if docker ps -a --format '{{.Names}}' | grep -qx "$PG_CONTAINER"; then
    info "Starting database container…"
    docker start "$PG_CONTAINER" >/dev/null
  else
    info "Creating database container…"
    docker run -d --name "$PG_CONTAINER" \
      -e POSTGRES_USER=defautheque \
      -e POSTGRES_PASSWORD=defautheque \
      -e POSTGRES_DB=defautheque \
      -p ${PG_PORT}:5432 postgres:16-alpine >/dev/null
  fi
fi
for _ in $(seq 1 60); do
  docker exec "$PG_CONTAINER" pg_isready -U defautheque >/dev/null 2>&1 && break
  sleep 1
done
docker exec "$PG_CONTAINER" pg_isready -U defautheque >/dev/null 2>&1 \
  || { err "Database did not become ready"; exit 1; }
ok "Database ready"

# 3 ── Migrations + build ---------------------------------------------------
cd "$PROJECT_DIR/backend"
npx prisma migrate deploy >/dev/null 2>&1
if [ ! -d "$PROJECT_DIR/backend/dist" ]; then
  info "Building backend…"; npm run build >/dev/null
fi
if [ ! -d "$PROJECT_DIR/frontend/dist" ]; then
  info "Building frontend…"; (cd "$PROJECT_DIR/frontend" && npm run build >/dev/null)
fi
ok "App ready"

# 4 ── App server -----------------------------------------------------------
PIDS="$(lsof -ti tcp:${APP_PORT} 2>/dev/null)"
[ -n "$PIDS" ] && kill -9 $PIDS 2>/dev/null
PORT=$APP_PORT \
CLIENT_DIR="$PROJECT_DIR/frontend/dist" \
CORS_ORIGIN="" \
NODE_ENV=production \
  node dist/src/index.js > /tmp/rca-server.log 2>&1 &
SERVER_PID=$!
for _ in $(seq 1 30); do
  curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1 && break
  sleep 1
done
curl -sf "http://localhost:${APP_PORT}/api/health" >/dev/null 2>&1 \
  || { err "Server failed to start — see /tmp/rca-server.log"; exit 1; }
ok "App running locally on http://localhost:${APP_PORT}"

# 5 ── Public tunnel --------------------------------------------------------
pkill -f "cloudflared tunnel" 2>/dev/null
: > /tmp/rca-tunnel.log
cloudflared tunnel --url "http://localhost:${APP_PORT}" --no-autoupdate \
  > /tmp/rca-tunnel.log 2>&1 &
TUNNEL_PID=$!

PUBLIC_URL=""
for _ in $(seq 1 60); do
  PUBLIC_URL="$(grep -oE 'https://[a-z0-9-]+\.trycloudflare\.com' /tmp/rca-tunnel.log 2>/dev/null | head -1 || true)"
  [ -n "$PUBLIC_URL" ] && break
  sleep 1
done

echo
if [ -n "$PUBLIC_URL" ]; then
  printf "\033[1;32m══════════════════════════════════════════════════════════\033[0m\n"
  printf "  Share this link:  \033[1;36m%s\033[0m\n" "$PUBLIC_URL"
  printf "  Admin panel:      %s/admin\n" "$PUBLIC_URL"
  printf "\033[1;32m══════════════════════════════════════════════════════════\033[0m\n"
  printf "  Keep this window open. Press Ctrl+C to stop sharing.\n"
else
  err "No tunnel URL yet — check /tmp/rca-tunnel.log"
fi
echo

wait "$SERVER_PID"
