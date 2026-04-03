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
docker stack deploy --resolve-image never -c docker/stack.yml "$STACK_NAME"

echo ""
echo "=== Waiting for services to converge ==="
for attempt in $(seq 1 36); do
  backend_replicas="$(docker service inspect "$STACK_NAME"_backend --format '{{.ServiceStatus.RunningTasks}}/{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || true)"
  frontend_replicas="$(docker service inspect "$STACK_NAME"_frontend --format '{{.ServiceStatus.RunningTasks}}/{{.Spec.Mode.Replicated.Replicas}}' 2>/dev/null || true)"
  nginx_replicas="$(docker service inspect "$STACK_NAME"_nginx --format '{{.ServiceStatus.RunningTasks}}/{{if .Spec.Mode.Replicated}}{{.Spec.Mode.Replicated.Replicas}}{{else}}1{{end}}' 2>/dev/null || true)"
  postgres_replicas="$(docker service inspect "$STACK_NAME"_postgres --format '{{.ServiceStatus.RunningTasks}}/{{if .Spec.Mode.Replicated}}{{.Spec.Mode.Replicated.Replicas}}{{else}}1{{end}}' 2>/dev/null || true)"

  if [ "$backend_replicas" = "2/2" ] && [ "$frontend_replicas" = "2/2" ] && [ "$nginx_replicas" = "1/1" ] && [ "$postgres_replicas" = "1/1" ]; then
    break
  fi

  sleep 5
done

echo ""
echo "=== Stack services ==="
docker stack services "$STACK_NAME"

echo ""
echo "=== Service tasks ==="
docker stack ps "$STACK_NAME" --no-trunc 2>/dev/null | head -20

echo ""
echo "=== Health checks ==="
backend_ok=0
site_ok=0

for attempt in $(seq 1 24); do
  if curl -sf https://studywithraissov.com/health >/dev/null; then
    backend_ok=1
    break
  fi
  sleep 5
done

for attempt in $(seq 1 24); do
  if curl -sf -o /dev/null https://studywithraissov.com; then
    site_ok=1
    break
  fi
  sleep 5
done

[ "$backend_ok" -eq 1 ] && echo " [backend OK]" || echo " [backend FAIL]"
[ "$site_ok" -eq 1 ] && echo " [site OK]" || echo " [site FAIL]"

if [ "$backend_ok" -ne 1 ] || [ "$site_ok" -ne 1 ]; then
  echo ""
  echo "=== Recent backend logs ==="
  docker service logs "$STACK_NAME"_backend --tail 80 2>&1 || true
  echo ""
  echo "=== Recent nginx logs ==="
  docker service logs "$STACK_NAME"_nginx --tail 80 2>&1 || true
  exit 1
fi
