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
    }
  };
}
