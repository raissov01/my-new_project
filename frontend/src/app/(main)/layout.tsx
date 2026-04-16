import { Navbar } from "@/components/layout";
import { GhostModeBanner } from "@/components/layout/ghost-mode-banner";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />
      <GhostModeBanner />
      <main className="flex-1">{children}</main>
    </div>
  );
}
