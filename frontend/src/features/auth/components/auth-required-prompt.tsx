"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Lock, Sparkles } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface AuthRequiredPromptProps {
  triggerLabel: string;
  title: string;
  description: string;
  loginLabel: string;
  signupLabel: string;
  cancelLabel: string;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  className?: string;
  icon?: ReactNode;
}

export function AuthRequiredPrompt({
  triggerLabel,
  title,
  description,
  loginLabel,
  signupLabel,
  cancelLabel,
  variant = "primary",
  className,
  icon,
}: AuthRequiredPromptProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant={variant}
        className={className}
        onClick={() => setOpen(true)}
      >
        {icon ?? <Lock className="h-4 w-4" />}
        {triggerLabel}
      </Button>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={title}>
        <div className="space-y-4">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-surface)] p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-indigo-500/12 p-2 text-indigo-400">
                <Sparkles className="h-5 w-5" />
              </div>
              <p className="text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/signup" className="flex-1" onClick={() => setOpen(false)}>
              <Button className="w-full">{signupLabel}</Button>
            </Link>
            <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">
                {loginLabel}
              </Button>
            </Link>
          </div>

          <Button type="button" variant="ghost" className="w-full" onClick={() => setOpen(false)}>
            {cancelLabel}
          </Button>
        </div>
      </Modal>
    </>
  );
}
