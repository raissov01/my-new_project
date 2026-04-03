#!/usr/bin/env bash
set -euo pipefail

BASE_REF=""
HEAD_REF="HEAD"
GITHUB_OUTPUT_FILE=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="${2:-}"
      shift 2
      ;;
    --head)
      HEAD_REF="${2:-}"
      shift 2
      ;;
    --github-output)
      GITHUB_OUTPUT_FILE="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      exit 1
      ;;
  esac
done

if [[ -z "$BASE_REF" || "$BASE_REF" =~ ^0+$ ]] || ! git rev-parse --verify "${BASE_REF}^{commit}" >/dev/null 2>&1; then
  BASE_REF="$(git rev-parse "${HEAD_REF}^" 2>/dev/null || true)"
fi

if [[ -z "$BASE_REF" ]] || ! git rev-parse --verify "${BASE_REF}^{commit}" >/dev/null 2>&1; then
  BASE_REF="$(git hash-object -t tree /dev/null)"
fi

mapfile -t CHANGED_FILES < <(git diff --name-only "$BASE_REF" "$HEAD_REF" | sed '/^$/d')

FRONTEND_FILES=()
BACKEND_FILES=()
MIGRATION_FILES=()
NGINX_FILES=()
STACK_FILES=()
TOOLING_FILES=()
DOC_FILES=()
UNKNOWN_FILES=()

for file in "${CHANGED_FILES[@]}"; do
  case "$file" in
    frontend/*|docker/frontend.Dockerfile)
      FRONTEND_FILES+=("$file")
      ;;
    backend/*|docker/backend.Dockerfile)
      BACKEND_FILES+=("$file")
      ;;
    docker/nginx.conf)
      NGINX_FILES+=("$file")
      ;;
    docker/stack.yml)
      STACK_FILES+=("$file")
      ;;
    docs/*|README.md|CLAUDE.md|AGENTS.md)
      DOC_FILES+=("$file")
      ;;
    .github/*|.claude/*|docker/swarm-deploy.sh|docker/deploy.sh|docker/swarm-init.sh|docker/docker-compose.yml|docker/nginx.host.conf|package.json|package-lock.json)
      TOOLING_FILES+=("$file")
      ;;
    *)
      UNKNOWN_FILES+=("$file")
      ;;
  esac

  case "$file" in
    backend/cmd/migrate/*|backend/internal/database/migrate.go|backend/internal/models/*|backend/migrations/*|migrations/*)
      MIGRATION_FILES+=("$file")
      ;;
  esac
done

DEPLOY_FRONTEND=false
DEPLOY_BACKEND=false
DEPLOY_NGINX=false
APPLY_STACK=false
RUN_MIGRATIONS=false
SKIP_DEPLOY=false
SAFE_FALLBACK_FULL_DEPLOY=false

if [[ ${#FRONTEND_FILES[@]} -gt 0 ]]; then
  DEPLOY_FRONTEND=true
fi

if [[ ${#BACKEND_FILES[@]} -gt 0 ]]; then
  DEPLOY_BACKEND=true
fi

if [[ ${#MIGRATION_FILES[@]} -gt 0 ]]; then
  RUN_MIGRATIONS=true
  DEPLOY_BACKEND=true
fi

if [[ ${#NGINX_FILES[@]} -gt 0 ]]; then
  DEPLOY_NGINX=true
  APPLY_STACK=true
fi

if [[ ${#STACK_FILES[@]} -gt 0 ]]; then
  APPLY_STACK=true
fi

if [[ ${#UNKNOWN_FILES[@]} -gt 0 ]]; then
  SAFE_FALLBACK_FULL_DEPLOY=true
  DEPLOY_FRONTEND=true
  DEPLOY_BACKEND=true
  DEPLOY_NGINX=true
  APPLY_STACK=true
  if [[ ${#MIGRATION_FILES[@]} -gt 0 ]]; then
    RUN_MIGRATIONS=true
  fi
fi

if [[ "$DEPLOY_FRONTEND" == false && "$DEPLOY_BACKEND" == false && "$DEPLOY_NGINX" == false && "$APPLY_STACK" == false ]]; then
  SKIP_DEPLOY=true
fi

join_lines() {
  local -n arr_ref="$1"
  if [[ ${#arr_ref[@]} -eq 0 ]]; then
    return
  fi

  printf '%s\n' "${arr_ref[@]}"
}

to_base64() {
  if [[ $# -gt 0 ]]; then
    printf '%s' "$1"
  else
    cat
  fi | base64 | tr -d '\n'
}

SUMMARY="$(cat <<EOF
Smart deploy analysis
- Base ref: $BASE_REF
- Head ref: $HEAD_REF
- Changed files: ${#CHANGED_FILES[@]}
- Frontend deploy: $DEPLOY_FRONTEND
- Backend deploy: $DEPLOY_BACKEND
- Nginx deploy: $DEPLOY_NGINX
- Stack apply: $APPLY_STACK
- Run migrations: $RUN_MIGRATIONS
- Skip deploy: $SKIP_DEPLOY
- Safe fallback full deploy: $SAFE_FALLBACK_FULL_DEPLOY
EOF
)"

echo "$SUMMARY"

if [[ ${#CHANGED_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Changed files:"
  join_lines CHANGED_FILES | sed 's/^/- /'
fi

if [[ ${#FRONTEND_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Frontend-affecting files:"
  join_lines FRONTEND_FILES | sed 's/^/- /'
fi

if [[ ${#BACKEND_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Backend-affecting files:"
  join_lines BACKEND_FILES | sed 's/^/- /'
fi

if [[ ${#MIGRATION_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Migration-affecting files:"
  join_lines MIGRATION_FILES | sed 's/^/- /'
fi

if [[ ${#NGINX_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Nginx runtime files:"
  join_lines NGINX_FILES | sed 's/^/- /'
fi

if [[ ${#STACK_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Stack runtime files:"
  join_lines STACK_FILES | sed 's/^/- /'
fi

if [[ ${#DOC_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Docs-only files:"
  join_lines DOC_FILES | sed 's/^/- /'
fi

if [[ ${#TOOLING_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Deploy-tooling/non-runtime files:"
  join_lines TOOLING_FILES | sed 's/^/- /'
fi

if [[ ${#UNKNOWN_FILES[@]} -gt 0 ]]; then
  echo ""
  echo "Unknown files (safe fallback = full app + infra deploy):"
  join_lines UNKNOWN_FILES | sed 's/^/- /'
fi

if [[ -n "$GITHUB_OUTPUT_FILE" ]]; then
  {
    echo "skip_deploy=$SKIP_DEPLOY"
    echo "deploy_frontend=$DEPLOY_FRONTEND"
    echo "deploy_backend=$DEPLOY_BACKEND"
    echo "deploy_nginx=$DEPLOY_NGINX"
    echo "apply_stack=$APPLY_STACK"
    echo "run_migrations=$RUN_MIGRATIONS"
    echo "safe_fallback_full_deploy=$SAFE_FALLBACK_FULL_DEPLOY"
    echo "changed_files_b64=$(join_lines CHANGED_FILES | to_base64)"
    echo "summary_b64=$(printf '%s\n' "$SUMMARY" | to_base64)"
  } >> "$GITHUB_OUTPUT_FILE"
fi
