#!/bin/bash
set -euo pipefail

# StudyWithRaissov — Docker Swarm deployment
# Run from project root: bash docker/swarm-deploy.sh

APP_DIR="/opt/studywithraissov"
STACK_NAME="swr"

cd "$APP_DIR"

echo "=== Building images ==="
set -a
. frontend/.env
. backend/.env
STACK_DEPLOY_VERSION="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
export STACK_DEPLOY_VERSION
set +a

DOCKER_BUILDKIT=1 docker build -t swr-backend -f docker/backend.Dockerfile backend/
DOCKER_BUILDKIT=1 docker build \
  --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  -t swr-frontend \
  -f docker/frontend.Dockerfile \
  frontend/

echo ""
echo "=== Deploying stack ==="
docker stack deploy -c docker/stack.yml "$STACK_NAME"

echo ""
echo "=== Waiting for services to converge ==="
sleep 10

echo ""
echo "=== Stack services ==="
docker stack services "$STACK_NAME"

echo ""
echo "=== Service tasks ==="
docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null | head -20

echo ""
echo "=== Health checks ==="
sleep 10
curl -sf https://studywithraissov.com/health >/dev/null && echo " [backend OK]" || echo " [backend FAIL]"
curl -sf -o /dev/null https://studywithraissov.com && echo " [site OK]" || echo " [site FAIL]"
