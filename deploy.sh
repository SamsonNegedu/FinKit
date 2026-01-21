#!/bin/bash
set -e

# FinKit - Raspberry Pi Deployment
# Usage:
#   ./deploy.sh          - Pull latest images and restart
#   ./deploy.sh pull     - Pull images only (no restart)
#   ./deploy.sh logs     - View logs
#   ./deploy.sh status   - Show container status
#   ./deploy.sh stop     - Stop all containers

COMPOSE_FILE="docker-compose.prod.yml"
cd "$(dirname "$0")"

# Colors
G='\033[0;32m' Y='\033[1;33m' R='\033[0;31m' N='\033[0m'

info() { echo -e "${G}$1${N}"; }
warn() { echo -e "${Y}$1${N}"; }

case "${1:-update}" in
  pull)
    info "📦 Pulling latest images..."
    docker compose -f $COMPOSE_FILE pull
    info "✅ Done. Run './deploy.sh' to restart with new images."
    ;;

  logs)
    docker compose -f $COMPOSE_FILE logs -f
    ;;

  status)
    docker compose -f $COMPOSE_FILE ps
    ;;

  stop)
    info "🛑 Stopping containers..."
    docker compose -f $COMPOSE_FILE down
    ;;

  update|"")
    # Check .env
    if [ ! -f .env ]; then
      if [ -f example.env ]; then
        cp example.env .env
        warn "Created .env from example. Edit it with your credentials, then run again."
        exit 1
      fi
    fi

    # Load env
    set -a; source .env 2>/dev/null || true; set +a

    # GHCR login if credentials provided
    if [ -n "$GITHUB_TOKEN" ] && [ -n "$GITHUB_USER" ]; then
      info "🔐 Logging in to ghcr.io..."
      echo "$GITHUB_TOKEN" | docker login ghcr.io -u "$GITHUB_USER" --password-stdin
    fi

    info "📦 Pulling latest images..."
    docker compose -f $COMPOSE_FILE pull

    info "🔄 Restarting containers..."
    docker compose -f $COMPOSE_FILE up -d --remove-orphans

    info "⏳ Waiting for health checks..."
    sleep 5

    echo ""
    docker compose -f $COMPOSE_FILE ps
    echo ""
    info "✅ Deployed! Access via your Cloudflare tunnel URL."
    ;;

  *)
    echo "Usage: ./deploy.sh [pull|logs|status|stop|update]"
    exit 1
    ;;
esac
