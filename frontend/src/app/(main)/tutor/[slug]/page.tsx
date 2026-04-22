import { notFound } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getScenario } from "@/features/tutor/api";
import { ChatInterface } from "@/components/tutor/ChatInterface";
import Link from "next/link";

export default async function TutorScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  await getCurrentUser();
  const { slug } = await params;

  const scenario = await getScenario(slug);
  if (!scenario) notFound();

  return (
    <div className="page-shell py-8">
      <Link href="/tutor" className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
        ← Scenario Library
      </Link>

      <div className="mb-6 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-2xl" role="img">{scenario.icon ?? "💬"}</span>
          <h1 className="text-xl font-bold">{scenario.title}</h1>
        </div>
        <p className="text-sm text-[var(--text-secondary)] capitalize">{scenario.category} · {scenario.level}</p>
      </div>

      <ChatInterface scenario={scenario} />
    </div>
  );
}
