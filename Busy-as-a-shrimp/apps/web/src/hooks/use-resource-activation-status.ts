"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getResourceApi } from "@/api";
import type { ResourceItem } from "@/api/resource-api";

export const RESOURCE_ACTIVATION_QUERY_KEY = ["resource", "activation-status"] as const;

export function useResourceActivationStatus(
  enabled: boolean
): UseQueryResult<ResourceItem[], Error> {
  return useQuery({
    queryKey: RESOURCE_ACTIVATION_QUERY_KEY,
    // Activation only depends on the current user's own resources, not the full public list.
    queryFn: () => getResourceApi().mine(),
    enabled,
    staleTime: 15_000,
    gcTime: 5 * 60_000,
    retry: 1
  });
}
