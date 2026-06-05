"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { getDictApi } from "@/api";
import type { DictResult } from "@/api/dict-api";

const DICT_STALE_TIME = 6 * 60 * 60 * 1000;
const DICT_GC_TIME = 24 * 60 * 60 * 1000;

export function useDictQuery(
  type: string,
  options?: {
    enabled?: boolean;
    version?: string;
  }
): UseQueryResult<DictResult, Error> {
  const version = options?.version ?? "v1";
  return useQuery({
    queryKey: ["dict", version, type],
    queryFn: () => getDictApi().getByType(type, version),
    enabled: (options?.enabled ?? true) && Boolean(type),
    staleTime: DICT_STALE_TIME,
    gcTime: DICT_GC_TIME,
    retry: 1
  });
}
