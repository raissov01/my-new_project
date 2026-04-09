# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

---

## Project Overview

**StudyWithRaissov** — full-stack IELTS/flashcard learning platform.

- **Frontend:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4
- **Backend:** Go 1.25, Gin, GORM, PostgreSQL 16
- **Production:** Docker Swarm on VPS; CI/CD via GitHub Actions with smart deploy

---

## Commands

### Root (orchestrates both services)

```bash
npm run frontend:dev       # Next.js dev server → http://localhost:3000
npm run backend:dev        # Go API server → http://localhost:5000
npm run frontend:build     # next build --webpack
npm run backend:build      # go build -o ./bin/server ./cmd
npm run docker:up          # Start full local stack (postgres + nginx + services)
npm run docker:down
npm run docker:logs
```

### Frontend (`cd frontend`)

```bash
npm install        # install dependencies (no root-level install)
npm run dev
npm run build
npm run lint
```

### Backend (`cd backend`)

```bash
npm run dev        # go run ./cmd
npm run build      # go build -o ./bin/server ./cmd
npm run migrate    # go run ./cmd/migrate  (run DB migrations manually)
go test ./...      # run Go tests
```

---

## Local Setup

Requires Node.js 20.9+, Go 1.22+, PostgreSQL 15+.

**`frontend/.env.local`**
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
BACKEND_URL=http://localhost:5000
BACKEND_INTERNAL_TOKEN=<shared-secret>
GOOGLE_CLIENT_ID=<optional for OAuth>
GOOGLE_CLIENT_SECRET=<optional for OAuth>
GOOGLE_REDIRECT_URL=http://localhost:5000/api/v1/auth/google/callback
```

**`backend/.env`**
```
PORT=5000
ENVIRONMENT=development
DATABASE_URL=postgresql://studywithraissov:password@localhost:5432/studywithraissov?sslmode=disable
JWT_SECRET=<secret>
BACKEND_INTERNAL_TOKEN=<shared-secret>
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
```

Run migrations before first start: `npm run migrate` (from `backend/`).

---

## Architecture

### Request Flow

```
Client → Nginx (80/443)
       → Frontend (Next.js :3000)  — server components call backend with BACKEND_INTERNAL_TOKEN
       → Backend (Gin :5000)       — JWT auth, business logic
       → PostgreSQL (:5432)
```

Next.js server components communicate with the Go backend directly (server-to-server) using `BACKEND_INTERNAL_TOKEN`. Browser-side code hits `/api/v1/*` through the proxy.

### Frontend Structure (`frontend/src/`)

| Path | Purpose |
|------|---------|
| `app/(auth)/` | Login, signup, OAuth callback routes |
| `app/(main)/` | Protected application routes |
| `app/api/` | Next.js API routes |
| `features/` | Domain modules: `auth`, `study`, `ielts`, `sets`, `classes`, `ai`, `profile`, `settings` |
| `components/ui/` | Shared UI primitives |
| `server/integrations/` | Server-side backend API clients |
| `hooks/`, `lib/` | Utilities and custom hooks |
| `proxy.ts` | Thin wrapper used by server components to call the Go backend with `BACKEND_INTERNAL_TOKEN` |

### Backend Structure (`backend/internal/`)

| Path | Purpose |
|------|---------|
| `handler/` | Gin HTTP handlers + `routes.go` |
| `service/` | Business logic |
| `repository/` | GORM data access |
| `models/`, `model/` | DB models / schema |
| `auth/` | JWT + Google OAuth |
| `middleware/` | CORS, auth, error handling |
| `database/` | Connection pool, migrations |
| `config/` | Environment config loading |
| `email/`, `telegram/` | Integrations |

Additional binaries in `backend/cmd/`: `migrate/`, `telegram-auth/`, `telegram-import/`.

### Deployment

Production uses Docker Swarm (`docker/stack.yml`) with 2 replicas for frontend and backend. GitHub Actions (`deploy.yml`) runs `scripts/detect-smart-deploy.sh` to detect which services changed and only rebuilds/redeploys those. Pre-built images are pushed to GHCR and pulled on the VPS.

Smart deploy trigger files:
- Frontend rebuild: `frontend/**`, `docker/frontend.Dockerfile`
- Backend rebuild: `backend/**`, `docker/backend.Dockerfile`
- Migrations run: `backend/cmd/migrate/**`, `backend/migrations/**`, `backend/internal/models/**`
- Nginx redeploy: `docker/nginx.conf`
- Stack reapply: `docker/stack.yml`
