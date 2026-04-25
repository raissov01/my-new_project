import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getSetDetail } from "@/server/services/sets";
import { ChallengeClient } from "./client";

interface ChallengePageProps {
  params: Promise<{ id: string }>;
}

export default async function ChallengePage({ params }: ChallengePageProps) {
  const { id } = await params;
  const t = createTranslator(await getServerLocale());
  const setDetail = await getSetDetail(id, "anonymous");
  const set = setDetail
    ? {
        id: setDetail.id,
        title: setDetail.title,
        description: setDetail.description,
        is_public: setDetail.isPublic,
      }
    : null;
  const flashcards = setDetail?.flashcards ?? [];

  if (!set || flashcards.length === 0) {
    notFound();
  }

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* nd-mock-shell header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Link href={`/sets/${id}`} className="nd-btn-soft" style={{ fontSize: 13, padding: "8px 14px" }}>
            <ArrowLeft className="h-4 w-4" style={{ display: "inline", marginRight: 6 }} />
            {t("challenge.backToSet")}
          </Link>
          <h3>{set.title}</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", color: "var(--ink-mute)", fontSize: 12 }}>
            {set.is_public ? t("challenge.publicChallenge") : t("challenge.privateChallenge")}
          </span>
        </div>
      </div>

      {/* Set info card */}
      <div style={{ background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 18, padding: "20px 24px", marginBottom: 18 }}>
        <p style={{ fontSize: 11, fontWeight: 500, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-mute)", marginBottom: 8 }}>
          {set.is_public ? t("challenge.publicChallenge") : t("challenge.privateChallenge")}
        </p>
        <h1 style={{ fontSize: 24, fontWeight: 600, color: "var(--ink)", marginBottom: set.description ? 10 : 0 }}>
          {set.title}
        </h1>
        {set.description && (
          <p style={{ fontSize: 14, lineHeight: 1.7, color: "var(--ink-mute)", margin: 0 }}>
            {set.description}
          </p>
        )}
      </div>

      <ChallengeClient
        flashcards={flashcards}
        setId={id}
        rankingHref={`/sets/${id}/ranking`}
      />
    </div>
  );
}
