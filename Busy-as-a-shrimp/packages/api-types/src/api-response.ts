export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string;
  errorCode: string;
  code: string;
  timestamp: string;
  path: string;
}

export function isApiSuccess<T>(payload: ApiResponse<T>): boolean {
  return payload.success === true;
}
