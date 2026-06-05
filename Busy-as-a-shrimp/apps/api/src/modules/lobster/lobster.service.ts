import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
  Inject
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { LobsterProducer } from "./lobster.producer";
import axios from "axios";
import { Observable } from "rxjs";
import { MessageEvent } from "@nestjs/common";
import {
  ActivateLobsterDto,
  TriggerTaskDto,
  ReviewCallbackDto,
  DeerFlowPushResultDto,
  DeerFlowHpEventDto,
  DeerFlowTaskStatusDto,
  DeerFlowWebhookCallbackDto,
  PaginatedResult,
  ReviewTaskRecord,
  LobsterMatchRecordDto,
  UserBatchQueryDto,
  CreateReviewTaskDto,
  ReviewActionDto
} from "./dto/lobster.dto";
import { LobsterCyberTaskService } from "./lobster-cyber-task.service";

type LockedLobsterRow = {
  lobster_id: bigint;
  status: string;
  hp: number;
  personality: string | null;
  last_executed_at: Date | null;
};

@Injectable()
export class LobsterService {
  private readonly logger = new Logger(LobsterService.name);
  private readonly deerFlowBaseUrl = process.env.DEERFLOW_BASE_URL ?? "http://localhost:2026";
  private readonly deerFlowApiKey = process.env.DEERFLOW_API_KEY ?? "";

  constructor(
    private readonly prisma: PrismaService,
    private readonly cyberTaskService: LobsterCyberTaskService,
    @Optional() @Inject(LobsterProducer) private readonly producer?: LobsterProducer
  ) {}

  private buildDeerFlowGatewayUrl(path: string): string {
    const base = this.deerFlowBaseUrl.replace(/\/$/, "");
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    if (normalizedPath.startsWith("/api/")) return `${base}${normalizedPath}`;
    // Avoid generating .../api/langgraph/api/... when base already contains /api.
    if (/\/api(?:\/|$)/.test(base)) return `${base}${normalizedPath}`;
    return `${base}/api${normalizedPath}`;
  }

  private get deerFlowGatewayHeaders(): Record<string, string> {
    return {
      "Content-Type": "application/json",
      ...(this.deerFlowApiKey
        ? { "X-Api-Key": this.deerFlowApiKey, Authorization: `Bearer ${this.deerFlowApiKey}` }
        : {})
    };
  }

  private async getLockedLobsterRow(
    tx: Prisma.TransactionClient,
    userId: bigint
  ): Promise<LockedLobsterRow | null> {
    const [locked] = await tx.$queryRaw<LockedLobsterRow[]>`
      SELECT lobster_id, status, hp, personality, last_executed_at
      FROM lobster_statuses
      WHERE user_id = ${userId}
      FOR UPDATE
    `;

    return locked ?? null;
  }

  private async tryAutoActivateFromResource(
    tx: Prisma.TransactionClient,
    userId: bigint
  ): Promise<boolean> {
    const resourceCount = await tx.resource.count({ where: { userId } });
    if (resourceCount < 1) {
      return false;
    }

    const lobster = await tx.lobsterStatus.findUnique({
      where: { userId },
      select: { lobsterId: true, status: true }
    });

    if (!lobster) {
      await tx.lobsterStatus.create({
        data: {
          userId,
          hp: 100,
          status: "active"
        }
      });
      return true;
    }

    if (lobster.status === "sleeping") {
      await tx.lobsterStatus.update({
        where: { lobsterId: lobster.lobsterId },
        data: { status: "active" }
      });
      return true;
    }

    return (
      lobster.status === "active" || lobster.status === "executing" || lobster.status === "paused"
    );
  }

  // ===== 用户端方法 =====
  async activate(userId: bigint, dto: ActivateLobsterDto) {
    return this.prisma.lobsterStatus.upsert({
      where: { userId },
      create: {
        userId,
        hp: 100,
        personality: dto.personality ?? null,
        personalityUnlocked: !!dto.personality,
        status: "active"
      },
      update: {
        status: "active",
        ...(dto.personality ? { personality: dto.personality, personalityUnlocked: true } : {})
      }
    });
  }

  async getStatus(userId: bigint) {
    const lobster = await this.prisma.lobsterStatus.findUnique({
      where: { userId },
      include: {
        hpLogs: { orderBy: { createdAt: "desc" }, take: 10 },
        taskLogs: { orderBy: { startedAt: "desc" }, take: 5 }
      }
    });
    if (!lobster) return { status: "sleeping", hp: 0 };
    return lobster;
  }

  async triggerTask(userId: bigint, dto: TriggerTaskDto) {
    const taskType = dto.taskType ?? "daily_scan";

    const taskLog = await this.prisma.$transaction(async (tx) => {
      let locked = await this.getLockedLobsterRow(tx, userId);

      if (!locked || locked.status === "sleeping") {
        const activatedFromResource = await this.tryAutoActivateFromResource(tx, userId);
        if (activatedFromResource) {
          locked = await this.getLockedLobsterRow(tx, userId);
        }
      }

      if (!locked || locked.status === "sleeping") {
        throw new BadRequestException("赛博分身未激活");
      }
      if (locked.status === "paused") {
        throw new BadRequestException("存在待审核任务，请先完成审核");
      }
      if (locked.status === "executing") {
        // 超过 10 分钟仍在执行，视为异常卡死，自动恢复
        const lastExec = locked.last_executed_at as Date | null;
        const tenMinutesAgo = new Date(Date.now() - 10 * 60_000);
        const isStuck = !lastExec || lastExec < tenMinutesAgo;
        if (!isStuck) {
          throw new BadRequestException("赛博分身正在执行中，请稍后再试");
        }
        this.logger.warn(
          `[triggerTask] User ${userId} lobster stuck in executing >10min, auto-recovering`
        );
        await tx.lobsterStatus.update({
          where: { lobsterId: locked.lobster_id },
          data: { status: "active" }
        });
        locked = { ...locked, status: "active" };
      }
      if (Number(locked.hp) < 10) {
        throw new BadRequestException("HP 不足，无法执行任务");
      }

      const personality = dto.personalityOverride ?? locked.personality ?? "city";
      const createdTaskLog = await tx.lobsterTaskLog.create({
        data: {
          lobsterId: locked.lobster_id,
          taskType,
          personality,
          status: "running",
          startedAt: new Date()
        }
      });

      await tx.lobsterStatus.update({
        where: { lobsterId: locked.lobster_id },
        data: {
          status: "executing",
          lastExecutedAt: new Date()
        }
      });

      await this.deductHpWithClient(
        tx,
        locked.lobster_id,
        -10,
        "daily_deduct",
        createdTaskLog.logId
      );

      return createdTaskLog;
    });

    const userInfo = await this.prisma.user.findUnique({
      where: { userId },
      select: { city: true }
    });

    try {
      if (!this.producer) {
        throw new Error("RabbitMQ producer unavailable (LOBSTER_MQ_DISABLED=true)");
      }
      await this.producer.publishTask({
        userId: userId.toString(),
        personality: taskLog.personality,
        city: userInfo?.city ?? undefined,
        taskLogId: taskLog.logId.toString()
      });
    } catch (error) {
      await this.prisma.$transaction(async (tx) => {
        await this.deductHpWithClient(tx, taskLog.lobsterId, 10, "publish_rollback", taskLog.logId);
        await tx.lobsterTaskLog.update({
          where: { logId: taskLog.logId },
          data: {
            status: "failed",
            completedAt: new Date(),
            outputJson: this.toPrismaJson({
              reason: "mq_publish_failed",
              message: error instanceof Error ? error.message : String(error)
            })
          }
        });
        await tx.lobsterStatus.update({
          where: { lobsterId: taskLog.lobsterId },
          data: { status: "active" }
        });
      });

      const message = error instanceof Error ? error.message : String(error);
      throw new BadRequestException(`任务派发失败，已自动回滚 HP：${message}`);
    }

    return { taskLogId: taskLog.logId.toString(), personality: taskLog.personality };
  }

  /**
   * 用户主动重置自己的赛博分身状态（仅限从 executing 恢复到 active）
   */
  async resetStatus(userId: bigint) {
    const lobster = await this.prisma.lobsterStatus.findUnique({ where: { userId } });
    if (!lobster) {
      throw new BadRequestException("赛博分身未找到");
    }
    if (lobster.status !== "executing") {
      return { reset: false, currentStatus: lobster.status, message: "当前状态无需重置" };
    }
    await this.prisma.lobsterStatus.update({
      where: { userId },
      data: { status: "active" }
    });
    this.logger.log(`[resetStatus] User ${userId} manually reset executing → active`);
    return { reset: true, currentStatus: "active", message: "状态已重置为 active" };
  }

  async submitReview(userId: bigint, taskId: string, dto: ReviewCallbackDto) {
    if (!this.producer) {
      throw new BadRequestException("RabbitMQ 未启用，当前环境无法提交审核队列");
    }

    const taskLog = await this.prisma.lobsterTaskLog.findUnique({
      where: { logId: BigInt(taskId) },
      include: { lobster: true }
    });

    if (!taskLog || taskLog.lobster.userId !== userId) {
      throw new NotFoundException("任务不存在");
    }

    await this.producer.publishReviewResult({
      taskId,
      approved: dto.approved,
      feedback: dto.feedback
    });

    return { taskId, approved: dto.approved };
  }

  async getOpportunities(userId: bigint, sourceType?: string, page = 1, size = 20) {
    const skip = (page - 1) * size;
    const normalizedSourceType = sourceType?.trim().toLowerCase();
    const isCampusFeed = normalizedSourceType === "campus_recruitment";
    const where: Prisma.OpportunityWhereInput = isCampusFeed
      ? {
          ...(normalizedSourceType ? { sourceType: normalizedSourceType } : {})
        }
      : {
          userId,
          ...(normalizedSourceType ? { sourceType: normalizedSourceType } : {})
        };

    const [total, list] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: size
      })
    ]);

    if (isCampusFeed && total === 0) {
      const fallbackList = this.buildCampusFallbackOpportunities();
      return {
        total: fallbackList.length,
        page,
        size,
        list: fallbackList.slice(skip, skip + size)
      };
    }

    return { total, page, size, list };
  }

  async getTaskLogs(userId: bigint) {
    const lobster = await this.prisma.lobsterStatus.findUnique({ where: { userId } });
    if (!lobster) return [];
    return this.prisma.lobsterTaskLog.findMany({
      where: { lobsterId: lobster.lobsterId },
      orderBy: { startedAt: "desc" },
      take: 20
    });
  }

  // ===== 用户侧：获取我的审核任务 (JWT) =====
  async getReviews(
    userId: bigint,
    page: number,
    size: number
  ): Promise<PaginatedResult<ReviewTaskRecord>> {
    const skip = (page - 1) * size;
    const [total, list] = await Promise.all([
      this.prisma.reviewTask.count({ where: { userId } }),
      this.prisma.reviewTask.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: size
      })
    ]);

    return {
      total,
      page,
      size,
      list: list.map((item) => ({
        reviewId: item.reviewId.toString(),
        taskLogId: item.taskLogId?.toString(),
        context: item.context as Record<string, unknown>,
        status: item.status as ReviewTaskRecord["status"],
        expiresAt: item.expiresAt,
        createdAt: item.createdAt
      }))
    };
  }

  // ===== 用户侧：获取我的龙虾撮合记录 (JWT) =====
  async getMatches(
    userId: bigint,
    page: number,
    size: number
  ): Promise<PaginatedResult<LobsterMatchRecordDto>> {
    const skip = (page - 1) * size;
    const [total, list] = await Promise.all([
      this.prisma.lobsterMatchRecord.count({ where: { userId } }),
      this.prisma.lobsterMatchRecord.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        skip,
        take: size
      })
    ]);

    return {
      total,
      page,
      size,
      list: list.map((item) => ({
        matchId: item.matchId.toString(),
        targetUserId: item.targetUserId?.toString(),
        title: item.title,
        content: item.content ?? undefined,
        matchScore: item.matchScore ? Number(item.matchScore) : undefined,
        metadata:
          item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata)
            ? (item.metadata as Record<string, unknown>)
            : undefined,
        createdAt: item.createdAt
      }))
    };
  }

  // ===== DeerFlow 回调方法 =====
  /**
   * 获取单个用户画像（DeerFlow 调用）
   * 包含基础信息、HP 以及从 Resource 中聚合的标签
   */
  async getProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        city: true,
        role: true,
        resources: {
          select: { tags: true }
        }
      }
    });

    const lobster = await this.prisma.lobsterStatus.findUnique({
      where: { userId }
    });

    // 聚合所有资源的标签
    const tags =
      user?.resources.flatMap((r) => {
        try {
          return Array.isArray(r.tags) ? r.tags : [];
        } catch {
          return [];
        }
      }) ?? [];

    return {
      userId: userId.toString(),
      city: user?.city ?? null,
      personality: lobster?.personality ?? "city",
      hp: lobster?.hp ?? 0,
      tags: [...new Set(tags)] // 去重
    };
  }

  /**
   * 批量获取用户画像（DeerFlow 批量任务逻辑使用）
   */
  async getBatchProfiles(userIds: string[]) {
    const ids = userIds.map((id) => BigInt(id));
    const users = await this.prisma.user.findMany({
      where: { userId: { in: ids } },
      select: {
        userId: true,
        city: true,
        role: true,
        resources: {
          select: { tags: true }
        }
      }
    });

    const lobsters = await this.prisma.lobsterStatus.findMany({
      where: { userId: { in: ids } }
    });

    const lobsterMap = new Map(lobsters.map((l) => [l.userId, l]));

    return users.map((u) => {
      const l = lobsterMap.get(u.userId);
      const tags = u.resources.flatMap((r) => (Array.isArray(r.tags) ? r.tags : []));
      return {
        userId: u.userId.toString(),
        city: u.city ?? null,
        personality: l?.personality ?? "city",
        hp: l?.hp ?? 0,
        tags: [...new Set(tags)]
      };
    });
  }

  // ===== 用户侧：HP 变动明细（分页） =====
  async getHpLogs(userId: bigint, page: number, size: number) {
    const lobster = await this.prisma.lobsterStatus.findUnique({ where: { userId } });
    if (!lobster) return { total: 0, list: [] };

    const skip = (page - 1) * size;
    const [total, list] = await Promise.all([
      this.prisma.hpLog.count({ where: { lobsterId: lobster.lobsterId } }),
      this.prisma.hpLog.findMany({
        where: { lobsterId: lobster.lobsterId },
        orderBy: { createdAt: "desc" },
        skip,
        take: size
      })
    ]);

    return { total, page, size, list };
  }

  // ===== 用户侧：完整画像（用户主动查询，比 getProfile 更详细） =====
  async getMyProfile(userId: bigint) {
    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        city: true,
        role: true,
        createdAt: true
      }
    });
    const lobster = await this.prisma.lobsterStatus.findUnique({
      where: { userId },
      include: {
        hpLogs: { orderBy: { createdAt: "desc" }, take: 5 },
        taskLogs: { orderBy: { startedAt: "desc" }, take: 3 }
      }
    });

    return {
      user: {
        userId: userId.toString(),
        city: user?.city ?? null,
        role: user?.role ?? null,
        memberSince: user?.createdAt ?? null
      },
      lobster: lobster
        ? {
            status: lobster.status,
            hp: lobster.hp,
            personality: lobster.personality,
            personalityUnlocked: lobster.personalityUnlocked,
            lobsterExpiresAt: lobster.lobsterExpiresAt,
            lastExecutedAt: lobster.lastExecutedAt,
            recentHpChanges: lobster.hpLogs,
            recentTasks: lobster.taskLogs
          }
        : null
    };
  }

  /**
   * 处理来自 RabbitMQ 队列的 DeerFlow 结果
   * 与 handlePushResult 功能相同但入参格式不同（MQ 推送格式 vs HTTP 回调格式）
   */
  async handleDeerflowResultFromQueue(payload: {
    taskId: string;
    runId: string;
    userId: string;
    status: "completed" | "failed" | "partial";
    result?: Record<string, unknown>[];
    error?: string;
    executedAt: string;
  }) {
    const { taskId, runId, userId, status, result: opportunities, error, executedAt } = payload;

    // 幂等检查
    const existing = await this.prisma.lobsterTaskLog.findFirst({
      where: { deerflowRunId: runId }
    });
    if (existing?.status === "completed") {
      return { deduplicated: true };
    }

    const userIdBigInt = BigInt(userId);

    // 写入机会数据（如果存在）
    let opportunityCount = 0;
    if (Array.isArray(opportunities) && opportunities.length > 0) {
      for (const opp of opportunities) {
        try {
          const title = (opp.title as string) || "未命名机会";
          const sourceUrl = opp.sourceUrl ? (opp.sourceUrl as string) : null;
          await this.prisma.opportunity.create({
            data: {
              userId: userIdBigInt,
              sourceType: (opp.sourceType as string) || "campus_recruitment",
              position: title,
              announcementUrl: sourceUrl || "",
              applyUrl: sourceUrl || "",
              companyName: "未知企业",
              industry: "未知行业",
              logoGradient: "from-slate-500 to-slate-600",
              recruitmentType: "校园招聘",
              location: "全国",
              startDate: new Date().toISOString().slice(0, 10),
              endDate: new Date().toISOString().slice(0, 10)
            }
          });
          opportunityCount++;
        } catch (e) {
          this.logger.warn(
            `[MQ Consumer] 写入 opportunity 失败: ${e instanceof Error ? e.message : e}`
          );
        }
      }
    }

    // 更新任务日志状态
    if (existing) {
      await this.prisma.lobsterTaskLog.update({
        where: { logId: existing.logId },
        data: {
          status,
          completedAt: new Date(),
          outputJson: this.toPrismaJson({
            taskId,
            runId,
            status,
            error,
            executedAt,
            opportunityCount
          })
        }
      });
    }

    // 恢复分身状态为 active
    await this.prisma.lobsterStatus.upsert({
      where: { userId: userIdBigInt },
      update: { status: "active" },
      create: { userId: userIdBigInt, hp: 100, status: "active" }
    });

    // HP 奖励（仅成功完成时）
    if (status === "completed") {
      try {
        const lobster = await this.prisma.lobsterStatus.findUnique({
          where: { userId: userIdBigInt }
        });
        if (lobster) {
          await this.deductHp(lobster.lobsterId, 5, "view_bonus", null);
        }
      } catch (hpError) {
        this.logger.warn(
          `[MQ Consumer] HP 奖励失败: ${hpError instanceof Error ? hpError.message : hpError}`
        );
      }
    }

    return { received: true, opportunityCount, status };
  }

  async handlePushResult(dto: DeerFlowPushResultDto) {
    const existing = await this.prisma.lobsterTaskLog.findFirst({
      where: { deerflowRunId: dto.deerflowRunId }
    });
    if (existing?.status === "completed") {
      return { deduplicated: true };
    }

    for (const opp of dto.opportunities) {
      const userId = BigInt(dto.userId);
      const normalizedOpportunity = this.normalizeCampusOpportunity(opp);

      // 1. 存入 Opportunity 表 (用于详情展示)
      await this.prisma.opportunity.create({
        data: {
          userId,
          ...normalizedOpportunity
        }
      });

      // 2. 如果是高匹配度的结果，存入 LobsterMatchRecord
      if (
        normalizedOpportunity.sourceType === "match" ||
        normalizedOpportunity.sourceType === "recommend"
      ) {
        await this.prisma.lobsterMatchRecord.create({
          data: {
            userId,
            title: `${normalizedOpportunity.companyName}-${normalizedOpportunity.position}`,
            content: [
              normalizedOpportunity.industry,
              normalizedOpportunity.location,
              normalizedOpportunity.recruitmentType
            ].join(" | "),
            metadata: this.toPrismaJson({
              source: "deerflow",
              announcementUrl: normalizedOpportunity.announcementUrl,
              applyUrl: normalizedOpportunity.applyUrl,
              deerflowRunId: dto.deerflowRunId
            })
          }
        });
      }
    }

    if (existing) {
      await this.prisma.lobsterTaskLog.update({
        where: { logId: existing.logId },
        data: {
          status: "completed",
          completedAt: new Date(),
          outputJson: this.toPrismaJson(dto)
        }
      });
    }

    // 🚨 核心修复：将 update 替换为 upsert
    await this.prisma.lobsterStatus.upsert({
      where: { userId: BigInt(dto.userId) },
      update: {
        status: "active"
      },
      create: {
        userId: BigInt(dto.userId),
        status: "active"
        // 注意：如果你 Prisma Schema 里的 LobsterStatus 表还有其他没有默认值的必填字段，请在这里一并补齐（比如 hp: 100）
      }
    });

    return { received: true, opportunityCount: dto.opportunities.length };
  }

  async handleHpEvent(dto: DeerFlowHpEventDto) {
    const lobster = await this.prisma.lobsterStatus.findUnique({
      where: { userId: BigInt(dto.userId) }
    });
    if (!lobster) return { received: false };

    await this.deductHp(
      lobster.lobsterId,
      dto.delta,
      dto.reason,
      dto.refId ? BigInt(dto.refId) : null
    );
    return { received: true };
  }

  async handleTaskStatus(dto: DeerFlowTaskStatusDto) {
    const taskLog = await this.prisma.lobsterTaskLog.findFirst({
      where: { deerflowRunId: dto.deerflowRunId }
    });
    if (taskLog) {
      await this.prisma.lobsterTaskLog.update({
        where: { logId: taskLog.logId },
        data: {
          status: dto.status,
          ...(dto.status === "completed" ? { completedAt: new Date() } : {}),
          ...(dto.outputJson ? { outputJson: this.toPrismaJson(dto.outputJson) } : {})
        }
      });
    }
    return { received: true };
  }

  // ===== 定时任务逻辑：扫描并清理过期审核 =====
  async handleReviewExpiry() {
    const expiredReviews = await this.prisma.reviewTask.findMany({
      where: {
        status: "pending",
        expiresAt: { lt: new Date() }
      }
    });

    if (expiredReviews.length === 0) return 0;

    for (const review of expiredReviews) {
      await this.prisma.$transaction([
        // 1. 标记审核单过期
        this.prisma.reviewTask.update({
          where: { reviewId: review.reviewId },
          data: { status: "expired" }
        }),
        // 2. 恢复该用户的龙虾分身状态为 active
        this.prisma.lobsterStatus.update({
          where: { userId: review.userId },
          data: { status: "active" }
        })
      ]);
      this.logger.log(`[审核过期] 已自动清理用户 ${review.userId} 的过期审核单`);
    }

    return expiredReviews.length;
  }

  // ===== 内部方法 =====
  private async deductHp(lobsterId: bigint, delta: number, reason: string, refId: bigint | null) {
    return this.prisma.$transaction((tx) =>
      this.deductHpWithClient(tx, lobsterId, delta, reason, refId)
    );
  }

  private async deductHpWithClient(
    tx: Prisma.TransactionClient,
    lobsterId: bigint,
    delta: number,
    reason: string,
    refId: bigint | null
  ) {
    const [lobster] = await tx.$queryRaw<Array<{ lobster_id: bigint; hp: number; status: string }>>`
      SELECT lobster_id, hp, status FROM lobster_statuses
      WHERE lobster_id = ${lobsterId} FOR UPDATE
    `;
    if (!lobster) throw new BadRequestException("Lobster status not found");
    const newHp = Number(lobster.hp) + delta;
    if (newHp < 0) throw new BadRequestException("HP 不足");

    await tx.hpLog.create({
      data: { lobsterId, delta, reason, refId }
    });

    return tx.lobsterStatus.update({
      where: { lobsterId },
      data: { hp: newHp }
    });
  }

  // ===== 直接 HTTP 触发 DeerFlow（MQ 不可用时的备用路径） =====
  async triggerAutomationHttp(userId: string, taskType: string) {
    const payload = {
      messages: [
        {
          role: "user",
          content: `执行自动化任务：${taskType}，用户ID为 ${userId}`
        }
      ],
      skill: "lobster-browser-task",
      thread_id: `user-${userId}-${Date.now()}`
    };
    try {
      const response = await axios.post(this.buildDeerFlowGatewayUrl("/chat"), payload, {
        timeout: 10000,
        headers: this.deerFlowGatewayHeaders
      });
      this.logger.log(`DeerFlow HTTP 触发成功, userId=${userId}`);
      return { success: true, deerflowResponse: response.data };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`DeerFlow HTTP 触发失败: ${errorMessage}`);
      throw new BadRequestException(`无法启动 AI 分身: ${errorMessage}`);
    }
  }

  // ===== SSE 流式转发：订阅 DeerFlow 实时思考过程 =====
  triggerStreamHttp(userId: string, taskType: string): Observable<MessageEvent> {
    const payload = {
      messages: [
        {
          role: "user",
          content: `执行自动化任务：${taskType}，用户ID为 ${userId}`
        }
      ],
      skill: "lobster-browser-task",
      thread_id: `user-${userId}-${Date.now()}`
    };

    return new Observable<MessageEvent>((subscriber) => {
      this.logger.log(`[SSE Stream] 启动流式监听, userId=${userId}`);

      axios
        .post(this.buildDeerFlowGatewayUrl("/chat"), payload, {
          responseType: "stream",
          headers: {
            ...this.deerFlowGatewayHeaders,
            Accept: "text/event-stream"
          },
          timeout: 5 * 60 * 1000 // 5分钟超时
        })
        .then((response) => {
          const stream = response.data as NodeJS.ReadableStream;
          let buffer = "";

          stream.on("data", (chunk: Buffer) => {
            buffer += chunk.toString();
            // SSE 每条消息用 \n\n 分隔
            const parts = buffer.split("\n\n");
            buffer = parts.pop() ?? "";

            for (const part of parts) {
              let eventType = "message";
              let dataLine = "";

              for (const line of part.split("\n")) {
                if (line.startsWith("event: ")) {
                  eventType = line.slice(7).trim();
                } else if (line.startsWith("data: ")) {
                  dataLine = line.slice(6).trim();
                }
              }

              if (!dataLine || dataLine === "[DONE]") {
                if (dataLine === "[DONE]") subscriber.complete();
                continue;
              }

              try {
                const parsed = JSON.parse(dataLine);
                subscriber.next({
                  type: eventType,
                  data: parsed
                } as MessageEvent);
              } catch {
                // 非 JSON 格式的文本也转发
                subscriber.next({
                  type: eventType,
                  data: { text: dataLine }
                } as MessageEvent);
              }
            }
          });

          stream.on("end", () => {
            this.logger.log(`[SSE Stream] DeerFlow 输出完毕, userId=${userId}`);
            subscriber.next({ type: "done", data: { done: true } } as MessageEvent);
            subscriber.complete();
          });

          stream.on("error", (err: Error) => {
            this.logger.error(`[SSE Stream] 流式返回报错: ${err.message}`);
            subscriber.next({ type: "error", data: { error: err.message } } as MessageEvent);
            subscriber.complete();
          });
        })
        .catch((err: unknown) => {
          this.logger.error(`[SSE Stream] 连接 DeerFlow 失败: ${(err as Error).message}`);
          subscriber.next({
            type: "error",
            data: { error: `无法连接 DeerFlow: ${(err as Error).message}` }
          } as MessageEvent);
          subscriber.complete();
        });

      // 客户端断开时的清理逻辑
      return () => {
        this.logger.log(`[SSE Stream] 客户端主动断开, userId=${userId}`);
      };
    });
  }

  // ===== webhook/callback 简化回调处理 =====
  async handleWebhookCallback(data: DeerFlowWebhookCallbackDto) {
    const userIdStr = data.metadata?.userId;
    const taskType = data.metadata?.taskType;

    if (!userIdStr) {
      this.logger.error(`[分身回调] 缺失 userId metadata, run_id=${data.run_id}`);
      return { status: "ignored", reason: "missing_userId" };
    }

    this.logger.log(`[分身回调] userId=${userIdStr}, status=${data.status}, type=${taskType}`);

    const userId = BigInt(userIdStr);
    const normalizedStatus = data.status.toLowerCase();
    const lobsterStatus = this.mapDeerFlowStatusToLobster(normalizedStatus);
    const taskStatus = this.mapDeerFlowStatusToTask(normalizedStatus);
    const metadataTaskLogId = this.parseOptionalBigInt(data.metadata?.taskLogId);

    let taskLog = data.run_id
      ? await this.prisma.lobsterTaskLog.findFirst({
          where: { deerflowRunId: data.run_id }
        })
      : null;

    if (!taskLog && metadataTaskLogId) {
      taskLog = await this.prisma.lobsterTaskLog.findUnique({
        where: { logId: metadataTaskLogId }
      });
    }

    if (taskLog && taskLog.status === "completed" && taskStatus === "completed") {
      return { status: "ignored", reason: "already_completed", run_id: data.run_id };
    }
    if (taskLog && taskLog.status === "failed" && taskStatus === "failed") {
      return { status: "ignored", reason: "already_failed", run_id: data.run_id };
    }

    await this.prisma.$transaction(async (tx) => {
      const lobster = await tx.lobsterStatus.findUnique({ where: { userId } });
      if (lobster) {
        await tx.lobsterStatus.update({
          where: { userId },
          data: {
            status: lobsterStatus,
            lastExecutedAt: new Date()
          }
        });
      }

      if (!taskLog) return;

      await tx.lobsterTaskLog.update({
        where: { logId: taskLog.logId },
        data: {
          ...(data.run_id && !taskLog.deerflowRunId ? { deerflowRunId: data.run_id } : {}),
          status: taskStatus,
          ...(taskStatus === "completed" || taskStatus === "failed"
            ? { completedAt: new Date() }
            : {}),
          ...(taskStatus === "completed" ? { outputJson: this.toPrismaJson(data.values) } : {})
        }
      });
    });

    if (!taskLog && (data.run_id || metadataTaskLogId)) {
      this.logger.warn(
        `[分身回调] 未找到 task log, run_id=${data.run_id ?? "N/A"}, taskLogId=${
          metadataTaskLogId?.toString() ?? "N/A"
        }`
      );
    }

    return { status: "received", run_id: data.run_id };
  }

  private normalizeCampusOpportunity(opp: DeerFlowPushResultDto["opportunities"][number]) {
    const fallbackDate = this.getTodayDateString();
    const title = opp.title?.trim();
    const sourceUrl = opp.sourceUrl?.trim();
    const announcementUrl = opp.announcementUrl?.trim() || sourceUrl || "";
    const applyUrl = opp.applyUrl?.trim() || announcementUrl;

    return {
      companyName: opp.companyName?.trim() || this.extractCompanyNameFromTitle(title) || "未知公司",
      industry: opp.industry?.trim() || "未知行业",
      logoGradient: opp.logoGradient?.trim() || "from-slate-500 to-slate-600",
      recruitmentType: opp.recruitmentType?.trim() || "校园招聘",
      location: opp.location?.trim() || "全国",
      startDate: opp.startDate?.trim() || fallbackDate,
      endDate: opp.endDate?.trim() || fallbackDate,
      noWrittenTest: opp.noWrittenTest ?? false,
      position: opp.position?.trim() || title || "待补充岗位",
      announcementUrl,
      applyUrl,
      sourceType: opp.sourceType?.trim() || "campus_recruitment"
    };
  }

  private buildCampusFallbackOpportunities() {
    const now = new Date();
    const rows = [
      {
        companyName: "Tencent",
        industry: "Internet",
        logoGradient: "from-blue-500 to-cyan-500",
        recruitmentType: "Campus Recruitment",
        location: "Beijing",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: false,
        position: "Backend Engineer",
        announcementUrl: "https://join.qq.com/",
        applyUrl: "https://join.qq.com/"
      },
      {
        companyName: "Alibaba",
        industry: "E-commerce",
        logoGradient: "from-orange-500 to-amber-400",
        recruitmentType: "Campus Recruitment",
        location: "Hangzhou",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: false,
        position: "Frontend Engineer",
        announcementUrl: "https://talent.alibaba.com/",
        applyUrl: "https://talent.alibaba.com/"
      },
      {
        companyName: "ByteDance",
        industry: "Internet",
        logoGradient: "from-indigo-500 to-violet-500",
        recruitmentType: "Internship",
        location: "Shanghai",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: true,
        position: "Data Analyst Intern",
        announcementUrl: "https://jobs.bytedance.com/",
        applyUrl: "https://jobs.bytedance.com/"
      },
      {
        companyName: "Huawei",
        industry: "Telecom",
        logoGradient: "from-rose-500 to-red-500",
        recruitmentType: "Campus Recruitment",
        location: "Shenzhen",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: false,
        position: "Embedded Engineer",
        announcementUrl: "https://career.huawei.com/",
        applyUrl: "https://career.huawei.com/"
      },
      {
        companyName: "NetEase",
        industry: "Internet",
        logoGradient: "from-purple-500 to-fuchsia-500",
        recruitmentType: "Campus Recruitment",
        location: "Guangzhou",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: true,
        position: "Game Operations",
        announcementUrl: "https://campus.163.com/",
        applyUrl: "https://campus.163.com/"
      },
      {
        companyName: "Xiaomi",
        industry: "Consumer Electronics",
        logoGradient: "from-amber-500 to-orange-500",
        recruitmentType: "Campus Recruitment",
        location: "Nanjing",
        startDate: "2026-04-01",
        endDate: "2026-05-31",
        noWrittenTest: false,
        position: "Test Development Engineer",
        announcementUrl: "https://hr.xiaomi.com/",
        applyUrl: "https://hr.xiaomi.com/"
      }
    ];

    return rows.map((row, index) => ({
      opportunityId: BigInt(900000000000 + index + 1),
      userId: BigInt(0),
      sourceType: "campus_recruitment",
      createdAt: now,
      ...row
    }));
  }

  private getTodayDateString(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private extractCompanyNameFromTitle(title?: string): string | null {
    if (!title) return null;
    const normalized = title.trim();
    if (!normalized) return null;
    const [head] = normalized.split(/[-|:：]/);
    const companyName = head?.trim();
    return companyName || null;
  }

  // 将外部回调结果标准化为 Prisma 可接受的 JSON 类型，避免类型漂移
  private toPrismaJson(
    payload: unknown
  ): Prisma.NullableJsonNullValueInput | Prisma.InputJsonValue {
    if (payload === null) return Prisma.JsonNull;
    return JSON.parse(JSON.stringify(payload)) as Prisma.InputJsonValue;
  }

  private mapDeerFlowStatusToLobster(
    status: string
  ): "active" | "sleeping" | "executing" | "paused" {
    if (status === "busy" || status === "running") return "executing";
    if (status === "interrupted" || status === "paused") return "paused";
    if (status === "completed" || status === "idle" || status === "success") return "active";
    if (status === "failed" || status === "error") return "active";
    return "active";
  }

  private mapDeerFlowStatusToTask(status: string): "running" | "completed" | "failed" {
    if (status === "completed" || status === "idle" || status === "success") return "completed";
    if (status === "failed" || status === "error") return "failed";
    return "running";
  }

  private parseOptionalBigInt(value: unknown): bigint | null {
    if (typeof value === "string" && value.trim().length > 0) {
      try {
        return BigInt(value.trim());
      } catch {
        return null;
      }
    }
    if (typeof value === "number" && Number.isInteger(value)) {
      return BigInt(value);
    }
    return null;
  }

  // ===== 批量与审核扩展 (路线图 4.2-4.5) =====

  /**
   * 批量获取用户画像及分身状态，供 AI 调度器使用
   */
  async getUsersBatch(query: UserBatchQueryDto) {
    const { city, personality } = query;
    const page = Math.max(1, Number(query.page ?? 1));
    const size = Math.min(100, Math.max(1, Number(query.size ?? 50)));
    const skip = (page - 1) * size;

    const where: Prisma.UserWhereInput = {
      ...(city ? { city } : {}),
      ...(personality ? { lobster: { personality } } : {})
    };

    const [total, list] = await this.prisma.$transaction([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        skip,
        take: size,
        select: {
          userId: true,
          city: true,
          memberLevel: true,
          status: true,
          lobster: {
            select: {
              lobsterId: true,
              hp: true,
              personality: true,
              status: true,
              lastExecutedAt: true
            }
          },
          lobsterMatchRecords: {
            select: {
              matchId: true,
              targetUserId: true,
              title: true,
              matchScore: true,
              createdAt: true
            },
            take: 3,
            orderBy: { createdAt: "desc" }
          }
        }
      })
    ]);

    return { total, page, size, list };
  }

  /**
   * 接收来自 DeerFlow 的“人工审核”挂起请求
   */
  async handleReviewPending(dto: CreateReviewTaskDto) {
    const userId = BigInt(dto.userId);
    const taskLogId = dto.taskLogId ? BigInt(dto.taskLogId) : null;

    if (taskLogId) {
      const existing = await this.prisma.reviewTask.findFirst({
        where: {
          userId,
          taskLogId,
          status: "pending"
        },
        orderBy: { createdAt: "desc" }
      });
      if (existing) {
        this.logger.log(`[人工审核] 幂等命中，复用 reviewId=${existing.reviewId}`);
        return { reviewId: existing.reviewId.toString(), reused: true };
      }
    }

    // 创建审核任务，有效期 72 小时
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 72);

    // 创建审核任务并暂停分身状态
    const [reviewTask] = await this.prisma.$transaction([
      this.prisma.reviewTask.create({
        data: {
          userId,
          taskLogId,
          context: {
            threadId: dto.threadId,
            runId: dto.runId,
            contentPreview: dto.contentPreview,
            platform: dto.platform
          },
          status: "pending",
          expiresAt
        }
      }),
      this.prisma.lobsterStatus.update({
        where: { userId },
        data: { status: "paused" }
      })
    ]);

    this.logger.log(
      `[人工审核] 任务已创建并已暂停分身: reviewId=${reviewTask.reviewId}, userId=${userId}`
    );
    return { reviewId: reviewTask.reviewId.toString() };
  }

  /**
   * 获取审核任务详情
   */
  async getReviewTask(userId: bigint, reviewId: bigint) {
    const task = await this.prisma.reviewTask.findUnique({
      where: { reviewId },
      select: {
        reviewId: true,
        userId: true,
        taskLogId: true,
        context: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true
      }
    });
    if (!task || task.userId !== userId) throw new NotFoundException("审核任务不存在");
    return {
      reviewId: task.reviewId.toString(),
      taskLogId: task.taskLogId?.toString() ?? null,
      context: task.context,
      status: task.status,
      expiresAt: task.expiresAt,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt
    };
  }

  /**
   * 处理人工审核动作（通过/拒绝）
   */
  async processReviewAction(userId: bigint, reviewId: bigint, action: ReviewActionDto) {
    const task = await this.prisma.reviewTask.findUnique({ where: { reviewId } });
    if (!task) throw new NotFoundException("审核任务不存在");
    if (task.userId !== userId) throw new BadRequestException("无权操作此审核任务");
    if (task.status !== "pending") throw new BadRequestException("任务已处理或已过期");

    // 1. 更新本地表状态
    await this.prisma.reviewTask.update({
      where: { reviewId },
      data: {
        status: action.approved ? "approved" : "rejected"
      }
    });

    // 2. 调用远端 DeerFlow 继续执行 (Resume Run)
    const context = task.context as { threadId?: string; runId?: string } | null;
    if (context?.threadId && context?.runId) {
      this.logger.log(
        `[人工审核] 正在恢复远端任务: threadId=${context.threadId}, runId=${context.runId}`
      );
      await this.cyberTaskService.resumeRun(
        context.threadId,
        context.runId,
        action.approved,
        action.feedback
      );
    }

    return { success: true, status: action.approved ? "approved" : "rejected" };
  }
}
