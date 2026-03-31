# Deploy Notes

## Recommended Hosting Setup

- Frontend: Vercel
- Authentication and database: Supabase
- AI provider later: OpenAI or another LLM provider
- Optional standalone backend: only if you need one later

## Before You Deploy

Make sure these commands work locally:

```bash
npm install
npm run dev
npm run build
```

## Environment Variables For Vercel

Add these in the Vercel project settings:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL` only if you use a separate backend
- `OPENAI_API_KEY` only when you add AI features
- `AI_DOCUMENT_IMPORT_ENABLED` optional, default is `false`
- `AI_MAX_UPLOAD_MB` optional

## Step-by-Step Vercel Deployment

1. Push your code to GitHub.
2. Open Vercel and create a new project.
3. Import the GitHub repository.
4. Confirm that Vercel detects `Next.js`.
5. Add your environment variables.
6. Click `Deploy`.
7. Wait for the first production build to finish.
8. Open the live domain Vercel gives you.

## Supabase Setup After Deploy

If you are connecting Supabase:

1. Open your Supabase project dashboard.
2. Go to Authentication settings.
3. Set the site URL to your Vercel production domain.
4. Add redirect URLs such as:

```text
https://your-domain.vercel.app/callback
```

5. Run the SQL files in `supabase/migrations/` if your database is still empty.

## When You Update The App Later

If you push to the connected GitHub branch again, Vercel automatically creates a new deployment.

## Future AI Features

The project is already prepared for future AI document ingestion.
The placeholder code lives in:

- `src/lib/ai/index.ts`
- `src/lib/ai/document-import.ts`

Later you can connect:

- PDF upload
- Word upload
- text extraction
- LLM flashcard generation
- review and approval UI
