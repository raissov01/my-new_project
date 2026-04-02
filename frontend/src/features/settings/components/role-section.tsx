"use client";

import { useState, useTransition } from "react";
import { AlertCircle, GraduationCap, ShieldCheck } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { changeRole } from "@/app/(auth)/choose-role/actions";
import type { ProfileRole } from "@/lib/shared/types/database";

export function RoleSection({ currentRole }: { currentRole: ProfileRole }) {
  const { t } = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const targetRole: ProfileRole = currentRole === "student" ? "teacher" : "student";

  function handleConfirm() {
    setError(null);
    startTransition(async () => {
      const result = await changeRole(targetRole);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{t("settings.currentRole")}</p>
          <div className="mt-2 inline-flex items-center gap-2 rounded-xl bg-[var(--bg-surface)] px-4 py-2.5">
            {currentRole === "student" ? (
              <GraduationCap className="h-5 w-5 text-indigo-500" />
            ) : (
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            )}
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {currentRole === "student" ? t("auth.roleStudent") : t("auth.roleTeacher")}
            </span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
          {t("settings.changeRole")}
        </Button>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title={t("settings.changeRoleTitle")}>
        <div className="space-y-4">
          <p className="text-sm text-[var(--text-secondary)]">
            {t("settings.changeRoleDescription", {
              current: currentRole === "student" ? t("auth.roleStudent") : t("auth.roleTeacher"),
              target: targetRole === "student" ? t("auth.roleStudent") : t("auth.roleTeacher"),
            })}
          </p>

          <div className="flex items-center gap-3 rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            {targetRole === "student" ? (
              <GraduationCap className="h-6 w-6 text-indigo-500" />
            ) : (
              <ShieldCheck className="h-6 w-6 text-emerald-500" />
            )}
            <div>
              <p className="font-semibold text-[var(--text-primary)]">
                {targetRole === "student" ? t("auth.roleStudent") : t("auth.roleTeacher")}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {targetRole === "student" ? t("role.studentDescription") : t("role.teacherDescription")}
              </p>
            </div>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={isPending}>
              {t("set.cancel")}
            </Button>
            <Button onClick={handleConfirm} isLoading={isPending}>
              {t("settings.confirmRoleChange")}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
