import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "@/server/auth";
import { getListeningClip } from "@/features/listening/api";
import { ClipWizard } from "@/components/listening/ClipWizard";
import { Headphones } from "lucide-react";
import Link from "next/link";

export default async function ClipPage({
  params,
}: {
  params: Promise<{ clipId: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { clipId } = await params;

  const data = await getListeningClip(clipId);
  if (!data?.clip) notFound();

  const { clip, questions } = data;

  return (
    <div className="page-shell py-8">
      {/* Back */}
      <Link
        href="/listen"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        ← Listening Library
      </Link>

      {/* Header */}
      <div className="mb-8 space-y-1">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[var(--bg-soft)] px-2 py-0.5 text-xs font-semibold text-[var(--text-secondary)]">
            {clip.level}
          </span>
          {clip.sourcePodcast && (
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Headphones className="h-3 w-3" />
              {clip.sourcePodcast}
            </span>
          )}
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{clip.title}</h1>
        <p className="text-sm text-[var(--text-secondary)] capitalize">Topic: {clip.topic}</p>
      </div>

      {/* 5-Stage Wizard */}
      <ClipWizard clip={clip} questions={questions} />
    </div>
  );
}
