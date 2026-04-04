"use client";

import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ExamViolationModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  confirmTone?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
};

export function ExamViolationModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  confirmTone = "default",
  onConfirm,
  onCancel,
}: ExamViolationModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-5 shadow-2xl">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-xl bg-amber-500/15 p-2 text-amber-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--text-primary)]">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{message}</p>
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            onClick={onConfirm}
            className={
              confirmTone === "danger"
                ? "bg-red-600 text-white hover:bg-red-500"
                : undefined
            }
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}