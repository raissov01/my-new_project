#!/bin/bash
set -euo pipefail

# StudyWithRaissov — VPS deployment script
# Run from project root: bash docker/deploy.sh

APP_DIR="/opt/studywithraissov"

echo "=== StudyWithRaissov deploy ==="

cd "$APP_DIR"
git fetch origin main
git reset --hard origin/main

# Rebuild and restart all containers
docker compose \
  --env-file frontend/.env \
  --env-file backend/.env \
  -f docker/docker-compose.yml \
  up -d --build

# Clean up old images
docker image prune -f >/dev/null 2>&1 || true

echo ""
echo "=== Deploy complete ==="
docker compose \
  --env-file frontend/.env \
  --env-file backend/.env \
  -f docker/docker-compose.yml \
  ps
