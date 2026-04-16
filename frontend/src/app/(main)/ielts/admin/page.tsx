import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";
import { isAdminSessionCookie, ADMIN_COOKIE_NAME } from "@/lib/shared/auth/admin";
import { getMaterials } from "./actions";
import { AdminPanelClient } from "./client";

export default async function IELTSAdminPage() {
  const cookieStore = await cookies();
  const isAdmin = isAdminSessionCookie(cookieStore.get(ADMIN_COOKIE_NAME));

  if (!isAdmin) {
    redirect("/ielts");
  }

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const materials = await getMaterials();

  return (
    <div className="page-shell py-5 sm:py-8 lg:py-10">
      <div className="rounded-[var(--radius-2xl)] border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-[var(--shadow-xl)] sm:p-8">
        <p className="text-sm font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
          {t("admin.eyebrow")}
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.05em] text-[var(--text-primary)] sm:text-4xl">
          {t("admin.title")}
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
          {t("admin.subtitle")}
        </p>
      </div>

      <div className="mt-8">
        <AdminPanelClient initialMaterials={materials} />
      </div>
    </div>
  );
}
