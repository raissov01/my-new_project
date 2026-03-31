"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { deleteAccount } from "@/app/(main)/settings/actions";

export function DeleteAccountSection() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="rounded-3xl border border-red-200 bg-red-500/5 p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-red-500/10 p-3 text-red-600">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
              {t("settings.deleteAccount")}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("settings.deleteAccountDescription")}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <Button type="button" variant="danger" onClick={() => setOpen(true)}>
            {t("settings.deleteAccount")}
          </Button>
        </div>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={t("settings.deleteAccount")}>
        <form action={deleteAccount} className="space-y-4">
          <p className="text-sm leading-6 text-[var(--text-secondary)]">
            {t("settings.deleteWarning")}
          </p>
          <Input
            name="confirmation"
            label={t("settings.confirmDeleteLabel")}
            placeholder="DELETE"
            required
          />
          <div className="flex flex-wrap gap-3">
            <Button type="submit" variant="danger">
              {t("settings.confirmDeleteAction")}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {t("set.cancel")}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}
