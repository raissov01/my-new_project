# VPS Deployment Guide (DigitalOcean)

## Architecture

```text
Internet
    ↓
  Nginx (port 80/443)
    ├── /api/v1/*  → Go backend (port 5000)
    └── /*         → Next.js frontend (port 3000)
```

## Prerequisites

- Ubuntu 22.04+ VPS
- Docker Engine + Docker Compose plugin
- Optional: host Nginx + certbot if you want TLS outside containers

## Setup

### 1. Clone and prepare env files

```bash
git clone <repo> /opt/studywithraissov
cd /opt/studywithraissov
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

### 2. Configure production values

`frontend/.env`

```env
NEXT_PUBLIC_APP_URL=https://studywithraissov.com
NEXT_PUBLIC_API_URL=https://studywithraissov.com/api/v1
BACKEND_INTERNAL_TOKEN=replace-with-a-long-random-secret
```

`backend/.env`

```env
PORT=5000
ENVIRONMENT=production
CORS_ORIGINS=https://studywithraissov.com
DATABASE_URL=postgresql://...
JWT_SECRET=replace-with-a-long-random-secret
BACKEND_INTERNAL_TOKEN=replace-with-the-same-secret
OPENAI_API_KEY=
GEMINI_API_KEY=
```

### 3. Start the stack

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

### 4. Check health

```bash
docker compose -f docker/docker-compose.yml ps
docker compose -f docker/docker-compose.yml logs -f
```

### 5. TLS options

- Option A: terminate TLS on the host with `docker/nginx.host.conf` + certbot
- Option B: put Cloudflare or a load balancer in front of the droplet
- Option C: replace the nginx container with Traefik or Caddy

## Environment Strategy

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://studywithraissov.com` |
| `NEXT_PUBLIC_API_URL` | `https://studywithraissov.com/api/v1` |
| `BACKEND_URL` | `http://backend:5000` |
| `BACKEND_INTERNAL_TOKEN` | `<secret>` |

If `NEXT_PUBLIC_API_URL` is unset, the frontend falls back to `/api/v1` on the same host.
