import type { HttpClientLike } from "./http";

export type ContentType = "card" | "post" | "video_script" | "poster";
export type ContentStatus = "draft" | "pending" | "published" | "rejected";
export type ContentEvent = "view" | "like" | "inquiry";

export interface ContentItem {
  contentId: number;
  contentType: ContentType;
  targetPlatform: string;
  status: ContentStatus;
  contentBody: string;
  publishedAt?: string;
  stats: {
    views: number;
    likes: number;
    inquiries: number;
  };
}

export interface GenerateContentPayload {
  contentType: ContentType;
  targetPlatform: string;
  prompt: string;
}

export interface GenerateContentResult {
  contentId: number;
  status: ContentStatus;
  tokensConsumed: number;
  pointsDeducted: number;
  generatedBody: string;
}

export function createContentApi(client: Pick<HttpClientLike, "get" | "post">) {
  return {
    generate(payload: GenerateContentPayload): Promise<GenerateContentResult> {
      return client.post<GenerateContentResult>("/content/generate", payload);
    },
    list(): Promise<ContentItem[]> {
      return client.get<ContentItem[]>("/content/list");
    },
    publish(id: number): Promise<{
      contentId: number;
      status: ContentStatus;
      publishedAt?: string;
      stats: ContentItem["stats"];
    }> {
      return client.post<{
        contentId: number;
        status: ContentStatus;
        publishedAt?: string;
        stats: ContentItem["stats"];
      }>(`/content/${id}/publish`);
    },
    track(
      id: number,
      event: ContentEvent
    ): Promise<{ contentId: number; stats: ContentItem["stats"] }> {
      return client.post<{ contentId: number; stats: ContentItem["stats"] }>(
        `/content/${id}/stats`,
        {
          event
        }
      );
    }
  };
}
