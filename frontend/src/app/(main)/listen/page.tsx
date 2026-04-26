import { getCurrentUser } from "@/server/auth";
import { getListeningClips } from "@/features/listening/api";
import { ClipCard } from "@/components/listening/ClipCard";
import { Headphones } from "lucide-react";
import { getServerLocale } from "@/server/i18n";
import { createTranslator } from "@/lib/shared/i18n";

export const metadata = { title: "Listening Library — StudyWithRaissov" };

const LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"];
const TOPICS = ["daily", "travel", "work", "food", "health", "technology", "environment", "society", "science", "psychology"];

export default async function ListenPage({
  searchParams,
}: {
  searchParams: Promise<{ level?: string; topic?: string; source?: string }>;
}) {
  await getCurrentUser();
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = createTranslator(locale);

  const clips = await getListeningClips({
    level: params.level,
    topic: params.topic,
    source: params.source,
  });

  const buildHref = (key: string, val: string) => {
    const p = new URLSearchParams(params as Record<string, string>);
    if (p.get(key) === val) p.delete(key);
    else p.set(key, val);
    return `/listen?${p}`;
  };

  return (
    <div className="page-shell py-4 sm:py-6">
      {/* Header */}
      <div className="nd-mock-shell" style={{ marginBottom: 24 }}>
        <div className="nd-mock-bar">
          <Headphones style={{ width: 18, height: 18, color: "var(--terra)" }} />
          <h3>Listening Library</h3>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "var(--ink-mute)" }}>
            {clips.length} CLIP{clips.length !== 1 ? "S" : ""}
          </span>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
        <div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 8 }}>
            {t("listen.levelFilter")}
          </p>
          <div className="nd-lib-filters" style={{ marginBottom: 0 }}>
            {LEVELS.map((lv) => (
              <a key={lv} href={buildHref("level", lv)}
                className={`nd-lib-pill${params.level === lv ? " on" : ""}`}>
                {lv}
              </a>
            ))}
          </div>
        </div>
        <div>
          <p style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10.5, fontWeight: 700, letterSpacing: ".1em", color: "var(--ink-mute)", marginBottom: 8 }}>
            {t("listen.topicFilter")}
          </p>
          <div className="nd-lib-filters" style={{ marginBottom: 0 }}>
            {TOPICS.map((tp) => (
              <a key={tp} href={buildHref("topic", tp)}
                className={`nd-lib-pill${params.topic === tp ? " on" : ""}`}
                style={{ textTransform: "capitalize" }}>
                {tp}
              </a>
            ))}
            <a href={buildHref("source", "podcast")}
              className={`nd-lib-pill${params.source === "podcast" ? " on" : ""}`}>
              🎙 Podcast
            </a>
          </div>
        </div>
      </div>

      {/* Grid */}
      {clips.length === 0 ? (
        <div style={{ padding: "64px 0", textAlign: "center" }}>
          <Headphones style={{ width: 40, height: 40, margin: "0 auto 12px", opacity: .25, color: "var(--ink-mute)" }} />
          <p style={{ color: "var(--ink-mute)", fontSize: 14 }}>{t("listen.noClips")}</p>
          <a href="/listen" style={{ fontSize: 13, color: "var(--terra)", marginTop: 8, display: "inline-block" }}>
            {t("listen.clearFilters")}
          </a>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))" }}>
          {clips.map((clip) => (
            <ClipCard key={clip.id} clip={clip} />
          ))}
        </div>
      )}
    </div>
  );
}
