import { describe, expect, it, vi } from "vitest";
import { createHttpClient } from "../index";

describe("createHttpClient", () => {
  it("unwraps data when API returns success payload", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: true, message: "ok", data: { id: 7 } })
    });

    const client = createHttpClient({ baseUrl: "http://localhost:8081/api/v1", fetcher });
    const data = await client.get<{ id: number }>("/user/info");

    expect(data).toEqual({ id: 7 });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("throws HttpClientError when API returns success=false", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ success: false, message: "token expired", data: null })
    });

    const client = createHttpClient({ baseUrl: "http://localhost:8081/api/v1", fetcher });

    await expect(client.get("/user/info")).rejects.toMatchObject({
      code: "AUTH_EXPIRED"
    });
  });

  it("throws HttpClientError when HTTP status is not ok", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ success: false, message: "too many requests", data: null })
    });

    const client = createHttpClient({ baseUrl: "http://localhost:8081/api/v1", fetcher });

    await expect(client.get("/user/info")).rejects.toMatchObject({
      status: 429,
      code: "RATE_LIMITED"
    });
  });

  it("triggers onAuthExpired callback on 401", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ success: false, message: "unauthorized", data: null })
    });
    const onAuthExpired = vi.fn();
    const client = createHttpClient({
      baseUrl: "http://localhost:8081/api/v1",
      fetcher,
      onAuthExpired
    });

    await expect(client.get("/user/info")).rejects.toMatchObject({
      code: "AUTH_EXPIRED"
    });
    expect(onAuthExpired).toHaveBeenCalledTimes(1);
  });
});
