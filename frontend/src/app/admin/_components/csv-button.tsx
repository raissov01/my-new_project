import Link from "next/link";
import { Download } from "lucide-react";

// CSV download button. Path is the full /api/admin/... URL (we go through the
// Next.js admin proxy so requireAdmin runs first). The proxy detects
// `format=csv` and streams the bytes back instead of treating the response
// as JSON.
export function CSVButton({
  path,
  label = "Export CSV",
}: {
  path: string;
  label?: string;
}) {
  return (
    <Link
      href={path}
      className="inline-flex items-center gap-1.5 rounded-[var(--radius-sm)] border border-[var(--border)] px-2.5 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-soft)]"
      prefetch={false}
    >
      <Download className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}
