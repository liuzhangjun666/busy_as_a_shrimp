import type { HttpClientLike } from "./http";

export type AnnouncementType = "notice" | "activity" | "warning";

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: AnnouncementType;
  publishedAt: string;
  publishedBy: string;
}

export function createAnnouncementApi(client: Pick<HttpClientLike, "get">) {
  return {
    list(): Promise<Announcement[]> {
      return client.get<Announcement[]>("/public/announcements");
    }
  };
}
