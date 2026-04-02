# Deploy Notes

## Recommended Hosting Setup

- Frontend: Next.js container in `frontend/`
- Backend: Go API server in `backend/`
- Reverse proxy / TLS: Nginx in `docker/`
- Authentication and database: Supabase
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
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`
- `BACKEND_URL`
- `BACKEND_INTERNAL_TOKEN`
- `DATABASE_URL`
- `DIRECT_URL`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`

## DigitalOcean Deployment

1. SSH into your droplet.
2. Clone or update the repository on the server.
3. Fill in `frontend/.env` and `backend/.env`.
4. Run `npm run docker:up`.
5. Verify the containers with `docker compose -f docker/docker-compose.yml ps`.
6. Put SSL in front of the stack with certbot on the host, Cloudflare, or your preferred edge layer.

## Supabase Setup After Deploy

In your Supabase dashboard:

1. Set the site URL to your production domain.
2. Add callback URLs such as `https://studywithraissov.com/callback`.
3. Run the SQL files in `supabase/migrations/` if the database is empty.

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
