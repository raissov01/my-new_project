import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";

// Middleware already handles the redirect for authenticated users.
// No need to duplicate the check here — keep this page a simple shell.
export default function LoginPage() {
  if (DEV_MODE) {
    redirect("/student");
  }

  return <LoginForm />;
}
