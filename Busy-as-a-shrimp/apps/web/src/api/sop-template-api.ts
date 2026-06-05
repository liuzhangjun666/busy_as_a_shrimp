import type { HttpClientLike } from "./http";

export interface SopTemplateSummary {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  publishedAt: string | null;
  estimatedReadMinutes: number;
  previewText: string;
}

export interface SopTemplateListResponse {
  list: SopTemplateSummary[];
  page: number;
  pageSize: number;
  total: number;
  categories: string[];
}

export interface SopTemplatePreviewDetail extends SopTemplateSummary {
  viewCount: number;
  sourceUrl: string | null;
  previewContent: string;
  requiresMembership: true;
}

export interface SopTemplateMemberDetail extends SopTemplateSummary {
  viewCount: number;
  sourceUrl: string | null;
  content: string;
  contactInfo: string | null;
  copyText: string;
}

export function createSopTemplateApi(client: Pick<HttpClientLike, "get">) {
  return {
    list(params?: {
      page?: number;
      pageSize?: number;
      keyword?: string;
      category?: string;
    }): Promise<SopTemplateListResponse> {
      const query = new URLSearchParams();
      if (params?.page !== undefined) {
        query.set("page", String(params.page));
      }
      if (params?.pageSize !== undefined) {
        query.set("pageSize", String(params.pageSize));
      }
      if (params?.keyword) {
        query.set("keyword", params.keyword);
      }
      if (params?.category) {
        query.set("category", params.category);
      }
      const suffix = query.toString();
      return client.get<SopTemplateListResponse>(
        `/public/sop-templates${suffix ? `?${suffix}` : ""}`
      );
    },
    preview(id: string): Promise<SopTemplatePreviewDetail> {
      return client.get<SopTemplatePreviewDetail>(`/public/sop-templates/${id}`);
    },
    detail(id: string): Promise<SopTemplateMemberDetail> {
      return client.get<SopTemplateMemberDetail>(`/sop-templates/${id}`);
    }
  };
}
