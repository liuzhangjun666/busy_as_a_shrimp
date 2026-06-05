import { BadRequestException, Injectable } from "@nestjs/common";
import {
  CaptainLevel,
  DoppelgangerStatus,
  MemberLevel,
  PointTransType,
  Prisma,
  User
} from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

const FIRST_FIVE_TARGET = 5;
const POST_FIVE_INVITE_REWARD_POINTS = 20;
const LEADERBOARD_CYCLE_DAYS = 14;
const LEADERBOARD_REWARD_POOL = 5000;
const LEADERBOARD_REWARD_LADDER = [1200, 900, 700, 500, 400, 350, 300, 250, 220, 180] as const;
const LEADERBOARD_EPOCH = new Date("2026-06-01T00:00:00+08:00");
const DAY_MS = 24 * 60 * 60 * 1000;

type CaptainClient = PrismaService | Prisma.TransactionClient;

export interface CaptainInfoData {
  level: CaptainLevel;
  inviteCode: string;
  inviteLink: string;
  inviteQrCodeUrl: string;
  rewardRules: {
    firstFiveTarget: number;
    firstFiveRewardLabel: string;
    perValidInvitePointsAfterMilestone: number;
    leaderboardCycleDays: number;
    leaderboardRewardPoolPoints: number;
    leaderboardRewardLadder: number[];
    pointsRequireMembership: boolean;
  };
  firstFiveProgress: {
    qualifiedInvites: number;
    target: number;
    remaining: number;
    unlocked: boolean;
    giftedAt: string | null;
  };
  currentPeriod: {
    periodId: number;
    startTime: string;
    endTime: string;
    rewardPoolPoints: number;
    daysRemaining: number;
    nextSettlementAt: string;
  };
}

export interface CaptainStatsData {
  validInvites: number;
  totalInvites: number;
  currentCycleInvites: number;
  currentCycleRank: number | null;
  totalRewardPoints: number;
  firstFiveQualifiedInvites: number;
  firstFiveTarget: number;
  firstFiveRewardUnlocked: boolean;
}

export interface CaptainRankingItem {
  rank: number;
  captainId: number;
  name: string;
  level: CaptainLevel;
  validInviteCount: number;
  rewardPoints: number;
  isCurrentUser: boolean;
}

export interface CaptainRankingData {
  period: {
    periodId: number;
    startTime: string;
    endTime: string;
    rewardPoolPoints: number;
    cycleDays: number;
    daysRemaining: number;
    nextSettlementAt: string;
  };
  myRank: {
    rank: number | null;
    validInviteCount: number;
    rewardPoints: number | null;
  };
  leaderboard: CaptainRankingItem[];
}

export interface CaptainRewardRecord {
  rewardId: string;
  type: "milestone_membership" | "invite_points" | "leaderboard_points";
  title: string;
  description: string;
  points: number;
  valueText: string;
  createdAt: string;
}

export interface CaptainRewardsData {
  records: CaptainRewardRecord[];
  summary: {
    totalRewardPoints: number;
    inviteRewardPoints: number;
    leaderboardRewardPoints: number;
    firstFiveRewardUnlocked: boolean;
    firstFiveGiftedAt: string | null;
  };
}

export interface CaptainInviteDetail {
  inviteRecordId: number;
  inviteeUserId: number;
  inviteCode: string;
  inviteeLabel: string;
  isValid: boolean;
  invitedAt: string;
  validInviteSequence: number | null;
  rewardStage: "invalid" | "first_five_progress" | "first_five_reward" | "invite_points";
  rewardPoints: number | null;
  rewardStatusText: string;
  unlockedMembershipByThisInvite: boolean;
}

interface CaptainLeaderboardAggregate {
  captainId: bigint;
  validInviteCount: number;
  firstInvitedAt: Date;
}

interface CaptainPointRewardSnapshot {
  inviteRecordRewardMap: Map<string, number>;
  leaderboardRewardMap: Map<string, number>;
  totalRewardPoints: number;
  inviteRewardPoints: number;
  leaderboardRewardPoints: number;
}

@Injectable()
export class CaptainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  async info(userId: bigint): Promise<CaptainInfoData> {
    const [user, stats, firstFiveReward, currentPeriod] = await Promise.all([
      this.getUserOrThrow(userId),
      this.stats(userId),
      this.findFirstFiveRewardPurchase(userId),
      this.ensureLeaderboardPeriodsUpToDate()
    ]);

    const inviteCode = user.inviteCode?.trim() || this.generateInviteCode(user.userId);
    const inviteLink = this.buildInviteLink(inviteCode);

    return {
      level: user.captainLevel,
      inviteCode,
      inviteLink,
      inviteQrCodeUrl: this.buildInviteQrCodeUrl(inviteLink),
      rewardRules: {
        firstFiveTarget: FIRST_FIVE_TARGET,
        firstFiveRewardLabel: "首次 5 个有效邀请赠送 30 天会员时长",
        perValidInvitePointsAfterMilestone: POST_FIVE_INVITE_REWARD_POINTS,
        leaderboardCycleDays: LEADERBOARD_CYCLE_DAYS,
        leaderboardRewardPoolPoints: LEADERBOARD_REWARD_POOL,
        leaderboardRewardLadder: [...LEADERBOARD_REWARD_LADDER],
        pointsRequireMembership: true
      },
      firstFiveProgress: {
        qualifiedInvites: stats.firstFiveQualifiedInvites,
        target: FIRST_FIVE_TARGET,
        remaining: Math.max(0, FIRST_FIVE_TARGET - stats.firstFiveQualifiedInvites),
        unlocked: stats.firstFiveRewardUnlocked,
        giftedAt: firstFiveReward?.createdAt.toISOString() ?? null
      },
      currentPeriod: {
        periodId: Number(currentPeriod.periodId),
        startTime: currentPeriod.startTime.toISOString(),
        endTime: currentPeriod.endTime.toISOString(),
        rewardPoolPoints: this.toCurrency(currentPeriod.rewardPool),
        daysRemaining: this.getRemainingDays(currentPeriod.endTime),
        nextSettlementAt: currentPeriod.endTime.toISOString()
      }
    };
  }

  async ranking(userId?: bigint): Promise<CaptainRankingData> {
    const currentPeriod = await this.ensureLeaderboardPeriodsUpToDate();
    const aggregates = await this.computeLeaderboardAggregates(
      currentPeriod.startTime,
      currentPeriod.endTime
    );
    const userIds = aggregates.map((item) => item.captainId);
    const users =
      userIds.length > 0
        ? await this.prisma.user.findMany({
            where: { userId: { in: userIds } },
            select: { userId: true, captainLevel: true, nickname: true, maskedPhone: true }
          })
        : [];

    const userMap = new Map(users.map((item) => [item.userId.toString(), item]));
    const leaderboard = aggregates.slice(0, 10).map((item, index) => {
      const user = userMap.get(item.captainId.toString());
      return {
        rank: index + 1,
        captainId: Number(item.captainId),
        name: this.resolveCaptainDisplayName(user, item.captainId),
        level: user?.captainLevel ?? CaptainLevel.normal,
        validInviteCount: item.validInviteCount,
        rewardPoints: LEADERBOARD_REWARD_LADDER[index] ?? 0,
        isCurrentUser: userId ? item.captainId === userId : false
      };
    });

    const myAggregate = userId
      ? aggregates.find((item) => item.captainId.toString() === userId.toString()) ?? null
      : null;
    const myRank =
      userId && myAggregate
        ? aggregates.findIndex((item) => item.captainId.toString() === userId.toString()) + 1
        : null;

    return {
      period: {
        periodId: Number(currentPeriod.periodId),
        startTime: currentPeriod.startTime.toISOString(),
        endTime: currentPeriod.endTime.toISOString(),
        rewardPoolPoints: this.toCurrency(currentPeriod.rewardPool),
        cycleDays: LEADERBOARD_CYCLE_DAYS,
        daysRemaining: this.getRemainingDays(currentPeriod.endTime),
        nextSettlementAt: currentPeriod.endTime.toISOString()
      },
      myRank: {
        rank: myRank || null,
        validInviteCount: myAggregate?.validInviteCount ?? 0,
        rewardPoints: myRank && myRank <= LEADERBOARD_REWARD_LADDER.length ? LEADERBOARD_REWARD_LADDER[myRank - 1] : null
      },
      leaderboard
    };
  }

  async rewards(userId: bigint): Promise<CaptainRewardsData> {
    await this.ensureLeaderboardPeriodsUpToDate();

    const [pointSnapshot, firstFiveReward] = await Promise.all([
      this.buildPointRewardSnapshot(userId),
      this.findFirstFiveRewardPurchase(userId)
    ]);

    const records: CaptainRewardRecord[] = [];

    if (firstFiveReward) {
      records.push({
        rewardId: `gift-${Number(firstFiveReward.purchaseId)}`,
        type: "milestone_membership",
        title: "首 5 邀奖励已解锁",
        description: "已赠送 30 天会员时长，可用于解锁并使用 momo 赛博分身。",
        points: 0,
        valueText: "赠送 30 天会员时长",
        createdAt: firstFiveReward.createdAt.toISOString()
      });
    }

    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId },
      select: { doppelgangerId: true }
    });

    if (doppelganger) {
      const transactions = await this.prisma.pointTransaction.findMany({
        where: {
          doppelgangerId: doppelganger.doppelgangerId,
          type: PointTransType.INVITE_REWARD
        },
        orderBy: [{ transactionId: "desc" }],
        take: 200
      });

      for (const transaction of transactions) {
        const metadata = this.readObjectMetadata(transaction.metadata);
        const source = metadata?.source ?? "";
        if (source !== "captain_valid_invite_points" && source !== "captain_leaderboard_reward") {
          continue;
        }

        const amount = this.toCurrency(transaction.amount);
        if (amount <= 0) {
          continue;
        }

        const isLeaderboard = source === "captain_leaderboard_reward";
        const rankText = metadata?.rank ? `第 ${metadata.rank} 名` : "上榜奖励";
        const inviteCountText = metadata?.inviteCount ? ` · ${metadata.inviteCount} 个有效邀请` : "";

        records.push({
          rewardId: `points-${Number(transaction.transactionId)}`,
          type: isLeaderboard ? "leaderboard_points" : "invite_points",
          title: isLeaderboard ? "双周榜单结算奖励" : "有效邀请积分奖励",
          description: isLeaderboard
            ? `${rankText}${inviteCountText}，已发放排行榜积分奖励。`
            : "邀请新用户完成有效注册后发放，可在 momo 中消耗使用。",
          points: amount,
          valueText: `+${amount.toFixed(0)} 分身积分`,
          createdAt: transaction.createdAt.toISOString()
        });
      }
    }

    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      records,
      summary: {
        totalRewardPoints: pointSnapshot.totalRewardPoints,
        inviteRewardPoints: pointSnapshot.inviteRewardPoints,
        leaderboardRewardPoints: pointSnapshot.leaderboardRewardPoints,
        firstFiveRewardUnlocked: Boolean(firstFiveReward),
        firstFiveGiftedAt: firstFiveReward?.createdAt.toISOString() ?? null
      }
    };
  }

  async stats(userId: bigint): Promise<CaptainStatsData> {
    const currentPeriod = await this.ensureLeaderboardPeriodsUpToDate();
    const [totalInvites, validInvites, currentCycleInvites, currentRanking, pointSnapshot, firstFiveReward] =
      await Promise.all([
        this.prisma.inviteRecord.count({ where: { inviterId: userId } }),
        this.prisma.inviteRecord.count({ where: { inviterId: userId, isValid: true } }),
        this.prisma.inviteRecord.count({
          where: {
            inviterId: userId,
            isValid: true,
            createdAt: {
              gte: currentPeriod.startTime,
              lt: currentPeriod.endTime
            }
          }
        }),
        this.ranking(userId),
        this.buildPointRewardSnapshot(userId),
        this.findFirstFiveRewardPurchase(userId)
      ]);

    return {
      validInvites,
      totalInvites,
      currentCycleInvites,
      currentCycleRank: currentRanking.myRank.rank,
      totalRewardPoints: pointSnapshot.totalRewardPoints,
      firstFiveQualifiedInvites: Math.min(validInvites, FIRST_FIVE_TARGET),
      firstFiveTarget: FIRST_FIVE_TARGET,
      firstFiveRewardUnlocked: Boolean(firstFiveReward)
    };
  }

  async invites(userId: bigint): Promise<CaptainInviteDetail[]> {
    await this.ensureLeaderboardPeriodsUpToDate();

    const inviteRecords = await this.prisma.inviteRecord.findMany({
      where: { inviterId: userId },
      orderBy: [{ recordId: "desc" }],
      take: 100
    });

    if (inviteRecords.length === 0) {
      return [];
    }

    const inviteeIds = [...new Set(inviteRecords.map((record) => record.inviteeId.toString()))].map(
      (id) => BigInt(id)
    );
    const invitees = await this.prisma.user.findMany({
      where: { userId: { in: inviteeIds } },
      select: {
        userId: true,
        nickname: true,
        maskedPhone: true
      }
    });
    const inviteeMap = new Map(invitees.map((item) => [item.userId.toString(), item]));

    const validRecordsAsc = [...inviteRecords]
      .filter((item) => item.isValid)
      .sort((a, b) => {
        if (a.createdAt.getTime() !== b.createdAt.getTime()) {
          return a.createdAt.getTime() - b.createdAt.getTime();
        }
        if (a.recordId === b.recordId) {
          return 0;
        }
        return a.recordId > b.recordId ? 1 : -1;
      });
    const validSequenceMap = new Map(
      validRecordsAsc.map((item, index) => [item.recordId.toString(), index + 1])
    );

    const pointSnapshot = await this.buildPointRewardSnapshot(userId);
    const firstFiveReward = await this.findFirstFiveRewardPurchase(userId);
    const membershipTriggerRecordId = this.extractInviteRecordIdFromSourceAction(firstFiveReward?.sourceAction);

    return inviteRecords.map((record) => {
      const invitee = inviteeMap.get(record.inviteeId.toString());
      const inviteeLabel =
        invitee?.nickname?.trim() || invitee?.maskedPhone?.trim() || `用户 #${record.inviteeId.toString()}`;
      const validInviteSequence = record.isValid
        ? validSequenceMap.get(record.recordId.toString()) ?? null
        : null;
      const invitePoints = pointSnapshot.inviteRecordRewardMap.get(record.recordId.toString()) ?? null;
      const unlockedMembershipByThisInvite =
        membershipTriggerRecordId !== null && membershipTriggerRecordId === Number(record.recordId);

      return {
        inviteRecordId: Number(record.recordId),
        inviteeUserId: Number(record.inviteeId),
        inviteCode: record.inviteCode,
        inviteeLabel,
        isValid: record.isValid,
        invitedAt: record.createdAt.toISOString(),
        validInviteSequence,
        rewardStage: this.resolveInviteRewardStage({
          isValid: record.isValid,
          validInviteSequence,
          invitePoints,
          unlockedMembershipByThisInvite
        }),
        rewardPoints: invitePoints,
        rewardStatusText: this.resolveInviteRewardStatusText({
          isValid: record.isValid,
          validInviteSequence,
          invitePoints,
          unlockedMembershipByThisInvite
        }),
        unlockedMembershipByThisInvite
      };
    });
  }

  async handleValidInviteCreated(input: {
    inviterId: bigint;
    inviteRecordId: bigint;
  }): Promise<void> {
    const result = await this.prisma.$transaction(async (tx) => {
      const inviteRecords = await tx.inviteRecord.findMany({
        where: {
          inviterId: input.inviterId,
          isValid: true
        },
        orderBy: [{ createdAt: "asc" }, { recordId: "asc" }],
        select: { recordId: true }
      });

      const currentIndex = inviteRecords.findIndex(
        (item) => item.recordId.toString() === input.inviteRecordId.toString()
      );
      if (currentIndex < 0) {
        return null;
      }

      const validInviteCount = inviteRecords.length;
      const validInviteSequence = currentIndex + 1;

      let firstFiveGranted = false;
      let rewardMemberLevel: MemberLevel | null = null;
      let rewardMemberExpire: Date | null = null;

      const firstFiveReward = await this.findFirstFiveRewardPurchase(input.inviterId, tx);
      if (!firstFiveReward && validInviteCount >= FIRST_FIVE_TARGET) {
        const triggerRecordId = inviteRecords[FIRST_FIVE_TARGET - 1]?.recordId ?? input.inviteRecordId;
        const membershipReward = await this.grantFirstFiveMembershipReward(
          input.inviterId,
          triggerRecordId,
          tx
        );
        firstFiveGranted = membershipReward.granted;
        rewardMemberLevel = membershipReward.memberLevel;
        rewardMemberExpire = membershipReward.memberExpire;
      }

      let invitePointsGranted = 0;
      if (validInviteSequence > FIRST_FIVE_TARGET) {
        invitePointsGranted = await this.grantPostMilestoneInvitePoints(
          input.inviterId,
          input.inviteRecordId,
          tx
        );
      }

      return {
        firstFiveGranted,
        rewardMemberLevel,
        rewardMemberExpire,
        invitePointsGranted
      };
    });

    if (!result) {
      return;
    }

    if (result.firstFiveGranted && result.rewardMemberLevel && result.rewardMemberExpire) {
      await this.doppelgangerService.activateWithBonus(input.inviterId, 0);
      await this.doppelgangerService.getPointAccountSummary(input.inviterId, {
        memberLevel: result.rewardMemberLevel,
        memberExpire: result.rewardMemberExpire
      });
    }
  }

  async withdraw(): Promise<never> {
    throw new BadRequestException("当前邀请计划已改为分身积分激励，不再支持现金提现");
  }

  private async ensureLeaderboardPeriodsUpToDate(now: Date = new Date()) {
    const currentRange = this.getLeaderboardPeriodRange(now);
    const currentPeriod = await this.ensureActivityPeriod(currentRange.startTime, currentRange.endTime);

    const duePeriods = await this.prisma.activityPeriod.findMany({
      where: {
        isProcessed: false,
        endTime: { lte: now }
      },
      orderBy: [{ startTime: "asc" }]
    });

    for (const period of duePeriods) {
      await this.settleClosedPeriod(period.periodId);
    }

    return currentPeriod;
  }

  private async settleClosedPeriod(periodId: bigint): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const period = await tx.activityPeriod.findUnique({
        where: { periodId }
      });
      if (!period || period.isProcessed) {
        return;
      }

      const leaderboard = await this.computeLeaderboardAggregates(period.startTime, period.endTime, tx);

      for (const [index, item] of leaderboard.slice(0, LEADERBOARD_REWARD_LADDER.length).entries()) {
        const rewardPoints = LEADERBOARD_REWARD_LADDER[index] ?? 0;
        if (rewardPoints <= 0 || item.validInviteCount <= 0) {
          continue;
        }

        await this.grantLeaderboardReward({
          captainId: item.captainId,
          periodId: period.periodId,
          rank: index + 1,
          validInviteCount: item.validInviteCount,
          rewardPoints,
          client: tx
        });
      }

      await tx.activityPeriod.update({
        where: { periodId: period.periodId },
        data: { isProcessed: true }
      });
    });
  }

  private async ensureActivityPeriod(startTime: Date, endTime: Date, client?: CaptainClient) {
    const prisma = client ?? this.prisma;
    const existing = await prisma.activityPeriod.findFirst({
      where: {
        startTime,
        endTime
      }
    });

    if (existing) {
      return existing;
    }

    return prisma.activityPeriod.create({
      data: {
        startTime,
        endTime,
        rewardPool: new Prisma.Decimal(LEADERBOARD_REWARD_POOL)
      }
    });
  }

  private getLeaderboardPeriodRange(date: Date) {
    const cycleMs = LEADERBOARD_CYCLE_DAYS * DAY_MS;
    const offset = Math.max(0, date.getTime() - LEADERBOARD_EPOCH.getTime());
    const cycleIndex = Math.floor(offset / cycleMs);
    const startTime = new Date(LEADERBOARD_EPOCH.getTime() + cycleIndex * cycleMs);
    const endTime = new Date(startTime.getTime() + cycleMs);
    return { startTime, endTime };
  }

  private async computeLeaderboardAggregates(
    startTime: Date,
    endTime: Date,
    client?: CaptainClient
  ): Promise<CaptainLeaderboardAggregate[]> {
    const prisma = client ?? this.prisma;
    const records = await prisma.inviteRecord.findMany({
      where: {
        isValid: true,
        createdAt: {
          gte: startTime,
          lt: endTime
        }
      },
      select: {
        inviterId: true,
        createdAt: true
      }
    });

    const aggregateMap = new Map<string, CaptainLeaderboardAggregate>();
    for (const record of records) {
      const key = record.inviterId.toString();
      const current = aggregateMap.get(key);
      if (!current) {
        aggregateMap.set(key, {
          captainId: record.inviterId,
          validInviteCount: 1,
          firstInvitedAt: record.createdAt
        });
        continue;
      }

      current.validInviteCount += 1;
      if (record.createdAt.getTime() < current.firstInvitedAt.getTime()) {
        current.firstInvitedAt = record.createdAt;
      }
    }

    return [...aggregateMap.values()].sort((a, b) => {
      if (b.validInviteCount !== a.validInviteCount) {
        return b.validInviteCount - a.validInviteCount;
      }
      if (a.firstInvitedAt.getTime() !== b.firstInvitedAt.getTime()) {
        return a.firstInvitedAt.getTime() - b.firstInvitedAt.getTime();
      }
      if (a.captainId === b.captainId) {
        return 0;
      }
      return a.captainId > b.captainId ? 1 : -1;
    });
  }

  private async grantLeaderboardReward(input: {
    captainId: bigint;
    periodId: bigint;
    rank: number;
    validInviteCount: number;
    rewardPoints: number;
    client: CaptainClient;
  }): Promise<void> {
    const doppelganger = await this.ensureCaptainDoppelganger(input.captainId, input.client);
    const existingReward = await input.client.pointTransaction.findFirst({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.INVITE_REWARD,
        metadata: {
          path: "$.periodId",
          equals: input.periodId.toString()
        }
      }
    });

    if (existingReward) {
      return;
    }

    await this.creditCaptainPoints(input.captainId, input.rewardPoints, {
      source: "captain_leaderboard_reward",
      periodId: input.periodId.toString(),
      rank: input.rank.toString(),
      inviteCount: input.validInviteCount.toString(),
      reason: "双周邀请榜结算奖励"
    }, input.client);
  }

  private async grantPostMilestoneInvitePoints(
    inviterId: bigint,
    inviteRecordId: bigint,
    client: CaptainClient
  ): Promise<number> {
    const doppelganger = await this.ensureCaptainDoppelganger(inviterId, client);
    const existingReward = await client.pointTransaction.findFirst({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.INVITE_REWARD,
        metadata: {
          path: "$.inviteRecordId",
          equals: inviteRecordId.toString()
        }
      }
    });

    if (existingReward) {
      return 0;
    }

    await this.creditCaptainPoints(inviterId, POST_FIVE_INVITE_REWARD_POINTS, {
      source: "captain_valid_invite_points",
      inviteRecordId: inviteRecordId.toString(),
      reason: "有效邀请奖励"
    }, client);

    return POST_FIVE_INVITE_REWARD_POINTS;
  }

  private async grantFirstFiveMembershipReward(
    inviterId: bigint,
    triggerInviteRecordId: bigint,
    client: CaptainClient
  ): Promise<{ granted: boolean; memberLevel: MemberLevel | null; memberExpire: Date | null }> {
    const existing = await this.findFirstFiveRewardPurchase(inviterId, client);
    if (existing) {
      return { granted: false, memberLevel: null, memberExpire: null };
    }

    const inviter = await client.user.findUnique({
      where: { userId: inviterId },
      select: {
        memberLevel: true,
        memberExpire: true
      }
    });
    if (!inviter) {
      return { granted: false, memberLevel: null, memberExpire: null };
    }

    const now = new Date();
    const baseExpire =
      inviter.memberExpire && inviter.memberExpire.getTime() > now.getTime()
        ? new Date(inviter.memberExpire)
        : new Date(now);
    const nextExpire = new Date(baseExpire);
    nextExpire.setMonth(nextExpire.getMonth() + 1);

    const nextLevel =
      inviter.memberLevel === MemberLevel.free ||
      !inviter.memberExpire ||
      inviter.memberExpire.getTime() <= now.getTime()
        ? MemberLevel.monthly
        : inviter.memberLevel;

    await client.user.update({
      where: { userId: inviterId },
      data: {
        memberLevel: nextLevel,
        memberExpire: nextExpire
      }
    });

    await client.userPurchase.create({
      data: {
        userId: inviterId,
        itemType: "captain_invite_monthly_bonus",
        amount: 0,
        status: "completed",
        sourceModule: "captain",
        sourceAction: `first5|inviteRecord:${triggerInviteRecordId.toString()}`
      }
    });

    return {
      granted: true,
      memberLevel: nextLevel,
      memberExpire: nextExpire
    };
  }

  private async findFirstFiveRewardPurchase(userId: bigint, client?: CaptainClient) {
    const prisma = client ?? this.prisma;
    return prisma.userPurchase.findFirst({
      where: {
        userId,
        itemType: "captain_invite_monthly_bonus",
        status: "completed"
      },
      orderBy: [{ purchaseId: "desc" }]
    });
  }

  private async buildPointRewardSnapshot(userId: bigint): Promise<CaptainPointRewardSnapshot> {
    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId },
      select: { doppelgangerId: true }
    });

    if (!doppelganger) {
      return {
        inviteRecordRewardMap: new Map(),
        leaderboardRewardMap: new Map(),
        totalRewardPoints: 0,
        inviteRewardPoints: 0,
        leaderboardRewardPoints: 0
      };
    }

    const transactions = await this.prisma.pointTransaction.findMany({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.INVITE_REWARD
      },
      orderBy: [{ transactionId: "desc" }],
      take: 500
    });

    const inviteRecordRewardMap = new Map<string, number>();
    const leaderboardRewardMap = new Map<string, number>();
    let totalRewardPoints = 0;
    let inviteRewardPoints = 0;
    let leaderboardRewardPoints = 0;

    for (const transaction of transactions) {
      const metadata = this.readObjectMetadata(transaction.metadata);
      const source = metadata?.source ?? "";
      const amount = this.toCurrency(transaction.amount);
      if (amount <= 0) {
        continue;
      }

      if (source === "captain_valid_invite_points") {
        totalRewardPoints += amount;
        inviteRewardPoints += amount;
        if (metadata?.inviteRecordId) {
          inviteRecordRewardMap.set(metadata.inviteRecordId, amount);
        }
      }

      if (source === "captain_leaderboard_reward") {
        totalRewardPoints += amount;
        leaderboardRewardPoints += amount;
        if (metadata?.periodId) {
          leaderboardRewardMap.set(metadata.periodId, amount);
        }
      }
    }

    return {
      inviteRecordRewardMap,
      leaderboardRewardMap,
      totalRewardPoints: this.toCurrency(totalRewardPoints),
      inviteRewardPoints: this.toCurrency(inviteRewardPoints),
      leaderboardRewardPoints: this.toCurrency(leaderboardRewardPoints)
    };
  }

  private async creditCaptainPoints(
    userId: bigint,
    amount: number,
    metadata: Record<string, string>,
    client: CaptainClient
  ) {
    const doppelganger = await this.ensureCaptainDoppelganger(userId, client);
    await client.pointTransaction.create({
      data: {
        doppelgangerId: doppelganger.doppelgangerId,
        amount: new Prisma.Decimal(amount),
        type: PointTransType.INVITE_REWARD,
        metadata
      }
    });

    await client.cyberDoppelganger.update({
      where: { doppelgangerId: doppelganger.doppelgangerId },
      data: {
        balance: { increment: new Prisma.Decimal(amount) }
      }
    });
  }

  private async ensureCaptainDoppelganger(userId: bigint, client: CaptainClient) {
    return client.cyberDoppelganger.upsert({
      where: { userId },
      create: {
        userId,
        balance: 0,
        status: DoppelgangerStatus.active
      },
      update: {
        status: DoppelgangerStatus.active
      }
    });
  }

  private extractInviteRecordIdFromSourceAction(sourceAction?: string | null): number | null {
    if (!sourceAction) {
      return null;
    }
    const match = sourceAction.match(/inviteRecord:(\d+)/);
    if (!match) {
      return null;
    }
    return Number(match[1]);
  }

  private resolveInviteRewardStage(input: {
    isValid: boolean;
    validInviteSequence: number | null;
    invitePoints: number | null;
    unlockedMembershipByThisInvite: boolean;
  }): CaptainInviteDetail["rewardStage"] {
    if (!input.isValid) {
      return "invalid";
    }
    if (input.unlockedMembershipByThisInvite) {
      return "first_five_reward";
    }
    if (input.validInviteSequence && input.validInviteSequence <= FIRST_FIVE_TARGET) {
      return "first_five_progress";
    }
    return "invite_points";
  }

  private resolveInviteRewardStatusText(input: {
    isValid: boolean;
    validInviteSequence: number | null;
    invitePoints: number | null;
    unlockedMembershipByThisInvite: boolean;
  }): string {
    if (!input.isValid) {
      return "邀请风控未通过，不计入奖励与榜单。";
    }
    if (input.unlockedMembershipByThisInvite) {
      return "已达成首 5 个有效邀请，30 天会员时长已发放。";
    }
    if (input.validInviteSequence && input.validInviteSequence <= FIRST_FIVE_TARGET) {
      return `计入首 5 邀进度（${input.validInviteSequence}/${FIRST_FIVE_TARGET}）。`;
    }
    if (input.invitePoints !== null && input.invitePoints > 0) {
      return `已奖励 ${input.invitePoints} 分身积分，可在 momo 指令中消耗使用。`;
    }
    return "有效邀请已记录，等待积分到账。";
  }

  private resolveCaptainDisplayName(
    user:
      | {
          captainLevel: CaptainLevel;
          nickname: string | null;
          maskedPhone: string | null;
        }
      | undefined,
    captainId: bigint
  ): string {
    return user?.nickname?.trim() || user?.maskedPhone?.trim() || `captain_${captainId.toString().slice(-4)}`;
  }

  private getRemainingDays(endTime: Date): number {
    return Math.max(0, Math.ceil((endTime.getTime() - Date.now()) / DAY_MS));
  }

  private async getUserOrThrow(userId: bigint): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { userId } });
    if (!user) {
      throw new BadRequestException("user not found");
    }
    return user;
  }

  private generateInviteCode(userId: bigint): string {
    const base36 = userId
      .toString(36)
      .toUpperCase()
      .replace(/[^0-9A-Z]/g, "");
    return base36.padStart(6, "0").slice(-6);
  }

  private buildInviteLink(inviteCode: string): string {
    const webBase = (
      process.env.WEB_BASE_URL ??
      process.env.NEXT_PUBLIC_WEB_BASE_URL ??
      "http://localhost:3000"
    ).replace(/\/$/, "");
    return `${webBase}/register?inviteCode=${encodeURIComponent(inviteCode)}`;
  }

  private buildInviteQrCodeUrl(inviteLink: string): string {
    return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(inviteLink)}`;
  }

  private readObjectMetadata(
    metadata: Prisma.JsonValue | null | undefined
  ): Record<string, string> | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private toCurrency(value: number | Prisma.Decimal): number {
    return Number(Number(value).toFixed(2));
  }
}
