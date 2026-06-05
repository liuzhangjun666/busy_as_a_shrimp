export interface HttpClientLike {
  get<T>(path: string, options?: Record<string, unknown>): Promise<T>;
  put<T>(path: string, options?: Record<string, unknown>): Promise<T>;
  post<T>(path: string, options?: Record<string, unknown>): Promise<T>;
  delete<T>(path: string, options?: Record<string, unknown>): Promise<T>;
}
