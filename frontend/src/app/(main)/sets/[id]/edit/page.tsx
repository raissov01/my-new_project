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
    <div className="page-shell py-4 sm:py-6">
      {/* nd-mock-shell header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/sets/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} aria-hidden />
            {t("set.backToSet")}
          </Link>
          <h3>{t("set.editSet")}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 12 }}>
            {set.title}
          </span>
        </div>
      </div>

      {/* Header card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>{t("set.editSet")}</h1>
        <p style={{ fontSize: 13, color: "var(--ink-mute)", margin: 0 }}>
          {t("set.editSetSubtitle")}
        </p>
      </div>

      <EditSetClient
        setId={id}
        initialTitle={set.title}
        initialDescription={set.description ?? ""}
        initialCards={cards}
        initialIsPublic={set.isPublic}
        initialInvitedUsers=""
      />
    </div>
  );
}
