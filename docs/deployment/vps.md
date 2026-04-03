# VPS Deployment Guide

## Production Setup

This project is deployed to the VPS with Docker Swarm, not Docker Compose.

Runtime services:

- `swr_frontend`
- `swr_backend`
- `swr_nginx`
- `swr_postgres`

The server keeps `frontend/.env` and `backend/.env` on disk under:

```bash
/opt/studywithraissov
```

## First-Time Setup

```bash
git clone <repo> /opt/studywithraissov
cd /opt/studywithraissov
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
bash docker/swarm-init.sh
```

## Smart Deploy

Pushes to `main` trigger `.github/workflows/deploy.yml`.

The workflow:

1. Detects what changed.
2. Skips deploy if only docs or deploy-tooling changed.
3. Builds only changed runtime images.
4. Updates only changed services.
5. Applies `docker/stack.yml` only when stack-level runtime config changed.

## Manual Smart Deploy

If you need to run the selective deploy logic directly on the server:

```bash
cd /opt/studywithraissov
DEPLOY_FRONTEND=true \
DEPLOY_BACKEND=false \
DEPLOY_NGINX=false \
APPLY_STACK=false \
RUN_MIGRATIONS=false \
bash docker/smart-deploy.sh
```

## Manual Full Deploy

If you intentionally want a full runtime rollout:

```bash
cd /opt/studywithraissov
bash docker/swarm-deploy.sh
```

## Health Checks

```bash
docker stack services swr
docker stack ps swr --no-trunc
docker service logs swr_backend --tail 80
docker service logs swr_frontend --tail 80
curl -sf https://studywithraissov.com/health
curl -sf https://studywithraissov.com
```

## Runtime Config Notes

- Active production Nginx config: `docker/nginx.conf`
- `docker/nginx.host.conf` is an alternative host-nginx setup, not the active Swarm runtime path
- Active production stack file: `docker/stack.yml`
- `docker/docker-compose.yml` is kept for non-Swarm/local use and is not the current production deploy path
