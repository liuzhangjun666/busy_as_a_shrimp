import { describe, expect, it, vi } from "vitest";
import { createAdminApi } from "../admin-api";

describe("createAdminApi", () => {
  it("loads dashboard stats", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        totalUsers: 100,
        activeUsers: 90,
        totalResources: 20,
        pendingResources: 3,
        activeCaptains: 12,
        matchRate: 50,
        announcementCount: 2
      }),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const stats = await api.stats();

    expect(client.get).toHaveBeenCalledWith("/admin/stats");
    expect(stats.totalUsers).toBe(100);
  });

  it("loads users/resources and sends review action", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce({
          list: [{ userId: 10001 }],
          page: 1,
          pageSize: 20,
          total: 1
        })
        .mockResolvedValueOnce({
          list: [{ resourceId: 20001, status: "pending", tags: [] }],
          page: 1,
          pageSize: 20,
          total: 1
        }),
      put: vi.fn().mockResolvedValue({ resourceId: 20001, status: "active" }),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    await api.users();
    await api.resources();
    await api.reviewResource(20001, "approve");

    expect(client.get).toHaveBeenNthCalledWith(1, "/admin/users");
    expect(client.get).toHaveBeenNthCalledWith(2, "/admin/resources");
    expect(client.put).toHaveBeenCalledWith("/admin/resources/20001", {
      body: { decision: "approve" }
    });
  });

  it("loads dict types and cascades dict data query", async () => {
    const client = {
      get: vi
        .fn()
        .mockResolvedValueOnce([
          { dictId: 1, dictName: "任务状态", dictType: "task_status", status: "normal" }
        ])
        .mockResolvedValueOnce([
          {
            dictDataId: 10,
            dictCode: "PENDING",
            dictLabel: "待处理",
            dictValue: "pending",
            dictSort: 1,
            status: "normal"
          }
        ]),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const types = await api.dictTypes();
    const data = await api.dictData("task_status");

    expect(types).toHaveLength(1);
    expect(data).toHaveLength(1);
    expect(client.get).toHaveBeenNthCalledWith(1, "/admin/dict/types");
    expect(client.get).toHaveBeenNthCalledWith(2, "/admin/dict/data?dictType=task_status");
  });

  it("creates, updates and deletes dict data", async () => {
    const client = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({
        dictDataId: 11,
        dictCode: "ARCHIVED",
        dictLabel: "归档",
        dictValue: "archived",
        dictSort: 5,
        status: "disabled"
      }),
      post: vi.fn().mockResolvedValue({
        dictDataId: 11,
        dictCode: "ARCHIVED",
        dictLabel: "已归档",
        dictValue: "archived",
        dictSort: 4,
        status: "normal"
      }),
      delete: vi.fn().mockResolvedValue({ dictDataId: 11 })
    };
    const api = createAdminApi(client);

    await api.createDictData({
      dictType: "task_status",
      dictCode: "ARCHIVED",
      dictLabel: "已归档",
      dictValue: "archived",
      dictSort: 4,
      status: "normal"
    });
    await api.updateDictData(11, {
      dictCode: "ARCHIVED",
      dictLabel: "归档",
      dictValue: "archived",
      dictSort: 5,
      status: "disabled"
    });
    await api.deleteDictData(11);

    expect(client.post).toHaveBeenCalledWith("/admin/dict/data", {
      body: {
        dictType: "task_status",
        dictCode: "ARCHIVED",
        dictLabel: "已归档",
        dictValue: "archived",
        dictSort: 4,
        status: "normal"
      }
    });
    expect(client.put).toHaveBeenCalledWith("/admin/dict/data/11", {
      body: {
        dictCode: "ARCHIVED",
        dictLabel: "归档",
        dictValue: "archived",
        dictSort: 5,
        status: "disabled"
      }
    });
    expect(client.delete).toHaveBeenCalledWith("/admin/dict/data/11");
  });

  it("creates, updates and deletes dict type", async () => {
    const client = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({
        dictId: 4,
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }),
      post: vi.fn().mockResolvedValue({
        dictId: 4,
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }),
      delete: vi.fn().mockResolvedValue({ dictId: 4 })
    };
    const api = createAdminApi(client);

    await api.createDictType({
      dictName: "任务状态",
      dictType: "task_status",
      status: "normal"
    });
    await api.updateDictType(4, {
      dictName: "任务状态",
      dictType: "task_status",
      status: "disabled"
    });
    await api.deleteDictType(4);

    expect(client.post).toHaveBeenCalledWith("/admin/dict/types", {
      body: {
        dictName: "任务状态",
        dictType: "task_status",
        status: "normal"
      }
    });
    expect(client.put).toHaveBeenCalledWith("/admin/dict/types/4", {
      body: {
        dictName: "任务状态",
        dictType: "task_status",
        status: "disabled"
      }
    });
    expect(client.delete).toHaveBeenCalledWith("/admin/dict/types/4");
  });

  it("loads admin matches", async () => {
    const client = {
      get: vi.fn().mockResolvedValue([
        {
          matchId: 30001,
          needId: 90001,
          resourceId: 20001,
          score: 91.2,
          status: "confirmed",
          pushTime: "2026-03-31T00:00:00.000Z",
          feedback: 1
        }
      ]),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const matches = await api.matches();

    expect(client.get).toHaveBeenCalledWith("/admin/matches");
    expect(matches).toHaveLength(1);
    expect(matches[0]).toMatchObject({
      matchId: 30001,
      needId: 90001,
      resourceId: 20001,
      status: "confirmed"
    });
  });

  it("loads brush-order penalties with filters", async () => {
    const client = {
      get: vi.fn().mockResolvedValue({
        list: [
          {
            penaltyId: 1,
            userId: 10001,
            inviteRecordId: 20001,
            triggerReasons: ["same_ip_pair"],
            beforeCaptainLevel: "advanced",
            status: "applied",
            appliedAt: "2026-04-09T00:00:00.000Z",
            affectedCommissionCount: 2
          }
        ],
        page: 2,
        pageSize: 10,
        total: 23
      }),
      put: vi.fn(),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const result = await api.brushOrderPenalties({
      status: "applied",
      userId: 10001,
      page: 2,
      pageSize: 10
    });

    expect(client.get).toHaveBeenCalledWith(
      "/admin/risk/brush-order-penalties?status=applied&userId=10001&page=2&pageSize=10"
    );
    expect(result.total).toBe(23);
    expect(result.list[0].penaltyId).toBe(1);
  });

  it("reviews brush-order penalty", async () => {
    const client = {
      get: vi.fn(),
      put: vi.fn().mockResolvedValue({
        penaltyId: 1,
        userId: 10001,
        inviteRecordId: 20001,
        triggerReasons: ["same_ip_pair"],
        beforeCaptainLevel: "advanced",
        status: "confirmed",
        reviewedBy: 1,
        appliedAt: "2026-04-09T00:00:00.000Z",
        reviewedAt: "2026-04-09T01:00:00.000Z",
        affectedCommissionCount: 2
      }),
      post: vi.fn(),
      delete: vi.fn()
    };
    const api = createAdminApi(client);

    const result = await api.reviewBrushOrderPenalty(1, {
      decision: "confirm",
      note: "manual review passed"
    });

    expect(client.put).toHaveBeenCalledWith("/admin/risk/brush-order-penalties/1/review", {
      body: {
        decision: "confirm",
        note: "manual review passed"
      }
    });
    expect(result.status).toBe("confirmed");
  });
});
