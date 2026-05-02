import Link from "next/link";
import { redirect } from "next/navigation";
import { BarChart3, ClipboardCheck, LayoutDashboard } from "lucide-react";
import { requireAdmin } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);

  return (
    <div className="page-shell py-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-[var(--border)] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="nd-eyebrow">Admin</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[var(--text-primary)]">
            Control panel
          </h1>
        </div>
        <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
          <Link href="/admin/dashboard" className="nd-btn-soft">
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link href="/admin/review-questions" className="nd-btn-soft">
            <ClipboardCheck className="h-4 w-4" />
            Review
          </Link>
          <Link href="/admin/analytics" className="nd-btn-soft">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </Link>
        </nav>
      </div>
      {children}
    </div>
  );
}
