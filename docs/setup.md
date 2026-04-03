# StudyWithRaissov — Setup Instructions

## Prerequisites

- Node.js 20.9+
- npm
- Go 1.22+
- PostgreSQL 15+

## 1. Install dependencies

```bash
cd frontend && npm install
```

## 2. Configure environment variables

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
BACKEND_URL=http://localhost:5000
BACKEND_INTERNAL_TOKEN=replace-with-a-long-random-secret
```

Edit `backend/.env`:

```env
PORT=5000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
FRONTEND_URL=http://localhost:3000
DATABASE_URL=postgresql://studywithraissov:password@localhost:5432/studywithraissov?sslmode=disable
JWT_SECRET=replace-with-a-long-random-secret
BACKEND_INTERNAL_TOKEN=replace-with-a-long-random-secret
```

## 3. Create the database schema

Run the Go auto-migration once:

```bash
cd backend && npm run migrate
```

## 4. Start the dev servers

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
frontend/
├── src/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   └── proxy.ts
└── public/

backend/
├── cmd/
├── internal/
└── .env

docker/
├── frontend.Dockerfile
├── backend.Dockerfile
├── docker-compose.yml
└── nginx.conf
```

## Tech stack

| Layer      | Tool            |
| ---------- | --------------- |
| Framework  | Next.js 16 (App Router) |
| Styling    | Tailwind CSS    |
| Auth + DB  | Go API + PostgreSQL |
| Icons      | Lucide React    |
| Language   | TypeScript      |
