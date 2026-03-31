# Deploy Notes

## Recommended stack

- Frontend/app: Vercel Hobby
- Database/Auth/Storage: Supabase Free
- Optional Go API: only deploy if you specifically want the standalone leaderboard service

## Why this is enough for a small launch

This app is a standard Next.js App Router project with Supabase-backed auth, database reads/writes, and small avatar uploads. For a private MVP or early launch with around 20 active users, the default Vercel Hobby and Supabase Free tiers are typically enough.

## Required environment variables in Vercel

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL` only if you deploy the Go backend separately

## Supabase production settings

In Supabase Dashboard:

- Set **Site URL** to your deployed Vercel domain
- Add `https://your-domain/callback` to **Redirect URLs**
- Run all SQL files in `supabase/migrations/` if you have not already
- Make sure the `avatars` storage bucket from `supabase/migrations/009_avatar_storage.sql` exists

## Deploy path

1. Push the repo to GitHub.
2. Import the repo into Vercel.
3. Add the required environment variables.
4. Trigger a deploy.
5. Copy the final Vercel URL into Supabase Auth settings.

## Optional Go backend

The app already falls back to a Next.js server action if the Go leaderboard backend is unreachable. That means you can ship the app on Vercel without deploying the Go service first.
