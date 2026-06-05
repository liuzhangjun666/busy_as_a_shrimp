import type { HttpClientLike } from "./http";

export interface DictItem {
  code: string;
  label: string;
  value: string;
  sort: number;
  remark?: string;
}

export interface DictResult {
  type: string;
  version: string;
  updatedAt: string | null;
  items: DictItem[];
}

export function createDictApi(client: Pick<HttpClientLike, "get">) {
  return {
    getByType(type: string, version = "v1"): Promise<DictResult> {
      const query = new URLSearchParams({
        type,
        version
      });
      return client.get<DictResult>(`/public/dict?${query.toString()}`);
    }
  };
}
