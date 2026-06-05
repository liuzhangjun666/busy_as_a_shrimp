import { beforeEach, describe, expect, it } from "vitest";
import { loadClientEnv } from "../env";

describe("admin loadClientEnv", () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;

  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    process.env.NEXT_PUBLIC_APP_ENV = originalAppEnv;
  });

  it("throws when NEXT_PUBLIC_API_BASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    process.env.NEXT_PUBLIC_APP_ENV = "local";

    expect(() => loadClientEnv()).toThrowError("Missing NEXT_PUBLIC_API_BASE_URL");
  });

  it("returns parsed env values", () => {
    process.env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8081/api/v1";
    process.env.NEXT_PUBLIC_APP_ENV = "local";

    expect(loadClientEnv()).toEqual({
      apiBaseUrl: "http://localhost:8081/api/v1",
      appEnv: "local"
    });
  });
});
