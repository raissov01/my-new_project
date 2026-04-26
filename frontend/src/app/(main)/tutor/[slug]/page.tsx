import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getScenario } from "@/features/tutor/api";
import { ChatInterface } from "@/components/tutor/ChatInterface";
import Link from "next/link";

export default async function TutorScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { slug } = await params;

  const scenario = await getScenario(slug);
  if (!scenario) notFound();

  return (
    <div className="page-shell py-4 sm:py-6">
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href="/tutor" className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            ← Scenario Library
          </Link>
          <span style={{ fontSize: 20 }} role="img">{scenario.icon ?? "💬"}</span>
          <h3 style={{ flex: 1 }}>{scenario.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11.5, color: "var(--ink-mute)", textTransform: "capitalize" }}>
            {scenario.category} · {scenario.level}
          </span>
        </div>
      </div>

      <ChatInterface scenario={scenario} />
    </div>
  );
}
