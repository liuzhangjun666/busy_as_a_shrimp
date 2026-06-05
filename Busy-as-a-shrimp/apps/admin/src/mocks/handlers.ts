import { http, HttpResponse } from "msw";

export const handlers = [
  http.get("*/api/v1/admin/stats", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        totalUsers: 1024,
        activeUsers: 912,
        totalResources: 488,
        pendingResources: 18,
        activeCaptains: 66,
        matchRate: 71,
        announcementCount: 4
      }
    });
  }),
  http.get("*/api/v1/admin/users", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          userId: 10001,
          phoneMasked: "138****1234",
          role: "service",
          city: "Shanghai",
          memberLevel: "monthly",
          status: "active",
          createdAt: "2026-03-28T09:00:00.000Z",
          captainLevel: "advanced"
        }
      ]
    });
  }),
  http.get("*/api/v1/admin/resources", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          resourceId: 20001,
          userId: 10001,
          resourceType: "skill",
          tags: ["short-video", "weekend", "shanghai"],
          areaCode: "shanghai",
          priceRange: { min: 1000, max: 3000 },
          status: "pending",
          createdAt: "2026-03-28T09:30:00.000Z"
        }
      ]
    });
  }),
  http.put("*/api/v1/admin/resources/:id", ({ params, request }) => {
    return request.json().then((body) => {
      const decision =
        typeof body === "object" && body !== null && "decision" in body ? body.decision : "reject";
      return HttpResponse.json({
        success: true,
        message: "Resource review completed",
        data: {
          resourceId: Number(params.id),
          status: decision === "approve" ? "active" : "rejected"
        }
      });
    });
  }),
  http.get("*/api/v1/admin/captain/ranking", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          captainId: 10010,
          name: "Captain 10010",
          level: "gold",
          score: 980,
          monthInvites: 12,
          commissionRate: 0.15
        }
      ]
    });
  }),
  http.get("*/api/v1/admin/matches", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          matchId: 30001,
          needId: 90001,
          resourceId: 20001,
          score: 91.2,
          status: "confirmed",
          pushTime: "2026-03-31T00:00:00.000Z",
          feedback: 1
        }
      ]
    });
  })
];
