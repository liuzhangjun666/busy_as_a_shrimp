export type HttpClientErrorCode =
  | "AUTH_EXPIRED"
  | "RATE_LIMITED"
  | "INVALID_API_RESPONSE"
  | "BUSINESS_ERROR"
  | "HTTP_ERROR"
  | "SERVER_ERROR";

export class HttpClientError extends Error {
  code: HttpClientErrorCode;
  status: number;
  errorCode?: string;
  payload?: unknown;

  constructor(
    code: HttpClientErrorCode,
    message: string,
    status: number,
    payload?: unknown,
    errorCode?: string
  ) {
    super(message);
    this.name = "HttpClientError";
    this.code = code;
    this.status = status;
    this.payload = payload;
    this.errorCode = errorCode;
  }
}
