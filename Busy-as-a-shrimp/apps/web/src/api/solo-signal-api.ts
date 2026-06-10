import type { HttpClientLike } from "./http";

export interface SoloSignalItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  incomeSnippet?: string;
  createdAt: string;
}

export interface SoloSignalListResponse {
  list: SoloSignalItem[];
  nextCursor: string | null;
}

export interface SoloSignalRefreshResponse {
  triggeredAt: string;
  cooldownSeconds: number;
  skipped: boolean;
  reason?: string;
  accepted?: boolean;
  running?: boolean;
  jobId?: string;
  result?: {
    inserted: number;
    fetched: number;
    sources: number;
    errors: number;
  };
}

export interface SoloSignalRefreshJobStatus {
  jobId: string;
  module: "solo_signal";
  status: "running" | "succeeded" | "failed";
  triggeredAt: string;
  startedAt: string;
  finishedAt?: string;
  error?: string;
  result?: {
    inserted: number;
    fetched: number;
    sources: number;
    errors: number;
  };
}

export function createSoloSignalApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    list(params?: { limit?: number; cursor?: string }): Promise<SoloSignalListResponse> {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) {
        query.set("limit", String(params.limit));
      }
      if (params?.cursor) {
        query.set("cursor", params.cursor);
      }

      const suffix = query.toString();
      return client.get<SoloSignalListResponse>(
        `/public/solo-signals${suffix ? `?${suffix}` : ""}`
      );
    },
    refresh(): Promise<SoloSignalRefreshResponse> {
      return client.post<SoloSignalRefreshResponse>("/public/solo-signals/refresh", {});
    },
    refreshStatus(jobId: string): Promise<SoloSignalRefreshJobStatus> {
      const query = new URLSearchParams({ jobId });
      return client.get<SoloSignalRefreshJobStatus>(
        `/public/solo-signals/refresh-status?${query.toString()}`
      );
    }
  };
}
