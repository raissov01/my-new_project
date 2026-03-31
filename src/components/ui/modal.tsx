"use client";

import { Fragment, ReactNode } from "react";
import { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.addEventListener("keydown", handleEsc);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleEsc);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <Fragment>
      <div
        className="fixed inset-0 z-40 bg-black/50 transition-opacity animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      {/* Desktop: centered dialog */}
      <div
        className="fixed inset-0 z-50 hidden items-center justify-center p-4 sm:flex"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        <div
          className="w-full max-w-lg rounded-2xl border border-[var(--border)] bg-[var(--bg-elevated)] p-6 shadow-xl animate-scale-in"
          onClick={(e) => e.stopPropagation()}
        >
          {title && (
            <h2
              id="modal-title"
              className="mb-4 text-lg font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
      {/* Mobile: bottom sheet */}
      <div
        className="fixed inset-x-0 bottom-0 z-50 sm:hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title-mobile" : undefined}
      >
        <div
          className="max-h-[90vh] overflow-y-auto overscroll-contain rounded-t-2xl border-t border-[var(--border)] bg-[var(--bg-elevated)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl animate-slide-up-sheet"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Drag handle */}
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[var(--border)]" />
          {title && (
            <h2
              id="modal-title-mobile"
              className="mb-4 text-lg font-semibold text-[var(--text-primary)]"
            >
              {title}
            </h2>
          )}
          {children}
        </div>
      </div>
    </Fragment>
  );
}
