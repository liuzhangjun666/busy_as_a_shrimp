import type { HttpClientLike } from "./http";

export interface InsightTranslationResult {
  title: string;
  summary?: string;
  incomeSnippet?: string;
}

export function createPublicTranslateApi(client: Pick<HttpClientLike, "post">) {
  return {
    translateInsight(payload: {
      title: string;
      summary?: string;
      incomeSnippet?: string;
      scene?: "ai_brief" | "solo_signal";
    }): Promise<InsightTranslationResult> {
      return client.post<InsightTranslationResult>("/public/translate-insight", payload);
    }
  };
}
