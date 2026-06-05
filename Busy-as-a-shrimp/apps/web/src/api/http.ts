export interface HttpClientLike {
  get<T>(path: string, options?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, payload?: unknown, options?: Record<string, unknown>): Promise<T>;
  put<T>(path: string, payload?: unknown, options?: Record<string, unknown>): Promise<T>;
}
