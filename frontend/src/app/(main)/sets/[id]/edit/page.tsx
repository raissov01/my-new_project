import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/server/auth";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getSetDetail } from "@/server/services/sets";
import { EditSetClient } from "./client";

interface EditSetPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditSetPage({ params }: EditSetPageProps) {
  const { id } = await params;
  const t = createTranslator(await getServerLocale());
  const user = await getCurrentUser();
  const set = await getSetDetail(id, user?.id);
  if (!set) {
    notFound();
  }

  // Only the owner can edit
  if (set.userId !== user?.id) {
    redirect(`/sets/${id}`);
  }

  const cards = set.flashcards.map((fc) => ({
    id: fc.id,
    term: fc.term,
    definition: fc.definition,
  }));

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        href={`/sets/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("set.backToSet")}
      </Link>

      <div className="mt-6 rounded-[2rem] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 sm:p-8 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">{t("set.editSet")}</h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">
          {t("set.editSetSubtitle")}
        </p>
      </div>

      <div className="mt-8">
        <EditSetClient
          setId={id}
          initialTitle={set.title}
          initialDescription={set.description ?? ""}
          initialCards={cards}
          initialIsPublic={set.isPublic}
          initialInvitedUsers=""
        />
      </div>
    </div>
  );
}
