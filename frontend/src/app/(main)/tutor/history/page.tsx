import { redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getConversationHistory } from "@/features/tutor/api";
import Link from "next/link";
import { History } from "lucide-react";

export const metadata = { title: "Conversation History — AI Tutor" };

function ScoreChip({ label, value }: { label: string; value: number }) {
  const color = value >= 8 ? "text-green-600" : value >= 6 ? "text-amber-600" : "text-red-500";
  return (
    <span className={`text-xs font-medium ${color}`}>{label}: {value}</span>
  );
}

export default async function TutorHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const history = await getConversationHistory();

  return (
    <div className="page-shell py-8 space-y-6">
      <div className="flex items-center gap-3">
        <History className="h-7 w-7 text-[var(--primary)]" />
        <h1 className="text-2xl font-bold">Conversation History</h1>
      </div>

      {history.length === 0 ? (
        <div className="py-16 text-center space-y-3">
          <p className="text-[var(--text-secondary)]">No conversations yet.</p>
          <Link href="/tutor" className="inline-block rounded-[var(--radius-md)] bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90">
            Start your first scenario
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {history.map((entry) => {
            const scores = entry.finalScores;
            const date = new Date(entry.startedAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            return (
              <div key={entry.id} className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--bg-surface)] p-4 flex items-center gap-4 flex-wrap">
                <span className="text-2xl" role="img">{entry.scenario.icon ?? "💬"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{entry.scenario.title}</p>
                  <p className="text-xs text-[var(--text-secondary)] capitalize">{entry.scenario.category} · {entry.scenario.level} · {date}</p>
                  {scores && (
                    <div className="flex flex-wrap gap-3 mt-1">
                      <ScoreChip label="Fluency" value={scores.fluency} />
                      <ScoreChip label="Grammar" value={scores.grammar} />
                      <ScoreChip label="Vocab" value={scores.vocabulary} />
                      <ScoreChip label="Task" value={scores.task} />
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    entry.status === "completed" ? "bg-green-100 text-green-700"
                    : entry.status === "abandoned" ? "bg-gray-100 text-gray-500"
                    : "bg-blue-100 text-blue-700"
                  }`}>
                    {entry.status}
                  </span>
                  <Link href={`/tutor/${entry.scenario.slug}`} className="text-xs text-[var(--primary)] hover:underline">
                    Replay →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
