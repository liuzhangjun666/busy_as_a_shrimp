import { describe, expect, it, vi } from "vitest";
import { createMatchApi } from "../match-api";

describe("createMatchApi", () => {
  it("calls list endpoint", async () => {
    const client = {
      get: vi.fn().mockResolvedValue([{ matchId: 30001, score: 92.5 }]),
      post: vi.fn()
    };
    const api = createMatchApi(client);

    const list = await api.list();

    expect(client.get).toHaveBeenCalledWith("/match/list");
    expect(list[0]?.matchId).toBe(30001);
  });

  it("calls run, confirm and reject endpoints", async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ status: "queued" })
    };
    const api = createMatchApi(client);

    await api.run({ needId: 90001 });
    await api.runPool({ topK: 12 });
    await api.confirm(30001);
    await api.reject(30001);

    expect(client.post).toHaveBeenNthCalledWith(1, "/match/run", { needId: 90001 });
    expect(client.post).toHaveBeenNthCalledWith(2, "/match/run-pool", { topK: 12 });
    expect(client.post).toHaveBeenNthCalledWith(3, "/match/30001/confirm");
    expect(client.post).toHaveBeenNthCalledWith(4, "/match/30001/reject");
  });
});
