# FlashLearn — Setup Instructions

## Prerequisites

- Node.js 18+
- npm
- A [Supabase](https://supabase.com) account (free tier works)

## 1. Install dependencies

```bash
npm install
```

## 2. Create a Supabase project

1. Go to [supabase.com/dashboard](https://supabase.com/dashboard) and create a new project.
2. Copy your **Project URL** and **anon public** key from **Settings → API**.

## 3. Configure environment variables

Edit `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
# Optional: only if you want to use the Go leaderboard API in production
# NEXT_PUBLIC_BACKEND_URL=https://your-backend.example.com
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

- **Site URL**: `https://your-app.vercel.app`
- **Redirect URL**: `https://your-app.vercel.app/callback`

## 6. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
src/
├── app/
│   ├── (auth)/           # Login, signup, OAuth callback
│   │   ├── login/
│   │   ├── signup/
│   │   └── callback/
│   ├── (main)/           # Authenticated app pages
│   │   ├── dashboard/
│   │   └── sets/
│   │       ├── new/
│   │       └── [id]/
│   │           ├── edit/
│   │           └── study/
│   ├── layout.tsx
│   └── page.tsx          # Landing page
├── components/
│   ├── ui/               # Button, Input, Card, Modal
│   ├── auth/             # Auth forms
│   ├── flashcards/       # Flashcard components
│   ├── layout/           # Navbar, Footer
│   └── study/            # Study mode components
├── hooks/                # Custom React hooks
├── lib/
│   ├── supabase/         # Client, server, middleware helpers
│   └── utils.ts          # Shared utilities
├── types/
│   └── database.ts       # Supabase DB types
└── middleware.ts          # Route protection
```

## Tech stack

| Layer      | Tool            |
| ---------- | --------------- |
| Framework  | Next.js 15 (App Router) |
| Styling    | Tailwind CSS    |
| Auth + DB  | Supabase        |
| Icons      | Lucide React    |
| Language   | TypeScript      |
