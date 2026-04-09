"use client";

import { useCallback, useEffect, useState } from "react";

export const GHOST_COOKIE = "swr_ghost";

function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${name}=`))
    ?.split("=")[1];
}

function setCookie(name: string, value: string, days = 1) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/`;
}

export function useGhostMode() {
  const [isGhost, setIsGhost] = useState(false);

  useEffect(() => {
    setIsGhost(getCookie(GHOST_COOKIE) === "1");
  }, []);

  const enableGhostMode = useCallback(() => {
    setCookie(GHOST_COOKIE, "1", 1);
    setIsGhost(true);
  }, []);

  const disableGhostMode = useCallback(() => {
    deleteCookie(GHOST_COOKIE);
    setIsGhost(false);
  }, []);

  return { isGhost, enableGhostMode, disableGhostMode };
}
