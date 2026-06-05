import type { ActivationDetailsPayload, UploadResourceDto } from "@airp/api-types";
import type { HttpClientLike } from "./http";

export interface ResourceItem {
  resourceId: number | string;
  userId: number | string;
  uploader?: {
    userId?: number | string;
    nickname?: string | null;
    maskedPhone?: string | null;
  } | null;
  resourceType: "skill" | "location" | "account" | "time";
  resourceTypes?: Array<"skill" | "location" | "account" | "time">;
  tags: unknown;
  areaCode?: string | null;
  activationDetails?: ActivationDetailsPayload;
  status: "active" | "inactive" | "pending" | "rejected";
  reviewReason?: string | null;
  reviewEngine?: string | null;
}

export type ResourceTagGroups = Record<string, string[]>;

export function createResourceApi(client: Pick<HttpClientLike, "get" | "post" | "put">) {
  return {
    upload(payload: UploadResourceDto): Promise<{ resourceId: number; reviewStatus: string }> {
      return client.post<{ resourceId: number; reviewStatus: string }>("/resource/upload", payload);
    },
    list(): Promise<ResourceItem[]> {
      return client.get<ResourceItem[]>("/resource/list");
    },
    mine(): Promise<ResourceItem[]> {
      return client.get<ResourceItem[]>("/resource/mine");
    },
    tags(): Promise<ResourceTagGroups> {
      return client.get<ResourceTagGroups>("/resource/tags");
    },
    updateStatus(
      resourceId: number,
      status: "active" | "inactive"
    ): Promise<{ resourceId: number | string; status: string }> {
      return client.put<{ resourceId: number | string; status: string }>(
        `/resource/${resourceId}`,
        {
          status
        }
      );
    }
  };
}
