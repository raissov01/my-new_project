import Link from "next/link";
import { Sparkles } from "lucide-react";
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
      <Link href="/" className="mb-8 flex items-center gap-2 text-2xl font-bold">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 shadow-md shadow-indigo-500/20">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
          FlashLearn
        </span>
      </Link>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
