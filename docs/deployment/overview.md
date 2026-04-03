# Deploy Notes

## Production Architecture

- Orchestration: Docker Swarm
- Frontend: Next.js service in `frontend/`
- Backend: Go API service in `backend/`
- Reverse proxy / TLS: Nginx container from `docker/nginx.conf`
- Database: PostgreSQL service in the Swarm stack
- CI/CD: GitHub Actions workflow in `.github/workflows/deploy.yml`

## Current Production Flow

Production deploys happen on pushes to `main`.

The workflow now uses a smart deploy pipeline:

1. Detect which runtime areas changed.
2. Skip deploy completely if only docs or deploy-tooling changed.
3. Build and redeploy only the affected runtime services.
4. Apply the Swarm stack only when stack-level runtime config changed.
5. Run the dedicated migration step only when migration-related backend files changed.

## Local Verification Before Push

```bash
npm --prefix frontend run build
npm --prefix backend run build
```

## Key Production Files

- `.github/workflows/deploy.yml`
- `scripts/detect-smart-deploy.sh`
- `docker/smart-deploy.sh`
- `docker/swarm-deploy.sh`
- `docker/stack.yml`

## Manual Full Deploy

If you need a deliberate full Swarm rollout from the server:

```bash
cd /opt/studywithraissov
bash docker/swarm-deploy.sh
```

That wrapper now routes through the same smart deploy engine, but forces frontend, backend, nginx, stack apply, and migrations.
