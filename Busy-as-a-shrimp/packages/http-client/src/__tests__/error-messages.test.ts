import { describe, expect, it } from "vitest";
import { HttpClientError } from "../errors";
import { resolveClientError } from "../error-messages";

describe("resolveClientError", () => {
  it("prefers backend message when available", () => {
    const error = new HttpClientError("AUTH_EXPIRED", "token expired", 401);
    const result = resolveClientError(error);

    expect(result.code).toBe("AUTH_EXPIRED");
    expect(result.message).toBe("token expired");
  });

  it("maps generic HTTP message to localized fallback", () => {
    const error = new HttpClientError("AUTH_EXPIRED", "HTTP_401", 401);
    const result = resolveClientError(error);

    expect(result.code).toBe("AUTH_EXPIRED");
    expect(result.message).toContain("登录");
  });

  it("returns fallback for unknown errors", () => {
    const result = resolveClientError(new Error("raw error"));
    expect(result.code).toBe("BUSINESS_ERROR");
    expect(result.message).toBe("系统繁忙，请稍后重试");
  });
});
