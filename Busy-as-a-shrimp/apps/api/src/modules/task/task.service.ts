import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";
import { PointTransType, Prisma, ResourceStatus, SubmissionStatus, TaskStatus } from "@prisma/client";
import { decryptPhone } from "../../common/phone-crypto";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

const bountyUserSelect = {
  userId: true,
  nickname: true,
  maskedPhone: true,
  phoneEncrypted: true,
  city: true,
  district: true,
  memberLevel: true,
  realNameVerified: true,
  avatar: true,
  taskAcceptCount: true,
  _count: {
    select: {
      resources: true
    }
  },
  resources: {
    where: {
      status: ResourceStatus.active
    },
    select: {
      resourceType: true,
      tags: true
    },
    take: 6
  }
} as const;

type BountyTaskWithRelations = Prisma.BountyTaskGetPayload<{
  include: {
    publisher: {
      select: typeof bountyUserSelect;
    };
    submissions: {
      include: {
        user: {
          select: typeof bountyUserSelect;
        };
      };
      orderBy: {
        createdAt: "desc";
      };
    };
  };
}>;

type TaskSubmissionWithRelations = Prisma.TaskSubmissionGetPayload<{
  include: {
    task: {
      include: {
        publisher: {
          select: typeof bountyUserSelect;
        };
      };
    };
    user: {
      select: typeof bountyUserSelect;
    };
  };
}>;

interface PublishTaskInput {
  title: string;
  content: string;
  points: number;
  difficulty?: "EASY" | "MEDIUM" | "HARD" | "EXPERT";
}

export interface SubmissionActionResult {
  success: true;
  submissionId: number;
}

@Injectable()
export class TaskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  async listTasks() {
    return this.prisma.bountyTask.findMany({
      where: {
        status: TaskStatus.PUBLISHED,
        selectedSubmissionId: null,
        publisherId: { not: null }
      },
      orderBy: { createdAt: "desc" }
    });
  }

  async listOpenTasks(userId: bigint) {
    const tasks = await this.prisma.bountyTask.findMany({
      where: {
        status: TaskStatus.PUBLISHED,
        selectedSubmissionId: null,
        publisherId: { not: null }
      },
      include: {
        publisher: {
          select: bountyUserSelect
        },
        submissions: {
          where: { userId },
          include: {
            user: {
              select: bountyUserSelect
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 60
    });

    return tasks
      .filter((task) => task.publisherId !== userId)
      .map((task) => this.toTaskCard(task, userId, "open"));
  }

  async listMyPublishedTasks(userId: bigint) {
    const tasks = await this.prisma.bountyTask.findMany({
      where: { publisherId: userId },
      include: {
        publisher: {
          select: bountyUserSelect
        },
        submissions: {
          include: {
            user: {
              select: bountyUserSelect
            }
          },
          orderBy: { createdAt: "desc" }
        }
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 60
    });

    return tasks.map((task) => this.toTaskCard(task, userId, "published"));
  }

  async listMyClaimedTasks(userId: bigint) {
    const submissions = await this.prisma.taskSubmission.findMany({
      where: { userId },
      include: {
        task: {
          include: {
            publisher: {
              select: bountyUserSelect
            }
          }
        },
        user: {
          select: bountyUserSelect
        }
      },
      orderBy: { createdAt: "desc" },
      take: 60
    });

    return submissions.map((submission) => this.toClaimedTaskCard(submission, userId));
  }

  async getTask(userId: bigint, taskId: bigint) {
    const task = await this.prisma.bountyTask.findUnique({
      where: { taskId },
      include: {
        publisher: {
          select: bountyUserSelect
        },
        submissions: {
          include: {
            user: {
              select: bountyUserSelect
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    if (!task) {
      throw new BadRequestException("悬赏任务不存在");
    }

    return this.toTaskCard(task, userId, task.publisherId === userId ? "published" : "detail");
  }

  async publishTask(userId: bigint, payload: PublishTaskInput) {
    const title = payload.title.trim().slice(0, 100);
    const content = payload.content.trim();
    const points = Number(payload.points);

    if (!title) {
      throw new BadRequestException("悬赏标题不能为空");
    }
    if (!content) {
      throw new BadRequestException("悬赏内容不能为空");
    }
    if (!Number.isFinite(points) || points <= 0) {
      throw new BadRequestException("悬赏积分必须大于 0");
    }

    const task = await this.prisma.bountyTask.create({
      data: {
        publisherId: userId,
        title,
        content,
        points,
        difficulty: payload.difficulty ?? "MEDIUM",
        status: TaskStatus.PUBLISHED
      },
      include: {
        publisher: {
          select: bountyUserSelect
        },
        submissions: {
          include: {
            user: {
              select: bountyUserSelect
            }
          },
          orderBy: { createdAt: "desc" }
        }
      }
    });

    return this.toTaskCard(task, userId, "published");
  }

  async applyTask(userId: bigint, taskId: bigint) {
    return this.claimTask(userId, taskId);
  }

  async claimTask(userId: bigint, taskId: bigint): Promise<SubmissionActionResult> {
    const task = await this.prisma.bountyTask.findUnique({ where: { taskId } });
    if (!task || task.status !== TaskStatus.PUBLISHED) {
      throw new BadRequestException("该悬赏任务不存在或已关闭");
    }
    if (!task.publisherId) {
      throw new BadRequestException("该悬赏任务暂不支持手动领取");
    }
    if (task.publisherId === userId) {
      throw new ForbiddenException("不能领取自己发布的悬赏任务");
    }
    if (task.selectedSubmissionId) {
      throw new BadRequestException("该悬赏任务已有人进入对接流程");
    }

    const existing = await this.prisma.taskSubmission.findFirst({
      where: {
        userId,
        taskId,
        status: SubmissionStatus.PENDING
      }
    });
    if (existing) {
      throw new BadRequestException("你已经领取过该悬赏任务");
    }

    const created = await this.prisma.taskSubmission.create({
      data: {
        userId,
        taskId,
        status: SubmissionStatus.PENDING
      }
    });

    return {
      success: true,
      submissionId: Number(created.submissionId)
    };
  }

  async publisherAgreeSubmission(userId: bigint, submissionId: bigint): Promise<SubmissionActionResult> {
    const submission = await this.requireSubmission(submissionId);
    if (submission.task.publisherId !== userId) {
      throw new ForbiddenException("只有发布方可以同意接单");
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("该接单记录当前不可操作");
    }
    if (
      submission.task.selectedSubmissionId &&
      submission.task.selectedSubmissionId !== submission.submissionId
    ) {
      throw new BadRequestException("该悬赏任务已选定其他接单人");
    }
    if (submission.publisherAgreedAt) {
      return { success: true, submissionId: Number(submission.submissionId) };
    }

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await tx.taskSubmission.update({
        where: { submissionId },
        data: {
          publisherAgreedAt: now
        }
      });
      await tx.bountyTask.update({
        where: { taskId: submission.taskId },
        data: {
          selectedSubmissionId: submission.submissionId
        }
      });
      await tx.taskSubmission.updateMany({
        where: {
          taskId: submission.taskId,
          submissionId: { not: submission.submissionId },
          status: SubmissionStatus.PENDING
        },
        data: {
          status: SubmissionStatus.REJECTED
        }
      });
    });

    return {
      success: true,
      submissionId: Number(submission.submissionId)
    };
  }

  async claimerAgreeSubmission(userId: bigint, submissionId: bigint): Promise<SubmissionActionResult> {
    const submission = await this.requireSubmission(submissionId);
    if (submission.userId !== userId) {
      throw new ForbiddenException("只有接单方可以确认合作");
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("该接单记录当前不可操作");
    }
    if (!submission.publisherAgreedAt) {
      throw new BadRequestException("请等待发布方先确认后再继续");
    }

    const now = new Date();
    await this.prisma.taskSubmission.update({
      where: { submissionId },
      data: {
        claimerAgreedAt: submission.claimerAgreedAt ?? now,
        contactUnlockedAt: submission.contactUnlockedAt ?? now
      }
    });

    return {
      success: true,
      submissionId: Number(submission.submissionId)
    };
  }

  async rejectSubmission(userId: bigint, submissionId: bigint): Promise<SubmissionActionResult> {
    const submission = await this.requireSubmission(submissionId);
    const isPublisher = submission.task.publisherId === userId;
    const isClaimer = submission.userId === userId;

    if (!isPublisher && !isClaimer) {
      throw new ForbiddenException("无权操作该接单记录");
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("该接单记录当前不可操作");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.taskSubmission.update({
        where: { submissionId },
        data: {
          status: SubmissionStatus.REJECTED
        }
      });

      if (submission.task.selectedSubmissionId === submission.submissionId) {
        await tx.bountyTask.update({
          where: { taskId: submission.taskId },
          data: {
            selectedSubmissionId: null
          }
        });
      }
    });

    return {
      success: true,
      submissionId: Number(submission.submissionId)
    };
  }

  async submitProof(userId: bigint, submissionId: bigint, proof: string) {
    const submission = await this.requireSubmission(submissionId);
    if (submission.userId !== userId) {
      throw new ForbiddenException("无权提交该悬赏任务进度");
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("该接单记录当前不可提交进度");
    }
    if (!submission.contactUnlockedAt) {
      throw new BadRequestException("双方尚未完成确认，暂不可提交进度");
    }

    const normalizedProof = proof.trim();
    if (!normalizedProof) {
      throw new BadRequestException("请填写任务进度或交付说明");
    }

    const updated = await this.prisma.taskSubmission.update({
      where: { submissionId },
      data: {
        proof: normalizedProof.slice(0, 5000)
      }
    });

    return {
      success: true,
      submissionId: Number(updated.submissionId)
    };
  }

  async completeSubmissionByPublisher(
    userId: bigint,
    submissionId: bigint
  ): Promise<SubmissionActionResult> {
    const submission = await this.requireSubmission(submissionId);
    if (submission.task.publisherId !== userId) {
      throw new ForbiddenException("只有发布方可以确认悬赏完成");
    }
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("该接单记录当前不可确认完成");
    }
    if (!submission.publisherAgreedAt || !submission.claimerAgreedAt || !submission.contactUnlockedAt) {
      throw new BadRequestException("双方尚未完成确认，暂不能结算奖励");
    }
    if (submission.rewardGrantedAt) {
      return {
        success: true,
        submissionId: Number(submission.submissionId)
      };
    }

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await this.doppelgangerService.addPointsInTransaction(
        tx,
        submission.userId,
        Number(submission.task.points),
        PointTransType.TASK_REWARD,
        {
          source: "bounty_hall_completion",
          taskId: String(submission.taskId),
          submissionId: String(submission.submissionId),
          reason: "完成悬赏任务奖励"
        }
      );

      await tx.taskSubmission.update({
        where: { submissionId },
        data: {
          status: SubmissionStatus.APPROVED,
          rewardGrantedAt: now
        }
      });

      await tx.bountyTask.update({
        where: { taskId: submission.taskId },
        data: {
          status: TaskStatus.FINISHED,
          finishedAt: now
        }
      });
    });

    return {
      success: true,
      submissionId: Number(submission.submissionId)
    };
  }

  async approveSubmission(submissionId: bigint) {
    const submission = await this.requireSubmission(submissionId);
    if (submission.status !== SubmissionStatus.PENDING) {
      throw new BadRequestException("申请不存在或状态不正确。");
    }

    await this.prisma.$transaction(async (tx) => {
      const now = new Date();
      await this.doppelgangerService.addPointsInTransaction(
        tx,
        submission.userId,
        Number(submission.task.points),
        PointTransType.TASK_REWARD,
        {
          source: "admin_task_approval",
          taskId: String(submission.taskId),
          submissionId: String(submission.submissionId),
          reason: "管理员审核通过任务奖励"
        }
      );
      await tx.taskSubmission.update({
        where: { submissionId },
        data: {
          status: SubmissionStatus.APPROVED,
          rewardGrantedAt: now
        }
      });
      await tx.bountyTask.update({
        where: { taskId: submission.taskId },
        data: {
          status: TaskStatus.FINISHED,
          finishedAt: now
        }
      });
    });
  }

  private async requireSubmission(submissionId: bigint): Promise<TaskSubmissionWithRelations> {
    const submission = await this.prisma.taskSubmission.findUnique({
      where: { submissionId },
      include: {
        task: {
          include: {
            publisher: {
              select: bountyUserSelect
            }
          }
        },
        user: {
          select: bountyUserSelect
        }
      }
    });

    if (!submission) {
      throw new BadRequestException("接单记录不存在");
    }

    return submission;
  }

  private toTaskCard(
    task: BountyTaskWithRelations,
    currentUserId: bigint,
    scope: "open" | "published" | "detail"
  ) {
    const currentSubmission =
      task.submissions.find((submission) => submission.userId === currentUserId) ?? null;
    const selectedSubmission =
      task.selectedSubmissionId != null
        ? task.submissions.find((submission) => submission.submissionId === task.selectedSubmissionId) ?? null
        : null;
    const isPublisher = task.publisherId === currentUserId;
    const unlockedSubmission =
      selectedSubmission &&
      selectedSubmission.publisherAgreedAt &&
      selectedSubmission.claimerAgreedAt &&
      selectedSubmission.contactUnlockedAt
        ? selectedSubmission
        : null;

    return {
      taskId: Number(task.taskId),
      title: task.title,
      content: task.content,
      points: Number(task.points),
      difficulty: task.difficulty,
      status: task.status,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      isMine: isPublisher,
      publisher: this.toPublicUserSummary(task.publisher),
      scope,
      claimCount: task.submissions.length,
      selectedSubmissionId: task.selectedSubmissionId ? Number(task.selectedSubmissionId) : null,
      mySubmission: currentSubmission ? this.toSubmissionSummary(currentSubmission, currentUserId) : null,
      selectedSubmission: selectedSubmission
        ? this.toSubmissionSummary(selectedSubmission, currentUserId)
        : null,
      submissions:
        isPublisher || scope === "detail"
          ? task.submissions.map((submission) => this.toSubmissionSummary(submission, currentUserId))
          : [],
      unlockedContact:
        unlockedSubmission && (isPublisher || unlockedSubmission.userId === currentUserId)
          ? {
              publisher: this.toUnlockedContact(task.publisher),
              claimer: this.toUnlockedContact(unlockedSubmission.user)
            }
          : null
    };
  }

  private toClaimedTaskCard(submission: TaskSubmissionWithRelations, currentUserId: bigint) {
    const task = submission.task;
    const unlocked =
      submission.publisherAgreedAt && submission.claimerAgreedAt && submission.contactUnlockedAt;

    return {
      submissionId: Number(submission.submissionId),
      taskId: Number(submission.taskId),
      title: task.title,
      content: task.content,
      points: Number(task.points),
      difficulty: task.difficulty,
      taskStatus: task.status,
      taskCreatedAt: task.createdAt.toISOString(),
      publisher: this.toPublicUserSummary(task.publisher),
      submission: this.toSubmissionSummary(submission, currentUserId),
      unlockedContact: unlocked
        ? {
            publisher: this.toUnlockedContact(task.publisher),
            claimer: this.toUnlockedContact(submission.user)
          }
        : null
    };
  }

  private toSubmissionSummary(
    submission: {
      submissionId: bigint;
      userId: bigint;
      proof: string | null;
      status: SubmissionStatus;
      createdAt: Date;
      updatedAt: Date;
      publisherAgreedAt: Date | null;
      claimerAgreedAt: Date | null;
      contactUnlockedAt: Date | null;
      rewardGrantedAt: Date | null;
      user: {
        userId: bigint;
        nickname: string | null;
        maskedPhone: string | null;
        phoneEncrypted: string | null;
        city: string | null;
        district: string | null;
        memberLevel: string;
        realNameVerified: boolean;
        avatar: string | null;
        taskAcceptCount: number;
        _count: {
          resources: number;
        };
        resources: Array<{
          resourceType: string;
          tags: Prisma.JsonValue;
        }>;
      };
    },
    currentUserId: bigint
  ) {
    return {
      submissionId: Number(submission.submissionId),
      userId: Number(submission.userId),
      claimer: this.toPublicUserSummary(submission.user),
      isCurrentUserSubmission: submission.userId === currentUserId,
      proof: submission.proof ?? "",
      status: submission.status,
      createdAt: submission.createdAt.toISOString(),
      updatedAt: submission.updatedAt.toISOString(),
      publisherAgreedAt: submission.publisherAgreedAt?.toISOString() ?? null,
      claimerAgreedAt: submission.claimerAgreedAt?.toISOString() ?? null,
      contactUnlockedAt: submission.contactUnlockedAt?.toISOString() ?? null,
      rewardGrantedAt: submission.rewardGrantedAt?.toISOString() ?? null
    };
  }

  private toPublicUserSummary(
    user:
        | {
            userId: bigint;
            nickname: string | null;
            maskedPhone: string | null;
            phoneEncrypted: string | null;
            city: string | null;
          district: string | null;
          memberLevel: string;
          realNameVerified: boolean;
          avatar: string | null;
          taskAcceptCount: number;
          _count: {
            resources: number;
          };
          resources: Array<{
            resourceType: string;
            tags: Prisma.JsonValue;
          }>;
        }
      | null
      | undefined
  ) {
    if (!user) {
      return {
        userId: null,
        label: "官方发布",
        nickname: null,
        city: null,
        district: null,
        memberLevel: "free",
        realNameVerified: false,
        avatar: null,
        taskAcceptCount: 0,
        resourceCount: 0,
        resourceHighlights: [],
        skillHighlights: []
      };
    }

    const { resourceHighlights, skillHighlights } = this.extractUserResourceSummary(user.resources);

    return {
      userId: Number(user.userId),
      label: user.nickname?.trim() || `用户 #${user.userId.toString()}`,
      nickname: user.nickname ?? null,
      city: user.city ?? null,
      district: user.district ?? null,
      memberLevel: user.memberLevel ?? "free",
      realNameVerified: Boolean(user.realNameVerified),
      avatar: user.avatar ?? null,
      taskAcceptCount: Number(user.taskAcceptCount ?? 0),
      resourceCount: Number(user._count?.resources ?? 0),
      resourceHighlights,
      skillHighlights
    };
  }

  private extractUserResourceSummary(
    resources: Array<{
      resourceType: string;
      tags: Prisma.JsonValue;
    }>
  ) {
    const resourceHighlights: string[] = [];
    const skillHighlights: string[] = [];

    for (const resource of resources) {
      const tags = this.flattenTagValues(resource.tags);
      for (const tag of tags) {
        const normalized = tag.trim();
        if (!normalized) {
          continue;
        }

        const segments = normalized
          .split(":")
          .map((segment) => segment.trim())
          .filter(Boolean);
        const display =
          segments.length >= 2
            ? segments.slice(1).map((segment) => this.normalizeResourceSegment(segment)).join(" · ")
            : this.normalizeResourceSegment(normalized);
        const bucket =
          resource.resourceType === "skill" || normalized.includes("技能") ? skillHighlights : resourceHighlights;

        if (!bucket.includes(display)) {
          bucket.push(display);
        }
      }

      if (resourceHighlights.length < 6 && resource.resourceType !== "skill") {
        const typeLabel = this.getResourceTypeLabel(resource.resourceType);
        if (typeLabel && !resourceHighlights.includes(typeLabel)) {
          resourceHighlights.push(typeLabel);
        }
      }
    }

    return {
      resourceHighlights: resourceHighlights.slice(0, 6),
      skillHighlights: skillHighlights.slice(0, 6)
    };
  }

  private flattenTagValues(input: Prisma.JsonValue): string[] {
    if (typeof input === "string") {
      return input.trim() ? [input.trim()] : [];
    }

    if (Array.isArray(input)) {
      return input.flatMap((item) => this.flattenTagValues(item as Prisma.JsonValue));
    }

    if (input && typeof input === "object") {
      return Object.values(input).flatMap((item) => this.flattenTagValues(item as Prisma.JsonValue));
    }

    return [];
  }

  private getResourceTypeLabel(resourceType: string) {
    switch (resourceType) {
      case "skill":
        return "技能资源";
      case "location":
        return "场地位置";
      case "account":
        return "账号流量";
      case "time":
        return "时间劳动力";
      default:
        return "资源";
    }
  }

  private normalizeResourceSegment(value: string) {
    const normalized = value.trim().toLowerCase();
    const labelMap: Record<string, string> = {
      skill: "技能",
      location: "场地位置",
      account: "账号流量",
      time: "时间劳动力",
      short_video_script: "短视频脚本",
      visit_store_shoot: "探店拍摄",
      live_stream_ops: "直播运营",
      ai_editing: "AI剪辑",
      graphic_design: "平面设计",
      creator_bd: "达人对接",
      brand_strategy: "品牌策划",
      seek_partner: "寻找合伙人",
      resource_swap: "资源互换",
      cross_industry: "异业合作",
      traffic_share: "流量共享",
      project_outsource: "项目外包",
      recruit_anchor: "招募主播",
      long_term: "长期",
      short_term: "短期",
      weekend: "周末",
      part_time: "兼职",
      one_time: "单次结",
      remote: "远程",
      high_conversion: "高转化",
      weekend_slot: "周末档期",
      food_track: "美食赛道",
      local_life: "本地生活",
      content_cocreation: "内容共创",
      activation_resource: "资源",
      activation_resource_skill: "技能资源",
      activation_resource_location: "场地位置",
      activation_resource_account: "账号流量",
      activation_resource_time: "时间劳动力",
      activation: "激活",
      wish: "意向",
      goal: "目标",
      need: "需求"
    };

    return labelMap[normalized] ?? value.trim();
  }

  private toUnlockedContact(
    user:
      | {
          userId: bigint;
          nickname: string | null;
          maskedPhone: string | null;
          phoneEncrypted: string | null;
        }
      | null
      | undefined
  ) {
    if (!user) {
      return null;
    }

    return {
      userId: Number(user.userId),
      nickname: user.nickname ?? null,
      maskedPhone: decryptPhone(user.phoneEncrypted) ?? user.maskedPhone ?? null
    };
  }
}
