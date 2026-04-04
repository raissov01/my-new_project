"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type ViolationType =
  | "tab_switch"
  | "fullscreen_exit"
  | "copy"
  | "paste"
  | "right_click"
  | "dev_tools"
  | "blur";

type StrictModePolicy = {
  fullscreenRequired: boolean;
  warnOnly: boolean;
  autoTerminateAt: number;
  immediateTerminate: boolean;
};

type UseExamModeOptions = {
  enabled: boolean;
  attemptId?: string;
  policy?: Partial<StrictModePolicy>;
  onViolation?: (event: { type: ViolationType; details?: string; count: number }) => void;
  onTerminate?: (reason: string) => void;
};

const defaultPolicy: StrictModePolicy = {
  fullscreenRequired: true,
  warnOnly: false,
  autoTerminateAt: 5,
  immediateTerminate: false,
};

export function useExamMode(options: UseExamModeOptions) {
  const policy = { ...defaultPolicy, ...(options.policy ?? {}) };
  const [violationCount, setViolationCount] = useState(0);
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const suppressPopStateRef = useRef(false);

  const logViolation = useCallback(
    (type: ViolationType, details?: string) => {
      setViolationCount((prev) => {
        const next = prev + 1;
        options.onViolation?.({ type, details, count: next });

        if (policy.immediateTerminate) {
          options.onTerminate?.(`Violation: ${type}`);
          return next;
        }

        if (!policy.warnOnly && next >= policy.autoTerminateAt) {
          options.onTerminate?.("Maximum violations reached");
          return next;
        }

        setWarningMessage(
          `Exam mode violation detected (${type.replaceAll("_", " ")}). Count: ${next}`
        );
        return next;
      });
    },
    [options, policy.autoTerminateAt, policy.immediateTerminate, policy.warnOnly]
  );

  const requestFullscreen = useCallback(async () => {
    if (!policy.fullscreenRequired) return;
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) return;

    try {
      await document.documentElement.requestFullscreen();
    } catch {
      logViolation("fullscreen_exit", "Fullscreen request was blocked by the browser");
      setWarningMessage("Fullscreen request was blocked by the browser.");
    }
  }, [logViolation, policy.fullscreenRequired]);

  const exitFullscreen = useCallback(async () => {
    if (typeof document === "undefined") return;
    if (!document.fullscreenElement) return;
    try {
      await document.exitFullscreen();
    } catch {
      // no-op
    }
  }, []);

  const clearWarning = useCallback(() => setWarningMessage(null), []);

  const askExit = useCallback(() => {
    setShowExitConfirm(true);
  }, []);

  const cancelExit = useCallback(() => {
    setShowExitConfirm(false);
    if (typeof window !== "undefined") {
      suppressPopStateRef.current = true;
      window.history.pushState({ exam: true }, "", window.location.href);
      setTimeout(() => {
        suppressPopStateRef.current = false;
      }, 0);
    }
  }, []);

  const confirmExit = useCallback(async () => {
    setShowExitConfirm(false);
    await exitFullscreen();
  }, [exitFullscreen]);

  useEffect(() => {
    if (!options.enabled || typeof window === "undefined" || typeof document === "undefined") {
      return;
    }

    // Fullscreen must be triggered by user gesture (click) — NOT here in useEffect.
    // The consumer calls requestFullscreen() from the "Start exam" button handler.
    window.history.pushState({ exam: true }, "", window.location.href);

    const onFullscreenChange = () => {
      if (!policy.fullscreenRequired) return;
      if (!document.fullscreenElement) {
        logViolation("fullscreen_exit", "User exited fullscreen mode");
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logViolation("tab_switch", "Document became hidden");
      }
    };

    const onWindowBlur = () => {
      logViolation("blur", "Window lost focus");
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "Leaving the exam will terminate your attempt.";
    };

    const onPopState = () => {
      if (suppressPopStateRef.current) return;
      setShowExitConfirm(true);
      window.history.pushState({ exam: true }, "", window.location.href);
    };

    const onCopy = (event: ClipboardEvent) => {
      event.preventDefault();
      logViolation("copy", "Copy blocked in strict mode");
    };

    const onPaste = (event: ClipboardEvent) => {
      event.preventDefault();
      logViolation("paste", "Paste blocked in strict mode");
    };

    const onContextMenu = (event: MouseEvent) => {
      event.preventDefault();
      logViolation("right_click", "Context menu blocked");
    };

    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const blocked =
        key === "f12" ||
        (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key)) ||
        (event.ctrlKey && ["u", "c", "v", "x", "a", "s", "p"].includes(key));

      if (blocked) {
        event.preventDefault();
        if (key === "f12" || (event.ctrlKey && event.shiftKey && ["i", "j", "c"].includes(key))) {
          logViolation("dev_tools", "Developer-tools shortcut blocked");
        } else if (key === "c") {
          logViolation("copy", "Keyboard copy blocked");
        } else if (key === "v") {
          logViolation("paste", "Keyboard paste blocked");
        }
      }
    };

    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("blur", onWindowBlur);
    window.addEventListener("beforeunload", onBeforeUnload);
    window.addEventListener("popstate", onPopState);
    document.addEventListener("copy", onCopy);
    document.addEventListener("paste", onPaste);
    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("blur", onWindowBlur);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.removeEventListener("popstate", onPopState);
      document.removeEventListener("copy", onCopy);
      document.removeEventListener("paste", onPaste);
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("keydown", onKeyDown);
      void exitFullscreen();
    };
  }, [exitFullscreen, logViolation, options.enabled, policy.fullscreenRequired]);

  return {
    violationCount,
    warningMessage,
    showExitConfirm,
    clearWarning,
    askExit,
    cancelExit,
    confirmExit,
    requestFullscreen,
  };
}