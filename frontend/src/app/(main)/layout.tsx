import { Navbar } from "@/components/layout";

export const dynamic = "force-dynamic";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1 bg-gradient-main">{children}</main>
    </div>
  );
}
