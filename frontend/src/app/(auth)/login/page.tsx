import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth/components";
import { DEV_MODE } from "@/lib/shared/auth/dev-mode";
import { createTranslator } from "@/lib/shared/i18n";
import { getServerLocale } from "@/server/i18n";

// Middleware already handles the redirect for authenticated users.
// No need to duplicate the check here — keep this page a simple shell.
interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

function getGoogleErrorMessage(
  error: string | undefined,
  t: (key: string) => string
) {
  switch (error) {
    case "google_not_configured":
      return t("auth.googleNotConfigured");
    case "invalid_state":
      return t("auth.googleInvalidState");
    case "state_mismatch":
      return t("auth.googleStateMismatch");
    case "access_denied":
      return t("auth.googleAccessDenied");
    case "no_code":
      return t("auth.googleNoCode");
    case "token_exchange_failed":
      return t("auth.googleTokenExchangeFailed");
    case "userinfo_failed":
      return t("auth.googleUserInfoFailed");
    case "no_email":
      return t("auth.googleNoEmail");
    case "account_error":
      return t("auth.googleAccountError");
    case "token_failed":
      return t("auth.googleTokenFailed");
    default:
      return null;
  }
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (DEV_MODE) {
    redirect("/student");
  }

  const locale = await getServerLocale();
  const t = createTranslator(locale);
  const { error } = await searchParams;

  return <LoginForm initialError={getGoogleErrorMessage(error, t)} />;
}
