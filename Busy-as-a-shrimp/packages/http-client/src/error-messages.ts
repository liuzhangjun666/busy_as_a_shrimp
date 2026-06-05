import { HttpClientError, type HttpClientErrorCode } from "./errors";

const MESSAGE_MAP: Record<HttpClientErrorCode, string> = {
  AUTH_EXPIRED: "登录状态已过期，请重新登录",
  RATE_LIMITED: "请求过于频繁，请稍后再试",
  INVALID_API_RESPONSE: "接口返回格式异常，请联系管理员",
  BUSINESS_ERROR: "业务请求失败，请检查输入后重试",
  HTTP_ERROR: "网络请求失败，请稍后重试",
  SERVER_ERROR: "服务端异常，请稍后重试"
};

export function resolveClientError(error: unknown): { code: HttpClientErrorCode; message: string } {
  if (error instanceof HttpClientError) {
    const shouldUseBackendMessage =
      typeof error.message === "string" &&
      error.message.trim().length > 0 &&
      !/^HTTP_\d+$/.test(error.message) &&
      error.message !== "API_BUSINESS_ERROR";

    return {
      code: error.code,
      message: shouldUseBackendMessage ? error.message : MESSAGE_MAP[error.code]
    };
  }

  return {
    code: "BUSINESS_ERROR",
    message: "系统繁忙，请稍后重试"
  };
}
