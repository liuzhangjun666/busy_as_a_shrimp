import { PrismaClient } from "@prisma/client";
import { CAMPUS_INDUSTRY_DICT_ITEMS, CAMPUS_LOCATION_DICT_ITEMS } from "./campus-dict-seeds";

type SeedItem = {
  code: string;
  label: string;
  value: string;
  sort?: number;
  status?: "normal" | "disabled";
  remark?: string;
};

type SeedGroup = {
  type: string;
  name: string;
  remark?: string;
  status?: "normal" | "disabled";
  items: SeedItem[];
};

const DICT_SEEDS: SeedGroup[] = [
  {
    type: "RESOURCE_TYPE",
    name: "资源类型",
    items: [
      { code: "skill", label: "技能", value: "技能", sort: 1 },
      { code: "location", label: "场地/位置", value: "场地/位置", sort: 2 },
      { code: "account", label: "账号/流量", value: "账号/流量", sort: 3 },
      { code: "time", label: "时间/劳动力", value: "时间/劳动力", sort: 4 }
    ]
  },
  {
    type: "RESOURCE_SKILL_TAGS",
    name: "资源技能标签",
    items: [
      { code: "short_video", label: "短视频", value: "短视频", sort: 1 },
      { code: "short_video_script", label: "短视频脚本", value: "短视频脚本", sort: 2 },
      { code: "short_video_shooting", label: "短视频拍摄", value: "短视频拍摄", sort: 3 },
      { code: "video_editing", label: "视频剪辑", value: "视频剪辑", sort: 4 },
      { code: "live_stream", label: "直播", value: "直播", sort: 5 },
      { code: "live_stream_ops", label: "直播运营", value: "直播运营", sort: 6 },
      { code: "anchor_training", label: "主播培训", value: "主播培训", sort: 7 },
      { code: "account_ops", label: "账号代运营", value: "账号代运营", sort: 8 },
      { code: "content_copywriting", label: "内容文案", value: "内容文案", sort: 9 },
      { code: "brand_copywriting", label: "文案策划", value: "文案策划", sort: 10 },
      { code: "event_execution", label: "活动执行", value: "活动执行", sort: 11 },
      { code: "corporate_live", label: "企业自播", value: "企业自播", sort: 12 },
      { code: "ip_incubation", label: "IP孵化", value: "IP孵化", sort: 13 },
      { code: "private_domain_ops", label: "私域运营", value: "私域运营", sort: 14 },
      { code: "community_ops", label: "社群运营", value: "社群运营", sort: 15 },
      { code: "seo_sem", label: "SEO/SEM", value: "SEO/SEM", sort: 16 },
      { code: "ecommerce_ops", label: "电商运营", value: "电商运营", sort: 17 },
      { code: "shop_ops", label: "店铺运营", value: "店铺运营", sort: 18 },
      { code: "local_life_ops", label: "本地生活运营", value: "本地生活运营", sort: 19 },
      { code: "ai_tools", label: "AI工具应用", value: "AI工具应用", sort: 20 },
      { code: "ai_editing", label: "AI剪辑", value: "AI剪辑", sort: 21 },
      { code: "graphic_design", label: "平面设计", value: "平面设计", sort: 22 },
      { code: "brand_strategy", label: "品牌策划", value: "品牌策划", sort: 23 },
      { code: "creator_bd", label: "达人对接", value: "达人对接", sort: 24 },
      { code: "influencer_bd", label: "博主商务", value: "博主商务", sort: 25 },
      { code: "visit_store_shoot", label: "探店拍摄", value: "探店拍摄", sort: 26 },
      { code: "photography", label: "摄影摄像", value: "摄影摄像", sort: 27 },
      { code: "product_selection", label: "选品", value: "选品", sort: 28 },
      { code: "data_analysis", label: "数据分析", value: "数据分析", sort: 29 },
      { code: "customer_service", label: "客服转化", value: "客服转化", sort: 30 },
      { code: "supply_chain", label: "供应链对接", value: "供应链对接", sort: 31 },
      { code: "training_coach", label: "培训教练", value: "培训教练", sort: 32 }
    ]
  },
  {
    type: "RESOURCE_REGION_CODES",
    name: "资源地区标签",
    items: [
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
      { code: "120000", label: "天津", value: "天津", sort: 12 },
      { code: "320500", label: "苏州", value: "苏州", sort: 13 },
      { code: "330200", label: "宁波", value: "宁波", sort: 14 },
      { code: "350200", label: "厦门", value: "厦门", sort: 15 },
      { code: "350100", label: "福州", value: "福州", sort: 16 },
      { code: "410100", label: "郑州", value: "郑州", sort: 17 },
      { code: "430100", label: "长沙", value: "长沙", sort: 18 },
      { code: "370200", label: "青岛", value: "青岛", sort: 19 },
      { code: "370100", label: "济南", value: "济南", sort: 20 },
      { code: "440600", label: "佛山", value: "佛山", sort: 21 },
      { code: "441900", label: "东莞", value: "东莞", sort: 22 },
      { code: "460100", label: "海口", value: "海口", sort: 23 },
      { code: "530100", label: "昆明", value: "昆明", sort: 24 },
      { code: "210100", label: "沈阳", value: "沈阳", sort: 25 },
      { code: "220100", label: "长春", value: "长春", sort: 26 },
      { code: "230100", label: "哈尔滨", value: "哈尔滨", sort: 27 },
      { code: "340100", label: "合肥", value: "合肥", sort: 28 },
      { code: "360100", label: "南昌", value: "南昌", sort: 29 },
      { code: "450100", label: "南宁", value: "南宁", sort: 30 },
      { code: "520100", label: "贵阳", value: "贵阳", sort: 31 }
    ]
  },
  {
    type: "RESOURCE_CUSTOM_TAGS",
    name: "资源自定义标签（常用）",
    items: [
      { code: "high_conversion", label: "高转化", value: "高转化", sort: 1 },
      { code: "weekend_slot", label: "周末档期", value: "周末档期", sort: 2 },
      { code: "food_track", label: "美食赛道", value: "美食赛道", sort: 3 },
      { code: "local_life", label: "本地生活", value: "本地生活", sort: 4 },
      { code: "content_cocreation", label: "内容共创", value: "内容共创", sort: 5 }
    ]
  },
  {
    type: "RESOURCE_CITY_NODES",
    name: "资源大厅城市节点",
    items: [
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
      { code: "tianjin", label: "天津", value: "天津", sort: 12 },
      { code: "suzhou", label: "苏州", value: "苏州", sort: 13 },
      { code: "ningbo", label: "宁波", value: "宁波", sort: 14 },
      { code: "xiamen", label: "厦门", value: "厦门", sort: 15 },
      { code: "fuzhou", label: "福州", value: "福州", sort: 16 },
      { code: "zhengzhou", label: "郑州", value: "郑州", sort: 17 },
      { code: "changsha", label: "长沙", value: "长沙", sort: 18 },
      { code: "qingdao", label: "青岛", value: "青岛", sort: 19 },
      { code: "jinan", label: "济南", value: "济南", sort: 20 },
      { code: "foshan", label: "佛山", value: "佛山", sort: 21 },
      { code: "dongguan", label: "东莞", value: "东莞", sort: 22 },
      { code: "haikou", label: "海口", value: "海口", sort: 23 },
      { code: "kunming", label: "昆明", value: "昆明", sort: 24 },
      { code: "shenyang", label: "沈阳", value: "沈阳", sort: 25 },
      { code: "changchun", label: "长春", value: "长春", sort: 26 },
      { code: "haerbin", label: "哈尔滨", value: "哈尔滨", sort: 27 },
      { code: "hefei", label: "合肥", value: "合肥", sort: 28 },
      { code: "nanchang", label: "南昌", value: "南昌", sort: 29 },
      { code: "nanning", label: "南宁", value: "南宁", sort: 30 },
      { code: "guiyang", label: "贵阳", value: "贵阳", sort: 31 }
    ]
  },
  {
    type: "CAMPUS_FILTER_LOCATIONS",
    name: "校招筛选地区",
    items: CAMPUS_LOCATION_DICT_ITEMS
  },
  {
    type: "CAMPUS_FILTER_INDUSTRIES",
    name: "校招筛选行业",
    items: CAMPUS_INDUSTRY_DICT_ITEMS
  },
  {
    type: "RESOURCE_WISH_TAGS",
    name: "资源目标心愿标签",
    items: [
      { code: "seek_partner", label: "寻找合伙人", value: "寻找合伙人", sort: 1 },
      { code: "resource_swap", label: "资源互换", value: "资源互换", sort: 2 },
      { code: "cross_industry", label: "异业合作", value: "异业合作", sort: 3 },
      { code: "traffic_share", label: "流量共享", value: "流量共享", sort: 4 },
      { code: "project_outsource", label: "项目外包", value: "项目外包", sort: 5 },
      { code: "recruit_anchor", label: "招募主播", value: "招募主播", sort: 6 },
      { code: "channel_cooperation", label: "渠道合作", value: "渠道合作", sort: 7 },
      { code: "brand_exposure", label: "品牌曝光", value: "品牌曝光", sort: 8 },
      { code: "monetization", label: "商业变现", value: "商业变现", sort: 9 },
      { code: "user_growth", label: "用户增长", value: "用户增长", sort: 10 },
      { code: "content_cocreation", label: "内容共创", value: "内容共创", sort: 11 },
      { code: "local_client", label: "本地获客", value: "本地获客", sort: 12 },
      { code: "product_testing", label: "产品试用", value: "产品试用", sort: 13 },
      { code: "joint_live", label: "联合直播", value: "联合直播", sort: 14 },
      { code: "course_collab", label: "课程合作", value: "课程合作", sort: 15 },
      { code: "supply_match", label: "供应对接", value: "供应对接", sort: 16 },
      { code: "investment_match", label: "投融资对接", value: "投融资对接", sort: 17 },
      { code: "case_exchange", label: "案例互换", value: "案例互换", sort: 18 }
    ]
  },
  {
    type: "RESOURCE_NEED_TAGS",
    name: "资源业务需求标签",
    items: [
      { code: "long_term", label: "长期", value: "长期", sort: 1 },
      { code: "short_term", label: "短期", value: "短期", sort: 2 },
      { code: "weekend", label: "周末", value: "周末", sort: 3 },
      { code: "part_time", label: "兼职", value: "兼职", sort: 4 },
      { code: "one_time", label: "单次结", value: "单次结", sort: 5 },
      { code: "remote", label: "远程", value: "远程", sort: 6 },
      { code: "onsite", label: "到场", value: "到场", sort: 7 },
      { code: "urgent", label: "急单", value: "急单", sort: 8 },
      { code: "monthly_package", label: "月度包", value: "月度包", sort: 9 },
      { code: "commission", label: "佣金制", value: "佣金制", sort: 10 },
      { code: "revenue_share", label: "分成合作", value: "分成合作", sort: 11 },
      { code: "fixed_price", label: "固定报价", value: "固定报价", sort: 12 },
      { code: "trial_order", label: "试单", value: "试单", sort: 13 },
      { code: "city_cooperation", label: "同城合作", value: "同城合作", sort: 14 },
      { code: "national_delivery", label: "全国交付", value: "全国交付", sort: 15 },
      { code: "night_slot", label: "夜间档期", value: "夜间档期", sort: 16 },
      { code: "weekday", label: "工作日", value: "工作日", sort: 17 },
      { code: "flexible_schedule", label: "弹性时间", value: "弹性时间", sort: 18 },
      { code: "team_needed", label: "团队承接", value: "团队承接", sort: 19 },
      { code: "single_person", label: "单人可接", value: "单人可接", sort: 20 }
    ]
  },
  {
    type: "MATCH_STATUS_FILTER",
    name: "匹配列表筛选状态",
    items: [
      { code: "all", label: "全部", value: "全部", sort: 1 },
      { code: "pending", label: "待确认", value: "待确认", sort: 2 },
      { code: "confirmed", label: "已确认", value: "已确认", sort: 3 },
      { code: "invalid", label: "已失效", value: "已失效", sort: 4 }
    ]
  },
  {
    type: "MATCH_STATUS",
    name: "匹配状态映射",
    items: [
      { code: "pending", label: "待确认", value: "待确认", sort: 1 },
      { code: "confirmed", label: "已确认", value: "已确认", sort: 2 },
      { code: "invalid", label: "已失效", value: "已失效", sort: 3 }
    ]
  },
  {
    type: "MATCH_TARGET_STATUS",
    name: "对端握手状态",
    items: [
      { code: "PENDING", label: "等待响应", value: "等待响应", sort: 1 },
      { code: "CONFIRMED", label: "已就绪", value: "已就绪", sort: 2 },
      { code: "REJECTED", label: "已拒绝", value: "已拒绝", sort: 3 }
    ]
  },
  {
    type: "CONTENT_TYPE",
    name: "内容类型",
    items: [
      { code: "card", label: "卡片", value: "卡片", sort: 1 },
      { code: "post", label: "文案", value: "文案", sort: 2 },
      { code: "video_script", label: "脚本", value: "脚本", sort: 3 },
      { code: "poster", label: "海报", value: "海报", sort: 4 }
    ]
  },
  {
    type: "CONTENT_EVENT",
    name: "内容统计事件",
    items: [
      { code: "view", label: "浏览 +1", value: "浏览 +1", sort: 1 },
      { code: "like", label: "点赞 +1", value: "点赞 +1", sort: 2 },
      { code: "inquiry", label: "咨询 +1", value: "咨询 +1", sort: 3 }
    ]
  },
  {
    type: "CONTENT_STATUS",
    name: "内容状态",
    items: [
      { code: "draft", label: "草稿", value: "草稿", sort: 1 },
      { code: "pending", label: "待确认", value: "待确认", sort: 2 },
      { code: "published", label: "已发布", value: "已发布", sort: 3 },
      { code: "rejected", label: "已拒绝", value: "已拒绝", sort: 4 }
    ]
  },
  {
    type: "MEMBER_LEVEL",
    name: "会员等级",
    items: [
      { code: "FREE", label: "免费用户", value: "免费用户", sort: 1 },
      { code: "PRO", label: "基础月包", value: "基础月包", sort: 2 },
      { code: "LIFETIME", label: "高级月包/终身", value: "高级月包/终身", sort: 3 }
    ]
  },
  {
    type: "MEMBERSHIP_PLAN",
    name: "会员方案",
    items: [
      { code: "free", label: "免费版", value: "免费版", sort: 1 },
      { code: "monthly", label: "月度会员", value: "月度会员", sort: 2 },
      { code: "yearly", label: "年度会员", value: "年度会员", sort: 3 },
      { code: "lifetime", label: "终身版", value: "终身版", sort: 4 }
    ]
  },
  {
    type: "USER_ROLE",
    name: "用户角色",
    items: [
      { code: "service", label: "服务方", value: "服务方", sort: 1 },
      { code: "resource", label: "资源方", value: "资源方", sort: 2 },
      { code: "both", label: "双角色", value: "双角色", sort: 3 }
    ]
  },
  {
    type: "CAPTAIN_LEVEL",
    name: "团长等级",
    items: [
      { code: "normal", label: "普通团长", value: "普通团长", sort: 1 },
      { code: "advanced", label: "进阶团长", value: "进阶团长", sort: 2 },
      { code: "gold", label: "黄金团长", value: "黄金团长", sort: 3 }
    ]
  },
  {
    type: "COMMISSION_STATUS",
    name: "佣金状态",
    items: [
      { code: "PENDING", label: "待结算", value: "待结算", sort: 1 },
      { code: "ACTIVE", label: "可结算", value: "可结算", sort: 2 },
      { code: "PAID", label: "已打款", value: "已打款", sort: 3 },
      { code: "INVALID", label: "已失效", value: "已失效", sort: 4 }
    ]
  },
  {
    type: "EXECUTION_COMMAND",
    name: "执行控制台命令",
    items: [
      {
        code: "/scan_city",
        label: "扫描同城本地机会",
        value: "扫描同城本地机会 (参数: 城市 关键词)",
        sort: 1
      },
      {
        code: "/scan_ecom",
        label: "扫描电商选品库",
        value: "扫描电商选品库 (参数: 平台 类目)",
        sort: 2
      },
      { code: "/check_hp", label: "查询当前龙虾体力值", value: "查询当前龙虾体力值", sort: 3 }
    ]
  }
];

const prisma = new PrismaClient();

async function seedDictGroup(group: SeedGroup) {
  await prisma.dictType.upsert({
    where: { dictType: group.type },
    create: {
      dictName: group.name,
      dictType: group.type,
      status: group.status ?? "normal",
      remark: group.remark ?? null
    },
    update: {
      dictName: group.name,
      status: group.status ?? "normal",
      remark: group.remark ?? null
    }
  });

  const activeCodes = group.items.map((item) => item.code);

  for (let index = 0; index < group.items.length; index += 1) {
    const item = group.items[index];
    await prisma.dictData.upsert({
      where: {
        dictType_dictCode: {
          dictType: group.type,
          dictCode: item.code
        }
      },
      create: {
        dictType: group.type,
        dictCode: item.code,
        dictLabel: item.label,
        dictValue: item.value,
        dictSort: item.sort ?? index + 1,
        status: item.status ?? "normal",
        remark: item.remark ?? null
      },
      update: {
        dictLabel: item.label,
        dictValue: item.value,
        dictSort: item.sort ?? index + 1,
        status: item.status ?? "normal",
        remark: item.remark ?? null
      }
    });
  }

  if (activeCodes.length > 0) {
    await prisma.dictData.updateMany({
      where: {
        dictType: group.type,
        dictCode: {
          notIn: activeCodes
        }
      },
      data: {
        status: "disabled"
      }
    });
  }

  if (group.type === "RESOURCE_TYPE") {
    for (const item of group.items) {
      await prisma.$executeRaw`
        UPDATE dict_data
        SET dict_code = ${item.code}
        WHERE dict_type = ${group.type}
          AND LOWER(dict_code) = LOWER(${item.code})
      `;
    }
  }
}

const ANNOUNCEMENT_SEEDS = [
  {
    title: "星际枢纽 1.0 版本上线公告",
    content:
      "欢迎来到星际枢纽！本系统已正式进入公测阶段。当前已上线执行控制台、分身管家及任务调度功能。建立您的神经连接，开启高效协作之旅。",
    type: "notice",
    publisher: "System"
  },
  {
    title: "新功能预告：龙虾自动撮合算法升级",
    content: "我们将于近期升级龙虾撮合算法，HP 消耗逻辑将更加智能，匹配精准度提升 40%。敬请期待。",
    type: "activity",
    publisher: "AI-Team"
  },
  {
    title: "安全提醒：请妥善保管通讯凭证",
    content:
      "近期发现部分节点存在凭证泄露风险，请勿在公共场所展示您的登录验证码。系统不会以任何名义向您索要完整的身份信息。",
    type: "warning",
    publisher: "Security"
  }
];

async function seedAnnouncements() {
  for (const item of ANNOUNCEMENT_SEEDS) {
    const existing = await prisma.announcement.findFirst({
      where: { title: item.title }
    });
    if (!existing) {
      await prisma.announcement.create({ data: item });
    }
  }
}

async function main() {
  for (const group of DICT_SEEDS) {
    await seedDictGroup(group);
  }
  await seedAnnouncements();
  console.log(
    `[seed] done. groups=${DICT_SEEDS.length}, announcements=${ANNOUNCEMENT_SEEDS.length}`
  );
}

main()
  .catch((error) => {
    console.error("[seed] failed", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
