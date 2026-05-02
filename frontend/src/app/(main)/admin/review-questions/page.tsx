import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { fetchBackendJson } from "@/server/integrations/go-backend/server";
import { ReviewClient } from "./ReviewClient";

export const metadata = { title: "Review Questions — Admin" };

interface PendingQuestion {
  level: string;
  category: string;
  format: string;
  prompt: string;
  correctAnswer: string;
  distractors?: string[];
  explanation?: string;
}

export default async function ReviewQuestionsPage() {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);
  if (!auth.user) redirect("/login");

  let questions: PendingQuestion[] = [];
  let files: string[] = [];

  try {
    const data = await fetchBackendJson<{ questions: PendingQuestion[]; files: string[] }>({
      path: "/api/v1/admin/review-questions",
      userId: auth.user.id,
    });
    questions = data.questions ?? [];
    files = data.files ?? [];
  } catch {
    /* seed dir may not exist yet */
  }

  return (
    <div className="page-shell py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Question Bank Review</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">
          {questions.length} pending question{questions.length !== 1 ? "s" : ""} across {files.length} file{files.length !== 1 ? "s" : ""}
        </p>
      </div>

      {questions.length === 0 ? (
        <div className="py-16 text-center space-y-3 text-[var(--text-secondary)]">
          <p>No questions pending review.</p>
          <p className="text-xs">
            Run: <code className="rounded bg-[var(--bg-soft)] px-2 py-1">npx tsx scripts/generate-questions.ts --level=B1 --format=fill_blank --count=20</code>
          </p>
        </div>
      ) : (
        <ReviewClient questions={questions} />
      )}
    </div>
  );
}
