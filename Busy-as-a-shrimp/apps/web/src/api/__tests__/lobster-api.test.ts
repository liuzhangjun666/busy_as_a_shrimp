import { describe, expect, it, vi } from "vitest";
import { createLobsterApi } from "../lobster-api";

describe("createLobsterApi", () => {
  it("calls smart match endpoint", async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        threadId: "thread-1",
        runId: "run-1"
      })
    };
    const api = createLobsterApi(client);

    const result = await api.triggerMatch("profile", "pool");

    expect(client.post).toHaveBeenCalledWith("/lobster/trigger-match", {
      userProfile: "profile",
      demandPool: "pool"
    });
    expect(result.threadId).toBe("thread-1");
  });

  it("calls public campus opportunities endpoint", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        total: 18,
        page: 1,
        size: 5,
        list: []
      }),
      post: vi.fn()
    };
    const api = createLobsterApi(client);

    const result = await api.getPublicCampusOpportunities(5);

    expect(client.get).toHaveBeenCalledWith("/public/campus-opportunities?limit=5");
    expect(result.total).toBe(18);
    expect(Array.isArray(result.list)).toBe(true);
  });
});
