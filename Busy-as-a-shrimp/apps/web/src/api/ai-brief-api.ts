import type { HttpClientLike } from "./http";

export interface AiBriefItem {
  id: string;
  title: string;
  summary?: string;
  sourceName: string;
  sourceUrl: string;
  publishedAt: string;
  createdAt: string;
}

export interface AiBriefListResponse {
  list: AiBriefItem[];
  nextCursor: string | null;
}

export interface AiBriefRefreshResponse {
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

export interface AiBriefRefreshJobStatus {
  jobId: string;
  module: "ai_brief";
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

export function createAiBriefApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    list(params?: { limit?: number; cursor?: string }): Promise<AiBriefListResponse> {
      const query = new URLSearchParams();
      if (params?.limit !== undefined) {
        query.set("limit", String(params.limit));
      }
      if (params?.cursor) {
        query.set("cursor", params.cursor);
      }
      const suffix = query.toString();
      return client.get<AiBriefListResponse>(`/public/ai-briefs${suffix ? `?${suffix}` : ""}`);
    },
    refresh(): Promise<AiBriefRefreshResponse> {
      return client.post<AiBriefRefreshResponse>("/public/ai-briefs/refresh", {});
    },
    refreshStatus(jobId: string): Promise<AiBriefRefreshJobStatus> {
      const query = new URLSearchParams({ jobId });
      return client.get<AiBriefRefreshJobStatus>(
        `/public/ai-briefs/refresh-status?${query.toString()}`
      );
    }
  };
}
