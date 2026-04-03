#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/studywithraissov}"
STACK_NAME="${STACK_NAME:-swr}"

DEPLOY_FRONTEND="${DEPLOY_FRONTEND:-false}"
DEPLOY_BACKEND="${DEPLOY_BACKEND:-false}"
DEPLOY_NGINX="${DEPLOY_NGINX:-false}"
APPLY_STACK="${APPLY_STACK:-false}"
RUN_MIGRATIONS="${RUN_MIGRATIONS:-false}"
CHANGED_FILES_B64="${CHANGED_FILES_B64:-}"
DEPLOY_SUMMARY_B64="${DEPLOY_SUMMARY_B64:-}"

bool() {
  case "${1:-false}" in
    1|true|TRUE|yes|YES|on|ON) return 0 ;;
    *) return 1 ;;
  esac
}

retry_command() {
  local attempts="$1"
  shift

  local attempt=1
  local exit_code=0

  while true; do
    if "$@"; then
      return 0
    fi

    exit_code=$?
    if (( attempt >= attempts )); then
      return "$exit_code"
    fi

    echo "Command failed (attempt ${attempt}/${attempts}): $*"
    sleep 5
    attempt=$((attempt + 1))
  done
}

service_exists() {
  docker service inspect "$1" >/dev/null 2>&1
}

stack_exists() {
  docker stack services "$STACK_NAME" >/dev/null 2>&1
}

get_service_image() {
  local service_name="$1"
  local fallback="$2"

  docker service inspect "${STACK_NAME}_${service_name}" --format '{{.Spec.TaskTemplate.ContainerSpec.Image}}' 2>/dev/null || echo "$fallback"
}

get_service_label() {
  local service_name="$1"
  local label_key="$2"

  docker service inspect "${STACK_NAME}_${service_name}" --format "{{ index .Spec.Labels \"$label_key\" }}" 2>/dev/null || true
}

get_nginx_config_version() {
  docker service inspect "${STACK_NAME}_nginx" \
    --format '{{range .Spec.TaskTemplate.ContainerSpec.Configs}}{{println .ConfigName}}{{end}}' 2>/dev/null \
    | sed -n 's/^swr_nginx_conf_//p' \
    | head -n 1
}

get_service_replicas() {
  local service_name="$1"

  docker service ls --format '{{.Name}} {{.Replicas}}' 2>/dev/null \
    | awk -v service="$service_name" '$1 == service { print $2; exit }'
}

wait_for_service() {
  local service_name="$1"
  local expected="$2"

  for _attempt in $(seq 1 36); do
    local current
    current="$(get_service_replicas "$service_name")"
    if [[ "$current" == "$expected" ]]; then
      return 0
    fi
    sleep 5
  done

  echo "Timed out waiting for ${service_name} to reach ${expected}" >&2
  docker service ps "$service_name" --no-trunc || true
  return 1
}

run_health_checks() {
  local backend_ok=0
  local site_ok=0

  for _attempt in $(seq 1 24); do
    if curl -sf https://studywithraissov.com/health >/dev/null; then
      backend_ok=1
      break
    fi
    sleep 5
  done

  for _attempt in $(seq 1 24); do
    if curl -sf -o /dev/null https://studywithraissov.com; then
      site_ok=1
      break
    fi
    sleep 5
  done

  echo "backend_ok=${backend_ok} site_ok=${site_ok}"

  if [[ "$backend_ok" -ne 1 || "$site_ok" -ne 1 ]]; then
    echo ""
    echo "=== Recent backend logs ==="
    docker service logs "${STACK_NAME}_backend" --tail 80 2>&1 || true
    echo ""
    echo "=== Recent nginx logs ==="
    docker service logs "${STACK_NAME}_nginx" --tail 80 2>&1 || true
    echo ""
    echo "=== Recent frontend logs ==="
    docker service logs "${STACK_NAME}_frontend" --tail 80 2>&1 || true
    return 1
  fi
}

run_migration_exec() {
  local desired_image="$1"
  local container_id=""

  echo ""
  echo "=== Running migrations inside backend task ==="

  for _attempt in $(seq 1 24); do
    while read -r cid image; do
      if [[ "$image" == "$desired_image" ]]; then
        container_id="$cid"
        break 2
      fi
    done < <(docker ps \
      --filter "label=com.docker.swarm.service.name=${STACK_NAME}_backend" \
      --format '{{.ID}} {{.Image}}')
    sleep 2
  done

  if [[ -z "$container_id" ]]; then
    echo "Could not find a running backend container for image ${desired_image}" >&2
    return 1
  fi

  docker exec "$container_id" ./migrate
}

cd "$APP_DIR"

echo "=== Smart deploy ==="
echo "app_dir=$APP_DIR"
echo "stack_name=$STACK_NAME"
echo "deploy_frontend=$DEPLOY_FRONTEND"
echo "deploy_backend=$DEPLOY_BACKEND"
echo "deploy_nginx=$DEPLOY_NGINX"
echo "apply_stack=$APPLY_STACK"
echo "run_migrations=$RUN_MIGRATIONS"

if [[ -n "$DEPLOY_SUMMARY_B64" ]]; then
  echo ""
  echo "=== Change summary ==="
  printf '%s' "$DEPLOY_SUMMARY_B64" | base64 -d || true
  echo ""
fi

if [[ -n "$CHANGED_FILES_B64" ]]; then
  echo ""
  echo "=== Changed files ==="
  printf '%s' "$CHANGED_FILES_B64" | base64 -d | sed 's/^/- /' || true
  echo ""
fi

if ! bool "$DEPLOY_FRONTEND" && ! bool "$DEPLOY_BACKEND" && ! bool "$DEPLOY_NGINX" && ! bool "$APPLY_STACK"; then
  echo "Nothing to deploy. Exiting."
  exit 0
fi

docker swarm init 2>/dev/null || true

if ! docker secret inspect postgres_password >/dev/null 2>&1; then
  echo "changeme" | docker secret create postgres_password -
fi

set -a
. frontend/.env
. backend/.env
set +a

BOOTSTRAP=false
if ! stack_exists || ! service_exists "${STACK_NAME}_frontend" || ! service_exists "${STACK_NAME}_backend" || ! service_exists "${STACK_NAME}_nginx"; then
  BOOTSTRAP=true
  DEPLOY_FRONTEND=true
  DEPLOY_BACKEND=true
  DEPLOY_NGINX=true
  APPLY_STACK=true
  echo "Bootstrap mode: stack or services missing, forcing full runtime deploy."
fi

CURRENT_BACKEND_IMAGE="$(get_service_image backend "swr-backend:latest")"
CURRENT_FRONTEND_IMAGE="$(get_service_image frontend "swr-frontend:latest")"
CURRENT_BACKEND_DEPLOY_VERSION="$(get_service_label backend "com.studywithraissov.deploy-version")"
CURRENT_FRONTEND_DEPLOY_VERSION="$(get_service_label frontend "com.studywithraissov.deploy-version")"
CURRENT_POSTGRES_DEPLOY_VERSION="$(get_service_label postgres "com.studywithraissov.deploy-version")"
CURRENT_NGINX_DEPLOY_VERSION="$(get_service_label nginx "com.studywithraissov.deploy-version")"
CURRENT_NGINX_CONFIG_VERSION="$(get_nginx_config_version)"

[[ "$CURRENT_BACKEND_DEPLOY_VERSION" == "<no value>" ]] && CURRENT_BACKEND_DEPLOY_VERSION=""
[[ "$CURRENT_FRONTEND_DEPLOY_VERSION" == "<no value>" ]] && CURRENT_FRONTEND_DEPLOY_VERSION=""
[[ "$CURRENT_POSTGRES_DEPLOY_VERSION" == "<no value>" ]] && CURRENT_POSTGRES_DEPLOY_VERSION=""
[[ "$CURRENT_NGINX_DEPLOY_VERSION" == "<no value>" ]] && CURRENT_NGINX_DEPLOY_VERSION=""

[[ -n "$CURRENT_BACKEND_DEPLOY_VERSION" ]] || CURRENT_BACKEND_DEPLOY_VERSION="${CURRENT_BACKEND_IMAGE##*:}"
[[ -n "$CURRENT_FRONTEND_DEPLOY_VERSION" ]] || CURRENT_FRONTEND_DEPLOY_VERSION="${CURRENT_FRONTEND_IMAGE##*:}"
[[ -n "$CURRENT_POSTGRES_DEPLOY_VERSION" ]] || CURRENT_POSTGRES_DEPLOY_VERSION="postgres-stable"
[[ -n "$CURRENT_NGINX_DEPLOY_VERSION" ]] || CURRENT_NGINX_DEPLOY_VERSION="nginx-stable"
[[ -n "$CURRENT_NGINX_CONFIG_VERSION" ]] || CURRENT_NGINX_CONFIG_VERSION="$CURRENT_NGINX_DEPLOY_VERSION"

BACKEND_IMAGE="$CURRENT_BACKEND_IMAGE"
FRONTEND_IMAGE="$CURRENT_FRONTEND_IMAGE"
BACKEND_DEPLOY_VERSION="$CURRENT_BACKEND_DEPLOY_VERSION"
FRONTEND_DEPLOY_VERSION="$CURRENT_FRONTEND_DEPLOY_VERSION"
POSTGRES_DEPLOY_VERSION="$CURRENT_POSTGRES_DEPLOY_VERSION"
NGINX_DEPLOY_VERSION="$CURRENT_NGINX_DEPLOY_VERSION"
NGINX_CONFIG_VERSION="$CURRENT_NGINX_CONFIG_VERSION"

DEPLOY_NONCE="$(date +%Y%m%d%H%M%S)-$(git rev-parse --short HEAD)"
IMAGES_BUILT=false

if bool "$DEPLOY_BACKEND"; then
  BACKEND_DEPLOY_VERSION="${DEPLOY_NONCE}-backend"
  BACKEND_IMAGE="swr-backend:${BACKEND_DEPLOY_VERSION}"
  echo ""
  echo "=== Building backend image: ${BACKEND_IMAGE} ==="
  DOCKER_BUILDKIT=1 docker build -t "$BACKEND_IMAGE" -f docker/backend.Dockerfile backend/
  IMAGES_BUILT=true
fi

if bool "$DEPLOY_FRONTEND"; then
  FRONTEND_DEPLOY_VERSION="${DEPLOY_NONCE}-frontend"
  FRONTEND_IMAGE="swr-frontend:${FRONTEND_DEPLOY_VERSION}"
  echo ""
  echo "=== Building frontend image: ${FRONTEND_IMAGE} ==="
  DOCKER_BUILDKIT=1 docker build \
    --build-arg NEXT_PUBLIC_APP_URL="${NEXT_PUBLIC_APP_URL}" \
    --build-arg NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL}" \
    -t "$FRONTEND_IMAGE" \
    -f docker/frontend.Dockerfile \
    frontend/
  IMAGES_BUILT=true
fi

if bool "$DEPLOY_NGINX"; then
  NGINX_DEPLOY_VERSION="${DEPLOY_NONCE}-nginx"
  NGINX_CONFIG_VERSION="$NGINX_DEPLOY_VERSION"
fi

echo ""
echo "=== Deployment decision ==="
echo "backend_image=${BACKEND_IMAGE}"
echo "frontend_image=${FRONTEND_IMAGE}"
echo "backend_deploy_version=${BACKEND_DEPLOY_VERSION}"
echo "frontend_deploy_version=${FRONTEND_DEPLOY_VERSION}"
echo "postgres_deploy_version=${POSTGRES_DEPLOY_VERSION}"
echo "nginx_deploy_version=${NGINX_DEPLOY_VERSION}"
echo "nginx_config_version=${NGINX_CONFIG_VERSION}"

if bool "$APPLY_STACK"; then
  echo ""
  echo "=== Applying stack spec ==="
  export BACKEND_IMAGE
  export FRONTEND_IMAGE
  export BACKEND_DEPLOY_VERSION
  export FRONTEND_DEPLOY_VERSION
  export POSTGRES_DEPLOY_VERSION
  export NGINX_DEPLOY_VERSION
  export NGINX_CONFIG_VERSION
  retry_command 3 docker stack deploy --resolve-image never -c docker/stack.yml "$STACK_NAME"
else
  if bool "$DEPLOY_BACKEND"; then
    echo ""
    echo "=== Updating backend service ==="
    retry_command 3 docker service update --image "$BACKEND_IMAGE" "${STACK_NAME}_backend"
  else
    echo "Skipping backend service update."
  fi

  if bool "$DEPLOY_FRONTEND"; then
    echo ""
    echo "=== Updating frontend service ==="
    retry_command 3 docker service update --image "$FRONTEND_IMAGE" "${STACK_NAME}_frontend"
  else
    echo "Skipping frontend service update."
  fi
fi

echo ""
echo "=== Waiting for services ==="
if bool "$APPLY_STACK"; then
  wait_for_service "${STACK_NAME}_backend" "2/2"
  wait_for_service "${STACK_NAME}_frontend" "2/2"
  wait_for_service "${STACK_NAME}_nginx" "1/1"
  wait_for_service "${STACK_NAME}_postgres" "1/1"
else
  if bool "$DEPLOY_BACKEND"; then
    wait_for_service "${STACK_NAME}_backend" "2/2"
  fi
  if bool "$DEPLOY_FRONTEND"; then
    wait_for_service "${STACK_NAME}_frontend" "2/2"
  fi
fi

if bool "$RUN_MIGRATIONS" && bool "$DEPLOY_BACKEND"; then
  run_migration_exec "$BACKEND_IMAGE"
fi

echo ""
echo "=== Stack services ==="
docker stack services "$STACK_NAME"

echo ""
echo "=== Service tasks ==="
STACK_PS_OUTPUT="$(docker stack ps "$STACK_NAME" --no-trunc 2>&1 || true)"
printf '%s\n' "$STACK_PS_OUTPUT" | sed -n '1,20p'

echo ""
echo "=== Health checks ==="
run_health_checks

if [[ "$IMAGES_BUILT" == true ]]; then
  docker image prune -f >/dev/null 2>&1 || true
fi

echo ""
echo "=== Smart deploy complete ==="
