import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
  /** JSON-LD base URL, e.g. "https://studywithraissov.com" */
  baseUrl?: string;
};

export function Breadcrumbs({ items, baseUrl }: Props) {
  const allItems: BreadcrumbItem[] = [{ label: "home", href: "/" }, ...items];

  const jsonLd = baseUrl
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: allItems.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: item.label,
          item: item.href ? `${baseUrl}${item.href}` : undefined,
        })),
      }
    : null;

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <nav aria-label="breadcrumb">
        <ol className="flex flex-wrap items-center gap-1 text-sm text-[var(--text-secondary)]">
          {allItems.map((item, i) => {
            const isLast = i === allItems.length - 1;
            const isHome = i === 0;
            return (
              <li key={i} className="flex items-center gap-1">
                {i > 0 && (
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted)]" aria-hidden="true" />
                )}
                {isLast || !item.href ? (
                  <span
                    className="font-medium text-[var(--text-primary)]"
                    aria-current="page"
                  >
                    {isHome ? <Home className="h-4 w-4" aria-hidden="true" /> : item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="transition-colors hover:text-[var(--text-primary)]"
                  >
                    {isHome ? <Home className="h-4 w-4" aria-hidden="true" /> : item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
