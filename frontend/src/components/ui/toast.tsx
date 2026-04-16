"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { useLocale } from "@/components/providers/locale-provider";

type ToastType = "success" | "error";

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const { t } = useLocale();
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const toast = useCallback((type: ToastType, message: string) => {
    const id = ++nextId.current;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      >
        {toasts.map((toastItem) => (
          <div
            key={toastItem.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3 text-sm font-medium shadow-[var(--shadow-md)] animate-in slide-in-from-right duration-200 ${
              toastItem.type === "success"
                ? "border-emerald-500/20 bg-[var(--bg-elevated)] text-emerald-700 dark:text-emerald-300"
                : "border-red-500/20 bg-[var(--bg-elevated)] text-red-700 dark:text-red-400"
            }`}
          >
            {toastItem.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{toastItem.message}</span>
            <button
              onClick={() => dismiss(toastItem.id)}
              className="ml-2 shrink-0 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-[var(--bg-muted)]"
              aria-label={t("toast.dismiss")}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
