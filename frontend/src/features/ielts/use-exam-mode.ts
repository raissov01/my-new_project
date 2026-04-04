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
  const hadFullscreenRef = useRef(false);

  // Use refs for callbacks to avoid stale closures in event listeners
  const onViolationRef = useRef(options.onViolation);
  const onTerminateRef = useRef(options.onTerminate);
  onViolationRef.current = options.onViolation;
  onTerminateRef.current = options.onTerminate;

  // Debounce ref to prevent double-counting the same tab-switch event.
  // When user switches tab: blur fires first, then visibilitychange fires ~0-5ms later.
  // We only want to count it once.
  const lastViolationTimeRef = useRef<Record<string, number>>({});

  const logViolation = useCallback(
    (type: ViolationType, details?: string) => {
      // Deduplicate: if the same violation type fired within the last 500ms, skip it.
      const now = Date.now();
      const lastTime = lastViolationTimeRef.current[type] ?? 0;
      if (now - lastTime < 500) {
        return;
      }

      // For blur events specifically: if a visibilitychange already fired in the last 500ms
      // (or vice versa), deduplicate as they represent the same user action (tab switch).
      if (type === "blur") {
        const lastTabSwitch = lastViolationTimeRef.current["tab_switch"] ?? 0;
        if (now - lastTabSwitch < 500) return;
      }
      if (type === "tab_switch") {
        const lastBlur = lastViolationTimeRef.current["blur"] ?? 0;
        if (now - lastBlur < 500) return;
      }

      lastViolationTimeRef.current[type] = now;

      setViolationCount((prev) => {
        const next = prev + 1;
        if (typeof window !== "undefined") {
          console.info("[exam-mode] violation", { type, details, count: next });
        }
        onViolationRef.current?.({ type, details, count: next });

        if (policy.immediateTerminate) {
          onTerminateRef.current?.(`Violation: ${type}`);
          return next;
        }

        if (!policy.warnOnly && next >= policy.autoTerminateAt) {
          onTerminateRef.current?.("Maximum violations reached");
          return next;
        }

        setWarningMessage(
          `Exam mode violation detected (${type.replaceAll("_", " ")}). Count: ${next}`
        );
        return next;
      });
    },
    [policy.autoTerminateAt, policy.immediateTerminate, policy.warnOnly]
  );

  const requestFullscreen = useCallback(async () => {
    if (!policy.fullscreenRequired) return;
    if (typeof document === "undefined") return;
    if (document.fullscreenElement) return;

    try {
      await document.documentElement.requestFullscreen();
      hadFullscreenRef.current = true;
    } catch {
      // Fullscreen was blocked by the browser. This is NOT a violation —
      // the user never had fullscreen, so exiting it is not cheating.
      setWarningMessage("Fullscreen request was blocked by the browser.");
    }
  }, [policy.fullscreenRequired]);

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
      if (document.fullscreenElement) {
        // Entered fullscreen
        hadFullscreenRef.current = true;
        return;
      }
      // Only log violation if user previously HAD fullscreen and left it.
      // If fullscreen was never entered (browser blocked it), no violation.
      if (hadFullscreenRef.current) {
        logViolation("fullscreen_exit", "User exited fullscreen mode");
        hadFullscreenRef.current = false;
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        logViolation("tab_switch", "Document became hidden (tab switch)");
      }
    };

    // Only log blur as a separate violation if the document is NOT hidden.
    // If the document IS hidden, visibilitychange already handled it.
    const onWindowBlur = () => {
      if (document.visibilityState === "hidden") {
        // visibilitychange will handle this — don't double-count
        return;
      }
      logViolation("blur", "Window lost focus (non-tab-switch)");
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
      hadFullscreenRef.current = false;
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
