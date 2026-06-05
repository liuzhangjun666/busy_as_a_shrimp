import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { MemberLevel, Prisma, StartupPost, StartupPostStatus } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import {
  CreateStartupPostDto,
  QueryAdminStartupPostsDto,
  QueryPublicStartupPostsDto,
  UpdateStartupPostDto,
  UpdateStartupPostStatusDto
} from "./dto/startup-post.dto";

export interface StartupPostSummary {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  status: StartupPostStatus;
  sort: number;
  viewCount: number;
  publishedAt: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface StartupPostDetail extends StartupPostSummary {
  content: string;
  contactInfo: string | null;
  sourceUrl: string | null;
}

export interface StartupPostListResult {
  list: StartupPostSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PublicStartupPostSummary {
  id: string;
  title: string;
  summary: string;
  category: string | null;
  tags: string[];
  coverImageUrl: string | null;
  publishedAt: string | null;
}

export interface PublicStartupPostDetail extends PublicStartupPostSummary {
  content: string;
  contactInfo: string | null;
  sourceUrl: string | null;
  viewCount: number;
}

export interface PublicStartupPostListResult {
  list: PublicStartupPostSummary[];
  page: number;
  pageSize: number;
  total: number;
}

export interface PublicSopTemplateSummary {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  coverImageUrl: string | null;
  publishedAt: string | null;
  estimatedReadMinutes: number;
  previewText: string;
}

export interface PublicSopTemplateDetail extends PublicSopTemplateSummary {
  viewCount: number;
  sourceUrl: string | null;
  previewContent: string;
  requiresMembership: true;
}

export interface MemberSopTemplateDetail extends PublicSopTemplateSummary {
  viewCount: number;
  sourceUrl: string | null;
  content: string;
  contactInfo: string | null;
  copyText: string;
}

export interface SopTemplateListResult {
  list: PublicSopTemplateSummary[];
  page: number;
  pageSize: number;
  total: number;
  categories: string[];
}

interface DefaultSopTemplateSeed {
  title: string;
  summary: string;
  category: string;
  tags: string[];
  content: string;
}

const SOP_TEMPLATE_CATEGORIES = [
  "冷启动获客",
  "内容增长",
  "成交转化",
  "交付复盘"
] as const;

const DEFAULT_SOP_TEMPLATES: DefaultSopTemplateSeed[] = [
  {
    title: "AI 一人公司从 0 到 1 冷启动获客 SOP",
    summary: "适合刚起步的个人创业者，按 7 天节奏搭起账号、样品、钩子和首轮私信转化。",
    category: "冷启动获客",
    tags: ["冷启动", "获客", "私信转化", "个人创业"],
    content: `目标：在 7 天内完成第一个可成交的流量闭环。

第 1 步：明确单一成交场景
1. 只选一个人群，一个核心问题，一个交付结果。
2. 把产品介绍写成“我帮谁，用什么方式，解决什么问题”。
3. 输出一句 30 字以内的成交描述，后续所有内容都围绕这句展开。

第 2 步：搭建最小成交资产
1. 准备一个承接页，可以是飞书文档、Notion 页面或微信介绍页。
2. 承接页至少包含：适合谁、解决什么、交付内容、案例截图、价格锚点、联系方式。
3. 同时准备 3 条常见问答，减少首次沟通阻力。

第 3 步：发布 10 条问题型内容
1. 每条内容只回答一个问题，不讲大而全。
2. 结构统一：痛点开场 - 错误做法 - 正确路径 - 留一个行动口子。
3. 结尾统一引导：回复关键词或私信领取模板。

第 4 步：建立私信承接话术
1. 第一句先确认用户处境，不直接推销。
2. 第二句判断需求强度：是否紧急、是否有预算、是否愿意执行。
3. 第三句再发送对应材料：案例、方案、报价三选一。

第 5 步：每日复盘
1. 记录当天发布数量、私信人数、有效咨询人数、成交人数。
2. 找出转化最高的开头句和最低的开头句。
3. 次日只放大有效表达，不要同时修改 5 个变量。

交付清单：
- 账号定位一句话
- 承接页模板
- 10 条冷启动内容选题
- 私信 3 轮追问话术

验收标准：
- 第 3 天前拿到首批有效私信
- 第 7 天前完成首轮报价或试单
- 复盘表持续更新`
  },
  {
    title: "AI 内容增长 SOP：从选题到日更产出的标准作业流",
    summary: "把选题、脚本、发布、数据回收拆成固定流程，让个人账号也能稳定日更并持续放大爆款。",
    category: "内容增长",
    tags: ["内容增长", "选题", "日更", "数据复盘"],
    content: `目标：把内容生产从“灵感驱动”改成“流程驱动”。

第 1 步：建立选题池
1. 把用户提问、评论区高频问题、同行爆款标题统一收集到表格。
2. 给每个选题打三个标签：热度、成交相关度、执行难度。
3. 每周只选 10 个最值得发的题进入当周排期。

第 2 步：统一脚本结构
1. 开头 3 秒只做一件事：让目标用户觉得“这条就是在说我”。
2. 正文采用三段式：问题拆解、可执行步骤、结果预期。
3. 结尾必须给动作：评论关键词、私信、加企微、进群。

第 3 步：AI 辅助批量出稿
1. 先人工写标题方向和受众，不直接让 AI 自由发挥。
2. 让 AI 只做扩写、润色、改短、改长、改口语化。
3. 对每条脚本做一次人工核验，避免行业常识错误。

第 4 步：发布节奏固定化
1. 统一每天发布时间，减少额外变量。
2. 每天至少发 1 条主内容，搭配 1 条跟进短内容。
3. 爆款话题在 72 小时内做二次变体，不要只发一次。

第 5 步：数据复盘与迭代
1. 重点看完播率、互动率、私信率，而不是只看播放量。
2. 高私信内容归档为“成交型内容”，继续复用结构。
3. 低表现内容只改开头和标题，保留主体表达，方便验证。

模板输出：
- 周选题排期表
- 内容脚本结构模板
- 爆款复刻改写表
- 每日数据复盘表

执行提醒：
- 不追求每天完全创新
- 重复有效内容结构
- 先把成交相关内容跑通，再扩展品牌内容`
  },
  {
    title: "AI 服务成交转化 SOP：咨询到下单的 5 步标准链路",
    summary: "适合卖服务、卖咨询、卖代运营的人，用固定的问诊、报价、跟进和催单链路提高成交率。",
    category: "成交转化",
    tags: ["成交转化", "报价", "咨询", "服务销售"],
    content: `目标：把“有人咨询但不下单”的损耗降到最低。

第 1 步：先问诊，不急着介绍自己
1. 先确认对方目前做什么、卡在哪、最想解决什么。
2. 判断对方属于新手试水、快速验证、正式投入哪一类。
3. 把每一类对应到不同报价和交付方式。

第 2 步：给出轻量诊断结果
1. 先指出 1 到 2 个核心问题，让对方感受到你懂业务。
2. 不要一次性给完整方案，留一部分在付费服务里展开。
3. 用“先帮你理顺方向，再决定是否深入合作”的口径降低心理门槛。

第 3 步：报价结构化
1. 报价必须拆成：目标、内容、周期、协作方式、价格。
2. 至少给出两个档位：基础版和进阶版。
3. 如果对方犹豫，不立刻降价，先缩交付范围。

第 4 步：72 小时跟进
1. 第一次跟进：补案例或补一条针对性建议。
2. 第二次跟进：确认当前顾虑是预算、时间还是信任。
3. 第三次跟进：给出明确截止时间或排期窗口。

第 5 步：成交后立即进入交付节奏
1. 成交后 24 小时内发欢迎包与执行清单。
2. 让客户第一时间感受到你是有体系的，而不是临时拼凑。
3. 同步下次沟通时间，避免项目开单后失速。

交付模板：
- 咨询问诊脚本
- 轻诊断回复模板
- 双档报价模板
- 72 小时跟进话术
- 成交欢迎包

关键原则：
- 报价不是聊天结尾，而是成交流程中的一个步骤
- 每次跟进都要新增价值
- 不要用打折代替信任建立`
  },
  {
    title: "AI 项目交付复盘 SOP：防止返工、沉淀案例与转介绍",
    summary: "适合已经成交后的个人团队，把交付、复盘、案例沉淀和转介绍串成闭环。",
    category: "交付复盘",
    tags: ["交付复盘", "客户成功", "案例沉淀", "转介绍"],
    content: `目标：让每个交付项目都能沉淀成下一单的资产。

第 1 步：开单即同步交付边界
1. 明确本次交付做什么、不做什么。
2. 约定沟通频率、反馈节点、资料提供方式。
3. 重要边界用文档确认，避免口头理解偏差。

第 2 步：过程节点可视化
1. 把项目拆成里程碑，不要等到最后一次性交付。
2. 每完成一个节点都同步结果与下一步动作。
3. 客户反馈统一收口，避免多渠道反复修改。

第 3 步：结果证据留存
1. 保存前后对比图、数据截图、客户评价、关键聊天记录。
2. 每个项目至少沉淀一个“结果片段”和一个“过程片段”。
3. 这些内容后续可以直接变成案例帖、成交页素材。

第 4 步：结项复盘
1. 记录这单为什么成交、为什么推进顺利或卡住。
2. 总结最有效的话术、最常见的异议、最容易返工的地方。
3. 把经验写回到标准流程里，不要只留在记忆中。

第 5 步：触发转介绍
1. 结项后在客户满意度最高时刻提出转介绍请求。
2. 给客户一个容易转发的介绍文案和结果截图。
3. 如果适合，设计转介绍激励，但不要过度复杂。

交付模板：
- 项目边界确认清单
- 里程碑推进表
- 结果证据归档表
- 结项复盘模板
- 转介绍请求话术

最终目标：
- 降低返工率
- 提高复购率
- 让每个项目都成为下一轮成交资产`
  }
];

@Injectable()
export class StartupPostService {
  constructor(private readonly prisma: PrismaService) {}

  async createAdminPost(
    payload: CreateStartupPostDto,
    operator: string
  ): Promise<StartupPostDetail> {
    const status = payload.status ?? StartupPostStatus.draft;
    let publishedAt = this.parseOptionalDate(payload.publishedAt);
    if (status === StartupPostStatus.published && !publishedAt) {
      publishedAt = new Date();
    }
    if (status !== StartupPostStatus.published) {
      publishedAt = null;
    }

    const created = await this.prisma.startupPost.create({
      data: {
        title: this.requireText(payload.title, "title"),
        summary: this.normalizeOptionalText(payload.summary),
        content: this.requireText(payload.content, "content"),
        category: this.normalizeOptionalText(payload.category),
        tags: this.sanitizeTags(payload.tags) as Prisma.InputJsonValue,
        coverImageUrl: this.normalizeOptionalText(payload.coverImageUrl),
        contactInfo: this.normalizeOptionalText(payload.contactInfo),
        sourceUrl: this.normalizeOptionalText(payload.sourceUrl),
        sort: payload.sort ?? 0,
        status,
        publishedAt,
        createdBy: this.normalizeOperator(operator),
        updatedBy: this.normalizeOperator(operator)
      }
    });

    return this.toDetail(created);
  }

  async updateAdminPost(
    id: string,
    payload: UpdateStartupPostDto,
    operator: string
  ): Promise<StartupPostDetail> {
    const startupPostId = this.parseStartupPostId(id);
    const existing = await this.prisma.startupPost.findUnique({ where: { startupPostId } });
    if (!existing) {
      throw new NotFoundException(`startup post ${id} not found`);
    }

    const nextStatus = payload.status ?? existing.status;
    let nextPublishedAt = existing.publishedAt;

    if (payload.publishedAt !== undefined) {
      nextPublishedAt = this.parseOptionalDate(payload.publishedAt);
    }

    if (nextStatus === StartupPostStatus.published && !nextPublishedAt) {
      nextPublishedAt = new Date();
    }

    if (nextStatus !== StartupPostStatus.published) {
      nextPublishedAt = null;
    }

    const data: Prisma.StartupPostUpdateInput = {
      updatedBy: this.normalizeOperator(operator),
      status: nextStatus,
      publishedAt: nextPublishedAt
    };

    if (payload.title !== undefined) {
      data.title = this.requireText(payload.title, "title");
    }
    if (payload.summary !== undefined) {
      data.summary = this.normalizeOptionalText(payload.summary);
    }
    if (payload.content !== undefined) {
      data.content = this.requireText(payload.content, "content");
    }
    if (payload.category !== undefined) {
      data.category = this.normalizeOptionalText(payload.category);
    }
    if (payload.tags !== undefined) {
      data.tags = this.sanitizeTags(payload.tags) as Prisma.InputJsonValue;
    }
    if (payload.coverImageUrl !== undefined) {
      data.coverImageUrl = this.normalizeOptionalText(payload.coverImageUrl);
    }
    if (payload.contactInfo !== undefined) {
      data.contactInfo = this.normalizeOptionalText(payload.contactInfo);
    }
    if (payload.sourceUrl !== undefined) {
      data.sourceUrl = this.normalizeOptionalText(payload.sourceUrl);
    }
    if (payload.sort !== undefined) {
      data.sort = payload.sort;
    }

    const updated = await this.prisma.startupPost.update({
      where: { startupPostId },
      data
    });

    return this.toDetail(updated);
  }

  async updateAdminPostStatus(
    id: string,
    payload: UpdateStartupPostStatusDto,
    operator: string
  ): Promise<StartupPostDetail> {
    return this.updateAdminPost(
      id,
      {
        status: payload.status,
        publishedAt: payload.publishedAt
      },
      operator
    );
  }

  async getAdminPost(id: string): Promise<StartupPostDetail> {
    const startupPostId = this.parseStartupPostId(id);
    const record = await this.prisma.startupPost.findUnique({ where: { startupPostId } });
    if (!record) {
      throw new NotFoundException(`startup post ${id} not found`);
    }

    return this.toDetail(record);
  }

  async deleteAdminPost(id: string): Promise<{ id: string }> {
    const startupPostId = this.parseStartupPostId(id);
    await this.prisma.startupPost.delete({ where: { startupPostId } });
    return { id };
  }

  async queryAdminPosts(query: QueryAdminStartupPostsDto): Promise<StartupPostListResult> {
    const page = this.normalizePositiveInt(query.page, 1);
    const pageSize = this.normalizePositiveInt(query.pageSize, 20, 100);
    const skip = (page - 1) * pageSize;
    const keyword = this.normalizeOptionalText(query.keyword);

    const where: Prisma.StartupPostWhereInput = {};
    if (query.status) {
      where.status = query.status;
    }
    if (keyword) {
      where.OR = [
        { title: { contains: keyword } },
        { summary: { contains: keyword } },
        { content: { contains: keyword } }
      ];
    }

    const [total, list] = await Promise.all([
      this.prisma.startupPost.count({ where }),
      this.prisma.startupPost.findMany({
        where,
        orderBy: [{ sort: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize
      })
    ]);

    return {
      list: list.map((post) => this.toSummary(post)),
      page,
      pageSize,
      total
    };
  }

  async queryPublicPosts(query: QueryPublicStartupPostsDto): Promise<PublicStartupPostListResult> {
    const page = this.normalizePositiveInt(query.page, 1);
    const pageSize = this.normalizePositiveInt(query.pageSize, 20, 100);
    const skip = (page - 1) * pageSize;
    const keyword = this.normalizeOptionalText(query.keyword);
    const category = this.normalizeOptionalText(query.category);

    const whereParts: Prisma.StartupPostWhereInput[] = [
      { status: StartupPostStatus.published },
      {
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
      }
    ];

    if (category) {
      whereParts.push({ category });
    }

    if (keyword) {
      whereParts.push({
        OR: [
          { title: { contains: keyword } },
          { summary: { contains: keyword } },
          { content: { contains: keyword } }
        ]
      });
    }

    const where: Prisma.StartupPostWhereInput = {
      AND: whereParts
    };

    const [total, list] = await Promise.all([
      this.prisma.startupPost.count({ where }),
      this.prisma.startupPost.findMany({
        where,
        orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize
      })
    ]);

    return {
      list: list.map((post) => this.toPublicSummary(post)),
      page,
      pageSize,
      total
    };
  }

  async queryPublicSopTemplates(query: QueryPublicStartupPostsDto): Promise<SopTemplateListResult> {
    await this.ensureDefaultSopTemplates();

    const page = this.normalizePositiveInt(query.page, 1);
    const pageSize = this.normalizePositiveInt(query.pageSize, 12, 50);
    const skip = (page - 1) * pageSize;
    const keyword = this.normalizeOptionalText(query.keyword);
    const category = this.normalizeOptionalText(query.category);

    const whereParts: Prisma.StartupPostWhereInput[] = [
      { status: StartupPostStatus.published },
      { category: { in: [...SOP_TEMPLATE_CATEGORIES] } },
      {
        OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
      }
    ];

    if (category && SOP_TEMPLATE_CATEGORIES.includes(category as (typeof SOP_TEMPLATE_CATEGORIES)[number])) {
      whereParts.push({ category });
    }

    if (keyword) {
      whereParts.push({
        OR: [
          { title: { contains: keyword } },
          { summary: { contains: keyword } },
          { content: { contains: keyword } }
        ]
      });
    }

    const where: Prisma.StartupPostWhereInput = { AND: whereParts };

    const [total, list] = await Promise.all([
      this.prisma.startupPost.count({ where }),
      this.prisma.startupPost.findMany({
        where,
        orderBy: [{ sort: "desc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
        skip,
        take: pageSize
      })
    ]);

    return {
      list: list.map((post) => this.toPublicSopSummary(post)),
      page,
      pageSize,
      total,
      categories: [...SOP_TEMPLATE_CATEGORIES]
    };
  }

  async getPublicSopTemplatePreview(id: string): Promise<PublicSopTemplateDetail> {
    await this.ensureDefaultSopTemplates();

    const post = await this.loadPublishedSopTemplate(id, false);
    return this.toPublicSopDetail(post);
  }

  async getMemberSopTemplateDetail(userId: bigint, id: string): Promise<MemberSopTemplateDetail> {
    await this.ensureDefaultSopTemplates();
    await this.assertPaidMember(userId);

    const post = await this.loadPublishedSopTemplate(id, true);
    return this.toMemberSopDetail(post);
  }

  async getPublicPost(id: string): Promise<PublicStartupPostDetail> {
    const startupPostId = this.parseStartupPostId(id);
    const updated = await this.prisma.$transaction(async (tx) => {
      const existing = await tx.startupPost.findFirst({
        where: {
          startupPostId,
          status: StartupPostStatus.published,
          OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
        }
      });

      if (!existing) {
        throw new NotFoundException(`startup post ${id} not found`);
      }

      return tx.startupPost.update({
        where: { startupPostId },
        data: {
          viewCount: { increment: 1 }
        }
      });
    });

    return this.toPublicDetail(updated);
  }

  private toSummary(post: StartupPost): StartupPostSummary {
    return {
      id: post.startupPostId.toString(),
      title: post.title,
      summary: post.summary ?? this.buildSummary(post.content),
      category: post.category,
      tags: this.normalizeTags(post.tags),
      coverImageUrl: post.coverImageUrl,
      status: post.status,
      sort: post.sort,
      viewCount: post.viewCount,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      createdBy: post.createdBy,
      updatedBy: post.updatedBy,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString()
    };
  }

  private toDetail(post: StartupPost): StartupPostDetail {
    return {
      ...this.toSummary(post),
      content: post.content,
      contactInfo: post.contactInfo,
      sourceUrl: post.sourceUrl
    };
  }

  private toPublicSummary(post: StartupPost): PublicStartupPostSummary {
    return {
      id: post.startupPostId.toString(),
      title: post.title,
      summary: post.summary ?? this.buildSummary(post.content),
      category: post.category,
      tags: this.normalizeTags(post.tags),
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt?.toISOString() ?? null
    };
  }

  private toPublicDetail(post: StartupPost): PublicStartupPostDetail {
    return {
      ...this.toPublicSummary(post),
      content: post.content,
      contactInfo: post.contactInfo,
      sourceUrl: post.sourceUrl,
      viewCount: post.viewCount
    };
  }

  private toPublicSopSummary(post: StartupPost): PublicSopTemplateSummary {
    const summary = post.summary ?? this.buildSummary(post.content);
    return {
      id: post.startupPostId.toString(),
      title: post.title,
      summary,
      category: post.category ?? "未分类",
      tags: this.normalizeTags(post.tags),
      coverImageUrl: post.coverImageUrl,
      publishedAt: post.publishedAt?.toISOString() ?? null,
      estimatedReadMinutes: this.estimateReadMinutes(post.content),
      previewText: this.buildPreviewText(post.content)
    };
  }

  private toPublicSopDetail(post: StartupPost): PublicSopTemplateDetail {
    return {
      ...this.toPublicSopSummary(post),
      viewCount: post.viewCount,
      sourceUrl: post.sourceUrl,
      previewContent: this.buildPreviewText(post.content, 480),
      requiresMembership: true
    };
  }

  private toMemberSopDetail(post: StartupPost): MemberSopTemplateDetail {
    return {
      ...this.toPublicSopSummary(post),
      viewCount: post.viewCount,
      sourceUrl: post.sourceUrl,
      content: post.content,
      contactInfo: post.contactInfo,
      copyText: `${post.title}\n\n${post.content}`
    };
  }

  private async ensureDefaultSopTemplates(): Promise<void> {
    const existing = await this.prisma.startupPost.count({
      where: {
        status: StartupPostStatus.published,
        category: { in: [...SOP_TEMPLATE_CATEGORIES] }
      }
    });

    if (existing > 0) {
      return;
    }

    await this.prisma.startupPost.createMany({
      data: DEFAULT_SOP_TEMPLATES.map((template, index) => ({
        title: template.title,
        summary: template.summary,
        content: template.content,
        category: template.category,
        tags: template.tags as Prisma.InputJsonValue,
        coverImageUrl: null,
        contactInfo: "会员已解锁，可直接复制执行模板并按你的业务场景微调。",
        sourceUrl: null,
        status: StartupPostStatus.published,
        sort: 100 - index,
        publishedAt: new Date(),
        createdBy: "system:sop-seed",
        updatedBy: "system:sop-seed"
      }))
    });
  }

  private async loadPublishedSopTemplate(id: string, incrementView: boolean): Promise<StartupPost> {
    const startupPostId = this.parseStartupPostId(id);

    if (!incrementView) {
      const existing = await this.prisma.startupPost.findFirst({
        where: {
          startupPostId,
          status: StartupPostStatus.published,
          category: { in: [...SOP_TEMPLATE_CATEGORIES] },
          OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
        }
      });

      if (!existing) {
        throw new NotFoundException(`sop template ${id} not found`);
      }

      return existing;
    }

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.startupPost.findFirst({
        where: {
          startupPostId,
          status: StartupPostStatus.published,
          category: { in: [...SOP_TEMPLATE_CATEGORIES] },
          OR: [{ publishedAt: null }, { publishedAt: { lte: new Date() } }]
        }
      });

      if (!existing) {
        throw new NotFoundException(`sop template ${id} not found`);
      }

      return tx.startupPost.update({
        where: { startupPostId },
        data: {
          viewCount: { increment: 1 }
        }
      });
    });
  }

  private async assertPaidMember(userId: bigint): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { memberLevel: true, memberExpire: true }
    });

    if (!user || user.memberLevel === MemberLevel.free) {
      throw new ForbiddenException("该功能仅限订阅会员使用，请前往开通会员。");
    }

    if (user.memberExpire && user.memberExpire < new Date()) {
      throw new ForbiddenException("会员已过期，请续费后继续查看完整模板。");
    }
  }

  private buildSummary(content: string): string {
    const compact = content.replace(/\s+/g, " ").trim();
    if (!compact) {
      return "";
    }
    return compact.length > 120 ? `${compact.slice(0, 120)}...` : compact;
  }

  private buildPreviewText(content: string, maxLength = 220): string {
    const compact = content.replace(/\s+/g, " ").trim();
    if (!compact) {
      return "";
    }

    return compact.length > maxLength ? `${compact.slice(0, maxLength)}...` : compact;
  }

  private estimateReadMinutes(content: string): number {
    const compact = content.replace(/\s+/g, "");
    const minutes = Math.ceil(compact.length / 220);
    return Math.max(1, minutes);
  }

  private normalizeTags(value: Prisma.JsonValue | null): string[] {
    if (!value) {
      return [];
    }

    if (!Array.isArray(value)) {
      return [];
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter((item) => item.length > 0);
  }

  private sanitizeTags(value?: string[]): string[] {
    if (!value || value.length === 0) {
      return [];
    }

    const unique = new Set<string>();
    for (const item of value) {
      const normalized = item.trim();
      if (!normalized) {
        continue;
      }
      unique.add(normalized.slice(0, 30));
      if (unique.size >= 20) {
        break;
      }
    }

    return [...unique];
  }

  private parseStartupPostId(id: string): bigint {
    if (!/^\d+$/.test(id)) {
      throw new BadRequestException("startup post id is invalid");
    }

    const startupPostId = BigInt(id);
    if (startupPostId <= 0n) {
      throw new BadRequestException("startup post id is invalid");
    }

    return startupPostId;
  }

  private parseOptionalDate(value?: string): Date | null {
    if (value === undefined) {
      return null;
    }

    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new BadRequestException("publishedAt is invalid");
    }

    return parsed;
  }

  private normalizeOperator(operator?: string): string {
    const normalized = operator?.trim();
    if (!normalized) {
      return "admin";
    }
    return normalized.slice(0, 50);
  }

  private requireText(value: string | undefined, field: string): string {
    const normalized = value?.trim();
    if (!normalized) {
      throw new BadRequestException(`${field} is required`);
    }
    return normalized;
  }

  private normalizeOptionalText(value: string | undefined): string | null {
    const normalized = value?.trim();
    if (!normalized) {
      return null;
    }
    return normalized;
  }

  private normalizePositiveInt(value: number | undefined, fallback: number, max = 100): number {
    if (!value || !Number.isInteger(value) || value <= 0) {
      return fallback;
    }

    return Math.min(value, max);
  }
}
