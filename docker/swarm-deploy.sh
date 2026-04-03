#!/usr/bin/env bash
set -euo pipefail

# StudyWithRaissov — full Swarm deploy wrapper.
# This keeps the old entrypoint, but now routes through the smart deploy logic.

DEPLOY_FRONTEND=true \
DEPLOY_BACKEND=true \
DEPLOY_NGINX=true \
APPLY_STACK=true \
RUN_MIGRATIONS=true \
bash docker/smart-deploy.sh
