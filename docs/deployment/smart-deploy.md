# Smart Deploy Logic

## Runtime Decision Rules

The deploy detector classifies changed files into runtime buckets.

### Frontend deploy

Triggered by:

- `frontend/**`
- `docker/frontend.Dockerfile`

Action:

- build a new frontend image
- update only `swr_frontend`

### Backend deploy

Triggered by:

- `backend/**`
- `docker/backend.Dockerfile`

Action:

- build a new backend image
- update only `swr_backend`

### Migration step

Triggered by:

- `backend/cmd/migrate/**`
- `backend/internal/database/migrate.go`
- `backend/internal/models/**`
- `backend/migrations/**`
- `migrations/**`

Action:

- update backend
- run the dedicated `./migrate` binary inside a backend task

### Nginx runtime deploy

Triggered by:

- `docker/nginx.conf`

Action:

- apply the Swarm stack
- rotate only the nginx config object/version

### Stack/runtime infra apply

Triggered by:

- `docker/stack.yml`

Action:

- apply the Swarm stack with the current images for unchanged services
- update only services whose stack spec actually changed

### Skip deploy completely

Triggered by docs or deploy-tooling only, for example:

- `docs/**`
- `README.md`
- `CLAUDE.md`
- `AGENTS.md`
- `.github/**`
- `.claude/**`
- `docker/swarm-deploy.sh`
- `docker/deploy.sh`
- `docker/docker-compose.yml`
- `docker/swarm-init.sh`
- `docker/nginx.host.conf`
- root `package.json`

## Safe Fallback

If a changed file does not match any known bucket, the detector chooses a safe fallback:

- deploy frontend
- deploy backend
- apply the stack
- redeploy nginx

This avoids silently skipping a potentially important runtime change.
