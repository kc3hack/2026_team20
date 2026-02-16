#!/usr/bin/env bash
#
# deploy.sh — Plot Platform deployment script
#
# Usage:
#   ./scripts/deploy.sh              # Full deploy (pull, build, restart)
#   ./scripts/deploy.sh --build-only # Build only, no restart
#   ./scripts/deploy.sh --restart    # Restart containers only
#
set -euo pipefail

# ----- Config -----
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
COMPOSE_FILE="$PROJECT_ROOT/docker-compose.yml"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log()  { echo -e "${GREEN}[deploy]${NC} $*"; }
warn() { echo -e "${YELLOW}[warn]${NC} $*"; }
err()  { echo -e "${RED}[error]${NC} $*" >&2; }

# ----- Helpers -----
check_deps() {
  local missing=()
  for cmd in git docker pnpm node; do
    if ! command -v "$cmd" &>/dev/null; then
      missing+=("$cmd")
    fi
  done
  if [[ ${#missing[@]} -gt 0 ]]; then
    err "Missing required tools: ${missing[*]}"
    exit 1
  fi
}

pull_latest() {
  log "Pulling latest code..."
  cd "$PROJECT_ROOT"
  git pull --ff-only origin "$(git rev-parse --abbrev-ref HEAD)"
  log "Code updated to $(git rev-parse --short HEAD)"
}

install_deps() {
  log "Installing frontend dependencies..."
  cd "$FRONTEND_DIR"
  pnpm install --frozen-lockfile 2>/dev/null || pnpm install
  log "Frontend dependencies installed."
}

build_frontend() {
  log "Building frontend..."
  cd "$FRONTEND_DIR"
  pnpm build
  log "Frontend build complete."
}

docker_build() {
  log "Building Docker images..."
  cd "$PROJECT_ROOT"
  docker compose -f "$COMPOSE_FILE" build
  log "Docker images built."
}

docker_restart() {
  log "Restarting Docker containers..."
  cd "$PROJECT_ROOT"
  docker compose -f "$COMPOSE_FILE" down --remove-orphans
  docker compose -f "$COMPOSE_FILE" up -d
  log "Containers started."
}

docker_status() {
  log "Container status:"
  cd "$PROJECT_ROOT"
  docker compose -f "$COMPOSE_FILE" ps
}

# ----- Main -----
main() {
  local mode="${1:-full}"

  check_deps

  case "$mode" in
    --build-only)
      log "=== Build-only mode ==="
      install_deps
      build_frontend
      docker_build
      ;;
    --restart)
      log "=== Restart-only mode ==="
      docker_restart
      docker_status
      ;;
    *)
      log "=== Full deploy ==="
      pull_latest
      install_deps
      build_frontend
      docker_build
      docker_restart
      docker_status
      log "Deploy complete!"
      ;;
  esac
}

main "$@"
