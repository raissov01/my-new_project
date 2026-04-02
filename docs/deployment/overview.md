# Deploy Notes

## Recommended Hosting Setup

- Frontend: Next.js container in `frontend/`
- Backend: Go API server in `backend/`
- Reverse proxy / TLS: Nginx in `docker/`
- Authentication and database: Go backend + PostgreSQL
- Orchestration: Docker Compose

## Before You Deploy

Make sure these commands work locally:

```bash
npm --prefix frontend run build
npm --prefix backend run build
npm run docker:up
```

## Production Environment Files

Set production values in:

- `frontend/.env`
- `backend/.env`

Important variables:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_URL`
- `BACKEND_URL`
- `BACKEND_INTERNAL_TOKEN`
- `DATABASE_URL`
- `JWT_SECRET`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

## DigitalOcean Deployment

1. SSH into your droplet.
2. Clone or update the repository on the server.
3. Fill in `frontend/.env` and `backend/.env`.
4. Run `npm run docker:up`.
5. Verify the containers with `docker compose -f docker/docker-compose.yml ps`.
6. Put SSL in front of the stack with certbot on the host, Cloudflare, or your preferred edge layer.

## Database Setup After Deploy

1. Provision PostgreSQL.
2. Set `DATABASE_URL` in `backend/.env`.
3. Run `npm --prefix backend run migrate` once if the database is empty.

## Updating The App Later

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

## AI Areas

Frontend AI UI:

- `frontend/src/features/ai/components/`
- `frontend/src/lib/client/ai.ts`

Backend AI processing:

- `backend/internal/handler/ai.go`
