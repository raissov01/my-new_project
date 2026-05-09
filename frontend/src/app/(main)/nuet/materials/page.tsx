import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, FileText, Download } from "lucide-react";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { getCurrentUser } from "@/server/auth";
import { listNUETMaterials, type NUETMaterial } from "@/server/integrations/go-backend/nuet";
import { RetryButton } from "@/components/nuet/retry-button";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  return {
    title: t("nuet.materialsMetaTitle"),
    description: t("nuet.materialsMetaDesc"),
    alternates: { canonical: "/nuet/materials" },
  };
}

type SearchParams = {
  section?: "math" | "critical_thinking";
  type?: "mock_test" | "trial_test" | "book" | "notes" | "formulas" | "solutions";
};

export default async function NUETMaterialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const user = await getCurrentUser();

  const data = await listNUETMaterials(user?.id ?? "", {
    section: params.section,
    type: params.type,
    withFile: true,
    limit: 100,
  }).catch(() => ({ items: [], total: 0 }));

  const sectionFilters = [
    { key: undefined, label: t("nuet.filterAll") },
    { key: "math" as const, label: t("nuet.sectionMath") },
    { key: "critical_thinking" as const, label: t("nuet.sectionCT") },
  ];

  const typeFilters = [
    { key: undefined, label: t("nuet.typeAll") },
    { key: "mock_test" as const, label: t("nuet.typeMock") },
    { key: "trial_test" as const, label: t("nuet.typeTrial") },
    { key: "book" as const, label: t("nuet.typeBook") },
    { key: "notes" as const, label: t("nuet.typeNotes") },
    { key: "formulas" as const, label: t("nuet.typeFormulas") },
    { key: "solutions" as const, label: t("nuet.typeSolutions") },
  ];

  return (
    <div className="page-shell py-6 sm:py-10">
      <Link
        href="/nuet"
        className="inline-flex items-center gap-2 text-sm text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("nuet.backToHub")}
      </Link>

      <h1 className="mt-3 text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
        {t("nuet.materialsTitle")}
      </h1>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">
        {t("nuet.materialsSubtitle").replace("{count}", String(data.total))}
      </p>

      {/* Filters */}
      <div className="mt-6 space-y-3">
        <FilterRow label={t("nuet.filterSection")} active={params.section}>
          {sectionFilters.map((f) => (
            <FilterChip
              key={f.key ?? "all"}
              label={f.label}
              active={params.section === f.key}
              href={buildHref(params, { section: f.key })}
            />
          ))}
        </FilterRow>
        <FilterRow label={t("nuet.filterType")} active={params.type}>
          {typeFilters.map((f) => (
            <FilterChip
              key={f.key ?? "all"}
              label={f.label}
              active={params.type === f.key}
              href={buildHref(params, { type: f.key })}
            />
          ))}
        </FilterRow>
        {params.section || params.type ? (
          <Link
            href="/nuet/materials"
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-3 py-1 text-xs font-medium text-[var(--text-secondary)] hover:border-rose-300 hover:text-rose-600"
          >
            ✕ {t("nuet.materialsClearFilters")}
          </Link>
        ) : null}
      </div>

      {/* Grid */}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--bg-surface)] p-6 text-center sm:col-span-2 lg:col-span-3">
            <p className="text-sm text-[var(--text-muted)]">{t("nuet.noMaterials")}</p>
            <div className="mt-3 flex justify-center">
              <RetryButton label={t("nuet.materialsRetry")} />
            </div>
          </div>
        ) : (
          data.items.map((m) => <MaterialCard key={m.id} material={m} t={t} />)
        )}
      </div>
    </div>
  );
}

function FilterRow({
  label,
  children,
}: {
  label: string;
  active?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--text-muted)]">
        {label}
      </span>
      {children}
    </div>
  );
}

function FilterChip({
  label,
  active,
  href,
}: {
  label: string;
  active: boolean;
  href: string;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition ${
        active
          ? "border-[var(--primary)] bg-[var(--primary)] text-white"
          : "border-[var(--border)] bg-[var(--bg-surface)] text-[var(--text-secondary)] hover:bg-[var(--bg-soft)]"
      }`}
    >
      {label}
    </Link>
  );
}

function MaterialCard({
  material,
  t,
}: {
  material: NUETMaterial;
  t: (key: string) => string;
}) {
  const fileLabel = material.fileName || t("nuet.untitledFile");
  // The backend serves files via /api/v1/files/<filepath>; the proxy passes
  // through to the Go backend's public files endpoint.
  const downloadUrl = `/api/v1/files/${encodeURI(material.filePath)}`;
  const caption = (material.caption || material.text || "").trim();
  const preview = caption.length > 140 ? caption.slice(0, 140) + "…" : caption;
  const visibleTags = material.tags
    .filter((t) => t.startsWith("type_") || t.startsWith("topic_") || t === "nuet_math" || t === "nuet_critical_thinking")
    .slice(0, 3);

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-[var(--border)] bg-[var(--bg-surface)] p-4 transition hover:border-[var(--primary)]">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--bg-soft)] text-[var(--text-muted)]">
          <FileText className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-sm font-semibold text-[var(--text-primary)]">
            {fileLabel}
          </h3>
          {preview ? (
            <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">
              {preview}
            </p>
          ) : null}
        </div>
      </div>
      {visibleTags.length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {visibleTags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-[var(--border)] bg-[var(--bg-base)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-[var(--text-muted)]"
            >
              {tag.replace(/^(type_|topic_|nuet_)/, "")}
            </span>
          ))}
        </div>
      ) : null}
      <a
        href={downloadUrl}
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-fit items-center gap-1 text-xs font-semibold text-[var(--primary)] hover:underline"
      >
        <Download className="h-3 w-3" />
        {t("nuet.download")}
      </a>
    </article>
  );
}

function buildHref(
  current: SearchParams,
  patch: Partial<SearchParams>
): string {
  const next: SearchParams = { ...current, ...patch };
  // Strip undefined keys.
  const qs = new URLSearchParams();
  if (next.section) qs.set("section", next.section);
  if (next.type) qs.set("type", next.type);
  const tail = qs.toString();
  return tail ? `/nuet/materials?${tail}` : "/nuet/materials";
}
