import { redirect } from "next/navigation";
import { requireAdmin } from "@/server/auth";
import { AdminSidebar } from "@/components/layout/admin-sidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin — StudyWithRaissov" };

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const auth = await requireAdmin();
  if (auth.redirectTo) redirect(auth.redirectTo);

  return (
    <div className="flex min-h-screen">
      <AdminSidebar />
      <div className="flex flex-1 flex-col pt-[54px] lg:pt-0 lg:ml-[220px]">
        <main id="main-content" className="flex-1">
          <div className="page-shell py-6 sm:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
