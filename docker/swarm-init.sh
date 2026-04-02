#!/bin/bash
set -euo pipefail

# StudyWithRaissov — One-time Docker Swarm initialization
# Run this ONCE on the manager node: bash docker/swarm-init.sh

APP_DIR="/opt/studywithraissov"
cd "$APP_DIR"

echo "=== Initializing Docker Swarm ==="
docker swarm init 2>/dev/null || echo "Swarm already initialized"

echo ""
echo "=== Stopping old docker-compose stack if running ==="
docker compose -f docker/docker-compose.yml down --remove-orphans 2>/dev/null || true

echo ""
echo "=== Creating secrets ==="

# Postgres password
if ! docker secret inspect postgres_password >/dev/null 2>&1; then
  read -sp "Enter PostgreSQL password: " PG_PASS
  echo
  echo "$PG_PASS" | docker secret create postgres_password -
  echo "Created postgres_password secret"
else
  echo "postgres_password secret already exists"
fi

# Backend env
if ! docker secret inspect backend_env >/dev/null 2>&1; then
  if [ -f backend/.env ]; then
    docker secret create backend_env backend/.env
    echo "Created backend_env secret from backend/.env"
  else
    echo "ERROR: backend/.env not found. Create it first."
    exit 1
  fi
else
  echo "backend_env secret already exists (remove and recreate to update: docker secret rm backend_env)"
fi

# Frontend env
if ! docker secret inspect frontend_env >/dev/null 2>&1; then
  if [ -f frontend/.env ]; then
    docker secret create frontend_env frontend/.env
    echo "Created frontend_env secret from frontend/.env"
  else
    echo "ERROR: frontend/.env not found. Create it first."
    exit 1
  fi
else
  echo "frontend_env secret already exists"
fi

echo ""
echo "=== Swarm ready. Deploy with: ==="
echo "  bash docker/swarm-deploy.sh"
