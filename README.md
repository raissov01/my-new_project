# FlashLearn

FlashLearn is a modern education platform for students and teachers built with Next.js App Router, TypeScript, and Tailwind CSS. It is structured for Vercel deployment today and prepared for future AI features like generating flashcards from PDF and Word documents.

## File Structure

```text
.
├── .env.example
├── DEPLOY.md
├── package.json
├── prisma/
│   └── schema.prisma
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   └── actions.ts
│   │   ├── (main)/
│   │   │   ├── student/
│   │   │   ├── teacher/
│   │   │   ├── sets/
│   │   │   ├── profile/
│   │   │   └── settings/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── auth/
│   │   ├── flashcards/
│   │   ├── layout/
│   │   ├── profile/
│   │   ├── settings/
│   │   ├── study/
│   │   └── ui/
│   ├── hooks/
│   ├── lib/
│   │   ├── ai/
│   │   ├── classrooms.ts
│   │   ├── class-challenges.ts
│   │   ├── i18n/
│   │   └── supabase/
│   ├── proxy.ts
│   └── types/
├── supabase/
│   ├── combined_schema.sql
│   └── migrations/
└── tsconfig.json
```

## Code File By File

This is the fastest way to understand the project as a beginner:

- `src/app/page.tsx`
  Landing page UI. This is the public homepage.

- `src/app/(auth)/login/page.tsx`
  Login screen route.

- `src/app/(auth)/signup/page.tsx`
  Registration screen route.

- `src/app/(auth)/actions.ts`
  Server actions for login, signup, and logout.

- `src/components/auth/login-form.tsx`
  Login form UI component.

- `src/components/auth/signup-form.tsx`
  Signup form UI component with required student or teacher role selection.

- `src/app/(main)/student/dashboard/page.tsx`
  Student dashboard UI.

- `src/app/(main)/teacher/dashboard/page.tsx`
  Teacher dashboard UI.

- `src/app/(main)/student/classes/page.tsx`
  Student classroom join and class overview screen.

- `src/app/(main)/teacher/classes/page.tsx`
  Teacher class creation and management screen.

- `src/app/(main)/teacher/classes/[id]/page.tsx`
  Teacher class detail page with assignments, challenges, and progress.

- `src/app/(main)/student/challenges/page.tsx`
  Student private challenge list.

- `src/app/(main)/teacher/challenges/page.tsx`
  Teacher challenge management page.

- `src/components/layout/navbar.tsx`
  Shared navigation across logged-in pages.

- `src/components/ui/`
  Reusable low-level UI building blocks like buttons, inputs, modal, toast, language switcher, and theme toggle.

- `src/lib/supabase/`
  Supabase server/client helpers and session middleware.

- `src/lib/ai/index.ts`
  AI feature flags and shared AI types for future integrations.

- `src/lib/ai/document-import.ts`
  Placeholder service boundary for future PDF and Word to flashcard generation.

- `supabase/migrations/`
  SQL migrations for auth-related profiles, classes, challenges, rankings, and storage policies.

## Local Setup

1. Install Node.js.
   Use Node.js `20` or newer.

2. Open the project folder in your terminal.

3. Install dependencies:

```bash
npm install
```

4. Create your environment file:

```bash
cp .env.example .env.local
```

5. Open `.env.local` and fill in your values.
   At minimum for Supabase later:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

6. Start the development server:

```bash
npm run dev
```

7. Open your browser:

```text
http://localhost:3000
```

8. Check the production build locally:

```bash
npm run build
```

If the build succeeds, the project is in a good state for Vercel deployment.

## GitHub Push

1. Create a new repository on GitHub.

2. In your project folder, initialize Git if needed:

```bash
git init
```

3. Add all files:

```bash
git add .
```

4. Make your first commit:

```bash
git commit -m "Initial FlashLearn platform"
```

5. Connect your GitHub repository:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
```

6. Push the code:

```bash
git branch -M main
git push -u origin main
```

## Vercel Deployment

1. Go to [https://vercel.com](https://vercel.com).

2. Sign in with GitHub.

3. Click `Add New...` then `Project`.

4. Import your GitHub repository.

5. Keep the default framework as `Next.js`.

6. Open the environment variable section and add:

- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_BACKEND_URL` only if you use a separate backend service
- `OPENAI_API_KEY` later when you add AI features

7. Click `Deploy`.

8. After deployment finishes, copy your Vercel URL.

9. If using Supabase:
   Add the deployed URL to Supabase Auth settings as your site URL and redirect URL.

10. Redeploy if you update environment variables.

## Useful Commands

```bash
npm install
npm run dev
npm run build
npm run start
```

## Deployment Notes

More detailed deployment notes are in [DEPLOY.md](./DEPLOY.md).
