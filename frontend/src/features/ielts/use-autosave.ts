"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";

type UseAutosaveOptions<TPayload> = {
  enabled: boolean;
  storageKey: string;
  payload: TPayload;
  onSave: (payload: TPayload) => Promise<void>;
  intervalMs?: number;
};

export function useAutosave<TPayload>(options: UseAutosaveOptions<TPayload>) {
  const payloadRef = useRef(options.payload);

  useEffect(() => {
    payloadRef.current = options.payload;
  }, [options.payload]);

  const persistLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(options.storageKey, JSON.stringify(payloadRef.current));
    } catch {
      // ignore localStorage quota errors
    }
  }, [options.storageKey]);

  const restoreLocal = useCallback((): TPayload | null => {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(options.storageKey);
      if (!raw) return null;
      return JSON.parse(raw) as TPayload;
    } catch {
      return null;
    }
  }, [options.storageKey]);

  const clearLocal = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(options.storageKey);
    } catch {
      // ignore
    }
  }, [options.storageKey]);

  const forceSave = useCallback(async () => {
    try {
      await options.onSave(payloadRef.current);
      clearLocal();
    } catch {
      persistLocal();
    }
  }, [clearLocal, options, persistLocal]);

  useEffect(() => {
    if (!options.enabled) return;

    const id = window.setInterval(() => {
      void forceSave();
    }, options.intervalMs ?? 30_000);

    return () => {
      window.clearInterval(id);
    };
  }, [forceSave, options.enabled, options.intervalMs]);

  useEffect(() => {
    if (!options.enabled) return;

    const onBeforeUnload = () => {
      persistLocal();
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [options.enabled, persistLocal]);

  return useMemo(
    () => ({
      forceSave,
      persistLocal,
      restoreLocal,
      clearLocal,
    }),
    [clearLocal, forceSave, persistLocal, restoreLocal]
  );
}