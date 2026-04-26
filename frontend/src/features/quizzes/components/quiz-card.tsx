"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Users, Target, Timer, Pencil, Play } from "lucide-react";
import { formatDate } from "@/lib/shared/utils";
import { type Locale, createTranslator } from "@/lib/shared/i18n";
import type { QuizOverview } from "@/server/services/quizzes";

const COVER_GRADIENTS = [
  "linear-gradient(135deg,#C2500A,#8F3A05)",
  "linear-gradient(135deg,#2563eb,#1B47B8)",
  "linear-gradient(135deg,#3F7D3F,#2E5F2E)",
  "linear-gradient(135deg,#E9B949,#B8801A)",
  "linear-gradient(135deg,#1B1714,#3D342C)",
  "linear-gradient(135deg,#C2425C,#8F2F45)",
];

interface QuizCardProps {
  quiz: QuizOverview;
  locale: Locale;
  isOwner: boolean;
  index?: number;
}

export function QuizCard({ quiz, locale, isOwner, index = 0 }: QuizCardProps) {
  const router = useRouter();
  const t = createTranslator(locale);
  const quizHref = `/quizzes/${quiz.id}`;
  const gradient = COVER_GRADIENTS[index % COVER_GRADIENTS.length];

  return (
    <div
      className="nd-lib-card"
      onClick={() => router.push(quizHref)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          router.push(quizHref);
        }
      }}
      aria-label={`${t("quiz.openQuiz")}: ${quiz.title}`}
    >
      {/* Cover */}
      <div className="nd-lib-cover" style={{ background: gradient }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 2, textAlign: "center" }}>
          <span style={{ fontSize: 48, fontWeight: 900, fontFamily: "'Caveat', cursive", lineHeight: 1 }}>
            {quiz.questionCount}
          </span>
          <span style={{ fontSize: 11, letterSpacing: ".12em", fontFamily: "'JetBrains Mono', monospace", opacity: 0.85, textTransform: "uppercase" }}>
            {quiz.questionCount === 1 ? t("quiz.question") : t("quiz.questions")}
          </span>
        </div>
        {quiz.subject ? (
          <div style={{ position: "absolute", top: 10, right: 10, background: "rgba(0,0,0,.25)", backdropFilter: "blur(8px)", borderRadius: 99, padding: "3px 10px", fontSize: 10.5, fontWeight: 700, fontFamily: "'JetBrains Mono',monospace", letterSpacing: ".06em", color: "#fff" }}>
            {quiz.subject}
          </div>
        ) : null}
      </div>

      {/* Body */}
      <div className="nd-lib-body">
        <h4 style={{ lineHeight: 1.3 }}>{quiz.title}</h4>
        <p>{quiz.description || t("quiz.noDescription")}</p>

        {quiz.tags && quiz.tags.length > 0 ? (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 2 }}>
            {quiz.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="nd-tag" style={{ fontSize: 10.5 }}>
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
      </div>

      {/* Stats footer */}
      <div className="nd-lib-foot">
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Users style={{ width: 11, height: 11 }} />
          {quiz.attemptsCount}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Target style={{ width: 11, height: 11 }} />
          {quiz.averagePercentage}%
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <Timer style={{ width: 11, height: 11 }} />
          {quiz.timePerQuestion}{t("quiz.secondsShort")}
        </span>
        <span>{formatDate(quiz.createdAt, locale)}</span>
      </div>

      {/* Action buttons */}
      <div
        style={{ padding: "0 16px 16px", display: "flex", gap: 8, alignItems: "center" }}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          href={`/quizzes/${quiz.id}/play`}
          className="nd-btn-primary"
          style={{ flex: 1, justifyContent: "center", fontSize: 13, padding: "10px 14px" }}
          onClick={(e) => e.stopPropagation()}
        >
          <Play style={{ width: 13, height: 13 }} />
          {t("quiz.startQuiz")}
        </Link>
        {isOwner ? (
          <Link
            href={`/quizzes/${quiz.id}/edit`}
            className="nd-btn-soft"
            style={{ padding: "10px 14px", fontSize: 13 }}
            title={t("quiz.edit")}
            onClick={(e) => e.stopPropagation()}
          >
            <Pencil style={{ width: 13, height: 13 }} />
          </Link>
        ) : null}
      </div>
    </div>
  );
}
