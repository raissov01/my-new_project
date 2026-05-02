import { ListChecks } from "lucide-react";
import { AdminPageHeader, ComingSoon } from "../_components/coming-soon";

export const metadata = { title: "Quizzes — Admin" };

export default function AdminQuizzesPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader title="Quizzes" />
      <ComingSoon
        icon={ListChecks}
        body="Browse every quiz with playthrough counts, average score, and per-link traffic. Hide a quiz from public listings without deleting it."
      />
    </div>
  );
}
