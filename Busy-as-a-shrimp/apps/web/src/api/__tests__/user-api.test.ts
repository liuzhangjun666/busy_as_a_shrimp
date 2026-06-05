import { describe, expect, it, vi } from "vitest";
import { createUserApi } from "../user-api";

describe("createUserApi", () => {
  it("calls register endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        token: "register-token",
        user: {
          userId: 10086,
          role: "service",
          memberLevel: "free",
          status: "active",
          city: null,
          district: null,
          inviteCode: "SHR-MSW001",
          speakMutedUntil: null,
          avatar: null
        }
      }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.register({
      phone: "13800000000",
      verifyCode: "123456",
      captchaId: "cap-id-1",
      captchaValue: "A1b2",
      password: "abc12345"
    });

    expect(client.post).toHaveBeenCalledWith("/user/register", {
      phone: "13800000000",
      verifyCode: "123456",
      captchaId: "cap-id-1",
      captchaValue: "A1b2",
      password: "abc12345"
    });
    expect(result.token).toBe("register-token");
    expect(result.user.userId).toBe(10086);
  });

  it("calls login endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        token: "mock-jwt-token",
        user: {
          userId: 10086,
          role: "service",
          memberLevel: "free",
          status: "active",
          city: null,
          district: null,
          inviteCode: "SHR-MSW001",
          speakMutedUntil: null,
          avatar: null
        }
      }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.login({
      phone: "13800000000",
      password: "abc12345"
    });

    expect(client.post).toHaveBeenCalledWith("/user/login", {
      phone: "13800000000",
      password: "abc12345"
    });
    expect(result.token).toBe("mock-jwt-token");
  });

  it("calls login endpoint with sms payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({
        token: "mock-sms-token",
        user: {
          userId: 10087,
          role: "service",
          memberLevel: "free",
          status: "active",
          city: null,
          district: null,
          inviteCode: "SHR-MSW002",
          speakMutedUntil: null,
          avatar: null
        }
      }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.login({
      phone: "13800000001",
      smsCode: "123456"
    });

    expect(client.post).toHaveBeenCalledWith("/user/login", {
      phone: "13800000001",
      smsCode: "123456"
    });
    expect(result.token).toBe("mock-sms-token");
  });

  it("calls reset password endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ success: true }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.resetPassword({
      phone: "13800000002",
      verifyCode: "654321",
      captchaId: "cap-id-2",
      captchaValue: "Z9x8",
      password: "newpass123"
    });

    expect(client.post).toHaveBeenCalledWith("/user/reset-password", {
      phone: "13800000002",
      verifyCode: "654321",
      captchaId: "cap-id-2",
      captchaValue: "Z9x8",
      password: "newpass123"
    });
    expect(result.success).toBe(true);
  });

  it("calls send sms endpoint with payload", async () => {
    const client = {
      post: vi.fn().mockResolvedValue({ success: true, message: "验证码已发送" }),
      get: vi.fn(),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.sendSms({
      phone: "13800000000",
      captchaId: "cap-id-1",
      captchaValue: "A1b2",
      purpose: "register"
    });

    expect(client.post).toHaveBeenCalledWith("/user/send-sms", {
      phone: "13800000000",
      captchaId: "cap-id-1",
      captchaValue: "A1b2",
      purpose: "register"
    });
    expect(result.success).toBe(true);
  });

  it("calls captcha endpoint", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn().mockResolvedValue({ captchaId: "id-1", imageBase64: "base64-content" }),
      put: vi.fn()
    };
    const api = createUserApi(client);

    const result = await api.fetchCaptcha();

    expect(client.get).toHaveBeenCalledWith("/user/captcha");
    expect(result.captchaId).toBe("id-1");
  });

  it("calls profile update and role update endpoints", async () => {
    const client = {
      post: vi.fn(),
      get: vi.fn().mockResolvedValue({ userId: 10001, city: "Shanghai", role: "both" }),
      put: vi.fn().mockResolvedValue({ updated: true })
    };
    const api = createUserApi(client);

    await api.updateInfo({ city: "Hangzhou", district: "Xihu" });
    await api.updateRole({ role: "service" });

    expect(client.put).toHaveBeenNthCalledWith(1, "/user/info", {
      city: "Hangzhou",
      district: "Xihu"
    });
    expect(client.put).toHaveBeenNthCalledWith(2, "/user/role", { role: "service" });
  });

  it("sends attribution when subscribing and supports campus unlock APIs", async () => {
    const client = {
      post: vi
        .fn()
        .mockResolvedValueOnce({ success: true, memberLevel: "monthly" })
        .mockResolvedValueOnce({ success: true, unlocked: true, purchaseId: 11, amount: 9.9 }),
      get: vi.fn().mockResolvedValueOnce({ unlocked: true, purchaseId: 11 }),
      put: vi.fn()
    };
    const api = createUserApi(client);

    await api.subscribePlan("monthly", {
      sourceModule: "ai_brief",
      sourceAction: "header_cta"
    });
    await api.getCampusUnlockStatus();
    await api.checkoutCampusUnlock({
      sourceModule: "campus",
      sourceAction: "paywall_cta"
    });

    expect(client.post).toHaveBeenNthCalledWith(1, "/membership/subscribe", {
      planCode: "monthly",
      sourceModule: "ai_brief",
      sourceAction: "header_cta"
    });
    expect(client.get).toHaveBeenCalledWith("/campus/unlock/status");
    expect(client.post).toHaveBeenNthCalledWith(2, "/campus/unlock/checkout", {
      sourceModule: "campus",
      sourceAction: "paywall_cta"
    });
  });
});
