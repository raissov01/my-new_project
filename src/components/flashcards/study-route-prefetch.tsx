"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";

interface StudyRoutePrefetchProps {
  setId: string;
  enabled?: boolean;
}

export function StudyRoutePrefetch({
  setId,
  enabled = true,
}: StudyRoutePrefetchProps) {
  const router = useRouter();
  const routes = useMemo(
    () => [
      `/sets/${setId}/study`,
      `/sets/${setId}/study?mode=smart`,
      `/sets/${setId}/study?mode=review`,
      `/sets/${setId}/study?view=quiz`,
      `/sets/${setId}/study?view=write`,
      `/sets/${setId}/study?mode=review&view=quiz`,
      `/sets/${setId}/study?mode=review&view=write`,
    ],
    [setId]
  );

  useEffect(() => {
    if (!enabled) return;

    routes.forEach((route) => {
      router.prefetch(route);
    });
  }, [enabled, router, routes]);

  return null;
}
