import { describe, expect, it, vi } from "vitest";
import { createResourceApi } from "../resource-api";

describe("createResourceApi", () => {
  it("calls upload endpoint with normalized payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ resourceId: 20001, reviewStatus: "pending" }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createResourceApi(client);

    await api.upload({
      resourceType: "skill",
      tags: ["短视频", "探店"],
      areaCode: "310000"
    });

    expect(client.post).toHaveBeenCalledWith("/resource/upload", {
      resourceType: "skill",
      tags: ["短视频", "探店"],
      areaCode: "310000"
    });
  });

  it("supports uploading multiple resource types", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ resourceId: 20002, reviewStatus: "pending" }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createResourceApi(client);

    await api.upload({
      resourceType: ["skill", "time"],
      tags: ["activation_resource:skill", "activation_resource:time"]
    });

    expect(client.post).toHaveBeenCalledWith("/resource/upload", {
      resourceType: ["skill", "time"],
      tags: ["activation_resource:skill", "activation_resource:time"]
    });
  });

  it("loads resources and tags", async () => {
    const client = {
      post: vi.fn(),
      put: vi.fn(),
      get: vi
        .fn()
        .mockResolvedValueOnce([{ resourceId: 20001, tags: ["短视频"], status: "active" }])
        .mockResolvedValueOnce({
          location: ["上海", "北京"],
          skill: ["短视频", "直播"]
        })
    };
    const api = createResourceApi(client);

    const list = await api.list();
    const tags = await api.tags();

    expect(list).toHaveLength(1);
    expect(tags).toEqual({
      location: ["上海", "北京"],
      skill: ["短视频", "直播"]
    });
  });

  it("updates resource status", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({ resourceId: 20001, status: "inactive" })
    };
    const api = createResourceApi(client);

    await api.updateStatus(20001, "inactive");

    expect(client.put).toHaveBeenCalledWith("/resource/20001", { status: "inactive" });
  });
});
