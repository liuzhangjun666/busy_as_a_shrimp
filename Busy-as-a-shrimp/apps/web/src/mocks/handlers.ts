import { http, HttpResponse } from "msw";

type DictItem = {
  code: string;
  label: string;
  value: string;
  sort: number;
};

type MockResourceType = "skill" | "location" | "account" | "time";

type MockResource = {
  resourceId: number;
  resourceType: MockResourceType;
  resourceTypes: MockResourceType[];
  tags: string[];
  status: "active" | "inactive" | "pending" | "rejected";
  areaCode?: string;
};

const mockResources: MockResource[] = [];
let resourceCounter = 20088;

const dictFixtures: Record<string, DictItem[]> = {
  RESOURCE_TYPE: [
    { code: "skill", label: "技能", value: "技能", sort: 1 },
    { code: "location", label: "地点", value: "地点", sort: 2 },
    { code: "account", label: "账号", value: "账号", sort: 3 },
    { code: "time", label: "时间", value: "时间", sort: 4 }
  ],
  RESOURCE_SKILL_TAGS: [
    { code: "short_video", label: "短视频", value: "短视频", sort: 1 },
    { code: "short_video_script", label: "短视频脚本", value: "短视频脚本", sort: 2 },
    { code: "short_video_shooting", label: "短视频拍摄", value: "短视频拍摄", sort: 3 },
    { code: "video_editing", label: "视频剪辑", value: "视频剪辑", sort: 4 },
    { code: "live_stream", label: "直播", value: "直播", sort: 5 },
    { code: "live_stream_ops", label: "直播运营", value: "直播运营", sort: 6 },
    { code: "account_ops", label: "账号代运营", value: "账号代运营", sort: 7 },
    { code: "brand_copywriting", label: "文案策划", value: "文案策划", sort: 8 },
    { code: "event_execution", label: "活动执行", value: "活动执行", sort: 9 },
    { code: "corporate_live", label: "企业自播", value: "企业自播", sort: 10 },
    { code: "ip_incubation", label: "IP孵化", value: "IP孵化", sort: 11 },
    { code: "private_domain_ops", label: "私域运营", value: "私域运营", sort: 12 },
    { code: "ai_editing", label: "AI剪辑", value: "AI剪辑", sort: 13 },
    { code: "graphic_design", label: "平面设计", value: "平面设计", sort: 14 },
    { code: "creator_bd", label: "达人对接", value: "达人对接", sort: 15 },
    { code: "visit_store_shoot", label: "探店拍摄", value: "探店拍摄", sort: 16 }
  ],
  RESOURCE_WISH_TAGS: [
    { code: "seek_partner", label: "寻找合伙人", value: "寻找合伙人", sort: 1 },
    { code: "resource_swap", label: "资源互换", value: "资源互换", sort: 2 },
    { code: "cross_industry", label: "异业合作", value: "异业合作", sort: 3 },
    { code: "traffic_share", label: "流量共享", value: "流量共享", sort: 4 },
    { code: "project_outsource", label: "项目外包", value: "项目外包", sort: 5 },
    { code: "recruit_anchor", label: "招募主播", value: "招募主播", sort: 6 },
    { code: "channel_cooperation", label: "渠道合作", value: "渠道合作", sort: 7 },
    { code: "brand_exposure", label: "品牌曝光", value: "品牌曝光", sort: 8 },
    { code: "content_cocreation", label: "内容共创", value: "内容共创", sort: 9 }
  ],
  RESOURCE_NEED_TAGS: [
    { code: "long_term", label: "长期", value: "长期", sort: 1 },
    { code: "short_term", label: "短期", value: "短期", sort: 2 },
    { code: "weekend", label: "周末", value: "周末", sort: 3 },
    { code: "part_time", label: "兼职", value: "兼职", sort: 4 },
    { code: "one_time", label: "单次结", value: "单次结", sort: 5 },
    { code: "remote", label: "远程", value: "远程", sort: 6 },
    { code: "onsite", label: "到场", value: "到场", sort: 7 },
    { code: "urgent", label: "急单", value: "急单", sort: 8 },
    { code: "commission", label: "佣金制", value: "佣金制", sort: 9 },
    { code: "revenue_share", label: "分成合作", value: "分成合作", sort: 10 }
  ],
  RESOURCE_REGION_CODES: [
    { code: "000000", label: "全国", value: "全国", sort: 1 },
    { code: "110000", label: "北京", value: "北京", sort: 2 },
    { code: "310000", label: "上海", value: "上海", sort: 3 },
    { code: "440100", label: "广州", value: "广州", sort: 4 },
    { code: "440300", label: "深圳", value: "深圳", sort: 5 },
    { code: "330100", label: "杭州", value: "杭州", sort: 6 },
    { code: "510100", label: "成都", value: "成都", sort: 7 },
    { code: "420100", label: "武汉", value: "武汉", sort: 8 },
    { code: "320100", label: "南京", value: "南京", sort: 9 },
    { code: "610100", label: "西安", value: "西安", sort: 10 },
    { code: "500000", label: "重庆", value: "重庆", sort: 11 },
    { code: "120000", label: "天津", value: "天津", sort: 12 }
  ],
  RESOURCE_CITY_NODES: [
    { code: "nationwide", label: "全国", value: "全国", sort: 1 },
    { code: "beijing", label: "北京", value: "北京", sort: 2 },
    { code: "shanghai", label: "上海", value: "上海", sort: 3 },
    { code: "guangzhou", label: "广州", value: "广州", sort: 4 },
    { code: "shenzhen", label: "深圳", value: "深圳", sort: 5 },
    { code: "hangzhou", label: "杭州", value: "杭州", sort: 6 },
    { code: "chengdu", label: "成都", value: "成都", sort: 7 },
    { code: "wuhan", label: "武汉", value: "武汉", sort: 8 },
    { code: "nanjing", label: "南京", value: "南京", sort: 9 },
    { code: "xian", label: "西安", value: "西安", sort: 10 },
    { code: "chongqing", label: "重庆", value: "重庆", sort: 11 },
    { code: "tianjin", label: "天津", value: "天津", sort: 12 }
  ],
  RESOURCE_CUSTOM_TAGS: [
    { code: "local_life", label: "本地生活", value: "本地生活", sort: 1 },
    { code: "high_conversion", label: "高转化", value: "高转化", sort: 2 }
  ],
  CAMPUS_FILTER_LOCATIONS: [
    { code: "beijing", label: "北京", value: "北京", sort: 1 },
    { code: "shanghai", label: "上海", value: "上海", sort: 2 },
    { code: "guangzhou", label: "广州", value: "广州", sort: 3 },
    { code: "shenzhen", label: "深圳", value: "深圳", sort: 4 },
    { code: "hangzhou", label: "杭州", value: "杭州", sort: 5 },
    { code: "nanjing", label: "南京", value: "南京", sort: 6 },
    { code: "chengdu", label: "成都", value: "成都", sort: 7 },
    { code: "wuhan", label: "武汉", value: "武汉", sort: 8 },
    { code: "xian", label: "西安", value: "西安", sort: 9 },
    { code: "nationwide", label: "全国", value: "全国", sort: 10 }
  ],
  CAMPUS_FILTER_INDUSTRIES: [
    { code: "internet", label: "互联网", value: "互联网", sort: 1 },
    { code: "ai", label: "人工智能", value: "人工智能", sort: 2 },
    { code: "consumer_electronics", label: "消费电子", value: "消费电子", sort: 3 },
    { code: "new_energy_auto", label: "新能源汽车", value: "新能源汽车", sort: 4 },
    { code: "finance_tech", label: "金融科技", value: "金融科技", sort: 5 },
    { code: "gaming", label: "游戏", value: "游戏", sort: 6 },
    { code: "semiconductor", label: "半导体", value: "半导体", sort: 7 },
    { code: "retail_ecommerce", label: "零售电商", value: "零售电商", sort: 8 },
    { code: "cloud_computing", label: "云计算", value: "云计算", sort: 9 },
    { code: "education", label: "教育", value: "教育", sort: 10 }
  ]
};

function isMockResourceType(value: unknown): value is MockResourceType {
  return value === "skill" || value === "location" || value === "account" || value === "time";
}

function normalizeResourceTypes(value: unknown): MockResourceType[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(value.filter((item): item is MockResourceType => isMockResourceType(item)))
    );
  }
  if (isMockResourceType(value)) {
    return [value];
  }
  return [];
}

export const handlers = [
  http.get("*/api/v1/user/captcha", () => {
    return HttpResponse.json({
      success: true,
      message: "图形验证码已生成",
      data: {
        captchaId: "mock-captcha-id",
        imageBase64:
          "PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiPjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iNDAiIGZpbGw9IiNmOGZhZmMiLz48dGV4dCB4PSIyMCIgeT0iMjgiIGZvbnQtc2l6ZT0iMjAiPkExQjI8L3RleHQ+PC9zdmc+"
      }
    });
  }),
  http.post("*/api/v1/user/send-sms", async () => {
    return HttpResponse.json({
      success: true,
      message: "短信发送成功",
      data: {
        success: true,
        message: "验证码已发送"
      }
    });
  }),
  http.post("*/api/v1/user/send-code", async () => {
    return HttpResponse.json({
      success: true,
      message: "短信发送成功",
      data: {
        success: true,
        message: "验证码已发送"
      }
    });
  }),
  http.post("*/api/v1/user/register", async () => {
    return HttpResponse.json({
      success: true,
      message: "注册成功",
      data: {
        token: "msw-register-token",
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
      }
    });
  }),
  http.post("*/api/v1/user/login", async () => {
    return HttpResponse.json({
      success: true,
      message: "登录成功",
      data: {
        token: "msw-token",
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
      }
    });
  }),
  http.get("*/api/v1/user/info", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        userId: 1,
        role: "both",
        city: "Shanghai"
      }
    });
  }),
  http.put("*/api/v1/user/info", async () => {
    return HttpResponse.json({
      success: true,
      message: "用户信息已更新",
      data: {
        updated: true
      }
    });
  }),
  http.put("*/api/v1/user/role", async () => {
    return HttpResponse.json({
      success: true,
      message: "角色已切换",
      data: {
        updated: true,
        role: "both"
      }
    });
  }),
  http.post("*/api/v1/resource/upload", async ({ request }) => {
    const payload = (await request.json()) as {
      resourceType?: MockResourceType | MockResourceType[];
      tags?: string[];
      areaCode?: string;
    };
    const resourceTypes = normalizeResourceTypes(payload.resourceType);
    if (resourceTypes.length === 0) {
      return HttpResponse.json(
        {
          success: false,
          message: "resourceType 参数非法",
          data: null
        },
        { status: 400 }
      );
    }

    const resource: MockResource = {
      resourceId: resourceCounter++,
      resourceType: resourceTypes[0],
      resourceTypes,
      tags: payload.tags ?? [],
      status: "pending",
      areaCode: payload.areaCode
    };
    mockResources.unshift(resource);

    return HttpResponse.json({
      success: true,
      message: "资源上传成功",
      data: {
        resourceId: resource.resourceId,
        reviewStatus: "pending"
      }
    });
  }),
  http.get("*/api/v1/resource/list", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: mockResources
    });
  }),
  http.get("*/api/v1/resource/tags", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        skill: ["短视频", "直播", "探店"],
        location: ["上海", "北京", "杭州"],
        time: ["长期", "短期"]
      }
    });
  }),
  http.get("*/api/v1/public/dict", ({ request }) => {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") ?? "";
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: {
        type,
        version: "v1",
        updatedAt: new Date().toISOString(),
        items: dictFixtures[type] ?? []
      }
    });
  }),
  http.get("*/api/v1/match/list", () => {
    return HttpResponse.json({
      success: true,
      message: "ok",
      data: [
        {
          matchId: 30001,
          needId: 90001,
          resourceId: 20001,
          score: 91.2,
          status: "pushed"
        }
      ]
    });
  }),
  http.post("*/api/v1/match/run", async () => {
    return HttpResponse.json({
      success: true,
      message: "匹配任务已创建",
      data: {
        taskId: "match-msw",
        status: "queued"
      }
    });
  }),
  http.post("*/api/v1/match/:id/confirm", ({ params }) => {
    return HttpResponse.json({
      success: true,
      message: "匹配已确认",
      data: {
        matchId: Number(params.id),
        status: "confirmed"
      }
    });
  })
];
