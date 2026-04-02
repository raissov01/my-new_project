# StudyWithRaissov — Setup Instructions

## Prerequisites

- Node.js 18+
- npm
- Go 1.22+
- A [Supabase](https://supabase.com) account (free tier works)

## 1. Install dependencies

```bash
cd frontend && npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Copy your **Project URL** and **anon public** key from **Settings → API**.

## 3. Configure environment variables

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:5000/api/v1
BACKEND_URL=http://localhost:5000
BACKEND_INTERNAL_TOKEN=replace-with-a-long-random-secret
```

Edit `backend/.env`:

```env
PORT=5000
ENVIRONMENT=development
CORS_ORIGINS=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@db.your-project.supabase.co:6543/postgres
DIRECT_URL=postgresql://postgres:password@db.your-project.supabase.co:5432/postgres
BACKEND_INTERNAL_TOKEN=replace-with-a-long-random-secret
```

## 4. Run the database migration

Open the **SQL Editor** in your Supabase dashboard and paste the contents of:

```
supabase/migrations/001_initial_schema.sql
```

Run it. This creates the `profiles`, `flashcard_sets`, and `flashcards` tables with Row-Level Security policies and triggers.

## 5. Enable authentication providers

In Supabase Dashboard → **Authentication → Providers**:

- **Email** — enable (already on by default)
- (Optional) **Google**, **GitHub**, etc.

Set the **Site URL** to `http://localhost:3000` and add `http://localhost:3000/callback` as a **Redirect URL**.

For production deployment, update these to your real domain as well:

- **Site URL**: `https://studywithraissov.com`
- **Redirect URL**: `https://studywithraissov.com/callback`

## 6. Start the dev servers

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
| Auth + DB  | Supabase        |
| Icons      | Lucide React    |
| Language   | TypeScript      |
