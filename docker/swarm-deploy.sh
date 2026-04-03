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

mkdir -p .buildx-cache/backend-new
mkdir -p .buildx-cache/frontend-new
docker buildx create --name swr-builder --use 2>/dev/null || docker buildx use swr-builder

docker buildx build \
  --load \
  --cache-from type=local,src=.buildx-cache/backend \
  --cache-to type=local,dest=.buildx-cache/backend-new,mode=max \
  -t swr-backend \
  -f docker/backend.Dockerfile \
  backend/
docker buildx build \
  --load \
  --cache-from type=local,src=.buildx-cache/frontend \
  --cache-to type=local,dest=.buildx-cache/frontend-new,mode=max \
  --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
  --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
  -t swr-frontend \
  -f docker/frontend.Dockerfile frontend/

rm -rf .buildx-cache/backend
rm -rf .buildx-cache/frontend
mv .buildx-cache/backend-new .buildx-cache/backend
mv .buildx-cache/frontend-new .buildx-cache/frontend

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
