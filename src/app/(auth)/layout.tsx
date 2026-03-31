import Link from "next/link";
import { BrandLogo } from "@/components/layout";
import { LanguageSwitcher } from "@/components/ui/language-switcher";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-main px-4">
      <div className="mb-4 flex w-full max-w-md justify-end">
        <LanguageSwitcher />
      </div>
      <Link href="/" className="mb-8 flex items-center gap-2.5 text-2xl font-bold">
        <BrandLogo />
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
