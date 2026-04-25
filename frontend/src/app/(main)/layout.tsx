import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { GhostModeBanner } from "@/components/layout/ghost-mode-banner";
import { AppFooter } from "@/components/layout/app-footer";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <AppSidebar />
      <div className="flex flex-1 flex-col pt-[54px] lg:pt-0 lg:ml-[220px]">
        <GhostModeBanner />
        <AppHeader />
        <main id="main-content" className="flex-1">
          {children}
        </main>
        <div className="hidden lg:block">
          <AppFooter />
        </div>
      </div>
    </div>
  );
}
