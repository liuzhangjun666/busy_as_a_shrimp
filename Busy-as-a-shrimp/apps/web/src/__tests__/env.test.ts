import { beforeEach, describe, expect, it } from "vitest";
import { loadClientEnv } from "../env";

describe("web loadClientEnv", () => {
  const env = process.env as Record<string, string | undefined>;
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalAppEnv = process.env.NEXT_PUBLIC_APP_ENV;
  const originalNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    env.NEXT_PUBLIC_APP_ENV = originalAppEnv;
    env.NODE_ENV = originalNodeEnv;
  });

  it("throws when NEXT_PUBLIC_API_BASE_URL is missing", () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    expect(() => loadClientEnv()).toThrowError("Missing NEXT_PUBLIC_API_BASE_URL");
  });

  it("returns parsed env values", () => {
    env.NEXT_PUBLIC_API_BASE_URL = "http://localhost:8081/api/v1";
    env.NEXT_PUBLIC_APP_ENV = "local";

    expect(loadClientEnv()).toEqual({
      apiBaseUrl: "http://localhost:8081/api/v1",
      appEnv: "local"
    });
  });

  it("derives prod appEnv from NODE_ENV when NEXT_PUBLIC_APP_ENV is missing", () => {
    env.NEXT_PUBLIC_API_BASE_URL = "https://api.example.com/api/v1";
    delete process.env.NEXT_PUBLIC_APP_ENV;
    env.NODE_ENV = "production";

    expect(loadClientEnv()).toEqual({
      apiBaseUrl: "https://api.example.com/api/v1",
      appEnv: "prod"
    });
  });
});
