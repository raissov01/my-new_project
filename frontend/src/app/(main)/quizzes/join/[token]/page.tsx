export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { getCurrentUser } from "@/server/auth";

interface JoinPageProps {
  params: Promise<{ token: string }>;
}

type UseResult =
  | { valid: true; quizId: string; quizTitle: string }
  | { valid: false; reason: string };

export default async function JoinQuizPage({ params }: JoinPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    const { token } = await params;
    redirect(`/login?next=/quizzes/join/${encodeURIComponent(token)}`);
  }

  const { token } = await params;
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  let result: UseResult;
  try {
    result = await fetchBackendJson<UseResult>({
      path: `/api/v1/quiz-invite/${encodeURIComponent(token)}/use`,
      userId: user.id,
      method: "POST",
    });
  } catch {
    result = { valid: false, reason: "expired" };
  }

  if (result.valid) {
    const cookieStore = await cookies();
    cookieStore.set(`quiz_invite_${result.quizId}`, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    redirect(`/quizzes/${encodeURIComponent(result.quizId)}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-20">
      <div className="w-full max-w-md rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-8 text-center shadow-[var(--shadow-xl)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10">
          <AlertCircle className="h-7 w-7 text-red-500" />
        </div>
        <h2 className="mt-4 text-xl font-semibold text-[var(--text-primary)]">
          {t("quiz.invite.expiredTitle")}
        </h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("quiz.invite.expiredBody")}
        </p>
        <Link
          href="/quizzes"
          className="mt-6 inline-flex items-center gap-2 rounded-[var(--radius-lg)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white"
        >
          {t("quiz.backToLibrary")}
        </Link>
      </div>
    </div>
  );
}
