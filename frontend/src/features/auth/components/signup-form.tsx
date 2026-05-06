"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, GraduationCap, ShieldCheck } from "lucide-react";
import { signup } from "@/app/(auth)/actions";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { getApiBaseUrl } from "@/lib/client/api";
import type { ProfileRole } from "@/lib/shared/types/database";

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1Z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23Z" fill="#34A853"/>
      <path d="M5.84 14.09A6.9 6.9 0 0 1 5.48 12c0-.72.13-1.42.36-2.09V7.07H2.18A11.02 11.02 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l3.66-2.84Z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53Z" fill="#EA4335"/>
    </svg>
  );
}

export function SignupForm() {
  const { t } = useLocale();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<ProfileRole>("student");
  const [socialPending, setSocialPending] = useState<string | null>(null);
  const [emailPending, setEmailPending] = useState(false);
  const submitLockRef = useRef(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitLockRef.current || emailPending || socialPending) {
      return;
    }

    submitLockRef.current = true;
    setError(null);
    setSocialPending(null);
    setEmailPending(true);
    const formData = new FormData(e.currentTarget);
    const clientRequestId =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `signup-${Date.now()}`;
    formData.set("client_request_id", clientRequestId);

    const submittedEmail = String(formData.get("email") ?? "").trim();

    startTransition(async () => {
      try {
        const result = await signup(formData);
        if (result?.error) {
          setError(result.error);
        } else if (result?.message) {
          router.push(`/verify-email?email=${encodeURIComponent(submittedEmail)}`);
        }
      } catch (submitError) {
        if (process.env.NODE_ENV !== "production") {
          console.error("[signup-form] submit threw:", submitError);
        }
      } finally {
        submitLockRef.current = false;
        setEmailPending(false);
        setSocialPending(null);
      }
    });
  }

  function handleSocial(provider: "google") {
    if (emailPending || socialPending) return;
    setError(null);
    setSocialPending(provider);
    window.location.assign(`${getApiBaseUrl()}/auth/${provider}`);
  }

  // Only disable during active request. Never leave permanently disabled.
  const isDisabled = isPending || emailPending || !!socialPending;

  return (
    <div>
      <div className="mb-6">
        <h2 style={{ fontSize: 26, fontWeight: 800, letterSpacing: "-.02em", margin: "0 0 6px", color: "var(--ink)" }}>
          {t("auth.createAccount")}
        </h2>
        <p style={{ fontSize: 14.5, color: "var(--ink-mute)", margin: 0 }}>
          {t("auth.startStudying")}
        </p>
      </div>

      <fieldset className="mb-6 space-y-3 sm:mb-7">
        <legend className="text-sm font-medium text-[var(--text-primary)]">
          {t("auth.role")}
        </legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 transition-all sm:p-4 ${
              selectedRole === "student"
                ? "border-[var(--primary)] bg-[var(--primary-soft)]"
                : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
            }`}
          >
            <input
              type="radio"
              value="student"
              checked={selectedRole === "student"}
              onChange={() => setSelectedRole("student")}
              disabled={isDisabled}
              className="sr-only"
            />
            <div className={`mt-0.5 rounded-[var(--radius-md)] p-2 sm:p-2.5 ${selectedRole === "student" ? "bg-[var(--primary)]/10 text-[var(--primary)]" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleStudent")}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                {t("auth.roleStudentBody")}
              </p>
            </div>
          </label>
          <label
            className={`flex cursor-pointer items-start gap-3 rounded-[var(--radius-lg)] border p-3.5 transition-all sm:p-4 ${
              selectedRole === "teacher"
                ? "border-emerald-500/30 bg-emerald-500/8"
                : "border-[var(--border)] bg-[var(--bg-surface)] hover:border-[var(--border-strong)]"
            }`}
          >
            <input
              type="radio"
              value="teacher"
              checked={selectedRole === "teacher"}
              onChange={() => setSelectedRole("teacher")}
              disabled={isDisabled}
              className="sr-only"
            />
            <div className={`mt-0.5 rounded-[var(--radius-md)] p-2 sm:p-2.5 ${selectedRole === "teacher" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-[var(--bg-elevated)] text-[var(--text-muted)]"}`}>
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{t("auth.roleTeacher")}</p>
              <p className="mt-0.5 text-xs leading-5 text-[var(--text-secondary)]">
                {t("auth.roleTeacherBody")}
              </p>
            </div>
          </label>
        </div>
      </fieldset>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleSocial("google")}
          disabled={isDisabled}
          className="flex min-h-11 w-full items-center justify-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--bg-surface)] px-4 text-sm font-medium text-[var(--text-primary)] shadow-[var(--shadow-xs)] transition-all hover:border-[var(--border-strong)] hover:bg-[var(--bg-soft)] disabled:cursor-not-allowed disabled:opacity-60 sm:min-h-12"
        >
          <GoogleIcon className="h-5 w-5" />
          {socialPending === "google" ? "..." : t("auth.continueWithGoogle")}
        </button>
      </div>

      <p className="mt-3 text-center text-xs text-[var(--text-muted)]">
        {t("auth.googleStudentHint")}
      </p>

      <div className="relative my-6 sm:my-7">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-[var(--bg-elevated)] px-3 text-[11px] font-medium uppercase tracking-[0.24em] text-[var(--text-muted)]">
            {t("auth.orContinueWith")}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3.5 sm:space-y-4">
        <Input id="full_name" name="full_name" type="text" label={t("auth.fullName")} placeholder={t("auth.fullNamePlaceholder")} required autoComplete="name" disabled={isDisabled} />
        <Input id="username" name="username" type="text" label={t("auth.username")} placeholder={t("auth.usernamePlaceholder")} required autoComplete="username" disabled={isDisabled} />
        <Input id="phone" name="phone" type="tel" label={t("auth.phone")} placeholder={t("auth.phonePlaceholder")} autoComplete="tel" disabled={isDisabled} />
        <Input id="email" name="email" type="email" label={t("auth.email")} placeholder={t("auth.emailPlaceholder")} required autoComplete="email" disabled={isDisabled} />
        <PasswordInput
          id="password"
          name="password"
          label={t("auth.password")}
          placeholder={t("auth.passwordNewPlaceholder")}
          required
          minLength={6}
          autoComplete="new-password"
          disabled={isDisabled}
          showLabel={t("auth.showPassword")}
          hideLabel={t("auth.hidePassword")}
        />

        {/* Hidden role field for form submission */}
        <input type="hidden" name="role" value={selectedRole} />

        {error && (
          <div className="flex items-start gap-2.5 rounded-[var(--radius-lg)] border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" className="w-full" size="lg" isLoading={isPending} disabled={isDisabled}>
          {t("auth.createAccountBtn")}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm leading-6 text-[var(--text-muted)] sm:mt-7">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="font-medium text-[var(--primary)] transition-colors hover:text-[var(--primary-hover)]">
          {t("auth.logIn")}
        </Link>
      </p>
    </div>
  );
}
