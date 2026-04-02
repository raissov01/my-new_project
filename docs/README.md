# StudyWithRaissov

StudyWithRaissov is split into a dedicated Next.js frontend, a Go backend API, and a separate Docker deployment layer.

## Top-Level Structure

```text
.
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── backend/
│   ├── .env.example
│   ├── cmd/
│   ├── internal/
│   └── package.json
├── docker/
│   ├── backend.Dockerfile
│   ├── deploy.sh
│   ├── docker-compose.yml
│   ├── frontend.Dockerfile
│   ├── nginx.conf
│   └── nginx.host.conf
├── docs/
│   ├── README.md
│   ├── setup.md
│   └── deployment/
├── frontend/
│   ├── .env.example
│   ├── package.json
│   ├── public/
│   └── src/
└── package.json
```

## Key Areas

- `frontend/src/app/`
  Route tree, layouts, and page-level composition.

- `frontend/src/components/`
  Global UI primitives, layout chrome, and providers.

- `frontend/src/features/`
  Feature-scoped frontend modules.

- `frontend/src/server/`
  Next.js server-side composition and backend bridge code used by the frontend package.

- `backend/internal/`
  Go handlers, services, repositories, middleware, and models.

- `docker/`
  Compose, Dockerfiles, and Nginx config for local and production deployment.

## Local Setup

```bash
cp frontend/.env.example frontend/.env.local
cp backend/.env.example backend/.env
npm --prefix frontend install
cd backend && npm run dev
cd frontend && npm run dev
```

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:5000`.

## Useful Commands

```bash
npm run frontend:dev
npm run backend:dev
npm run frontend:build
npm run backend:build
npm run docker:up
npm run docker:down
```

## Deployment Docs

- [deployment/overview.md](./deployment/overview.md)
- [deployment/vps.md](./deployment/vps.md)
