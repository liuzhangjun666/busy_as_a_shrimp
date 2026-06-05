export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export function ok<T>(data: T, message = "ok"): ApiResponse<T> {
  return {
    success: true,
    message,
    data
  };
}
