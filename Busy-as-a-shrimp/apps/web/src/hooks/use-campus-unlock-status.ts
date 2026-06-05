"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getUserApi } from "@/api";
import type { CampusUnlockStatus } from "@/api/user-api";

export const CAMPUS_UNLOCK_QUERY_KEY = ["campus", "unlock-status"] as const;

export function useCampusUnlockStatus(enabled: boolean): UseQueryResult<CampusUnlockStatus, Error> {
  return useQuery({
    queryKey: CAMPUS_UNLOCK_QUERY_KEY,
    queryFn: () => getUserApi().getCampusUnlockStatus(),
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1
  });
}
