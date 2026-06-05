import { Injectable, Logger } from "@nestjs/common";
import { PointTransType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { RankingService } from "./ranking.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";

@Injectable()
export class ActivityService {
  private readonly logger = new Logger(ActivityService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly rankingService: RankingService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  async getCurrentActivity() {
    const now = new Date();
    let activity = await this.prisma.activityPeriod.findFirst({
      where: {
        startTime: { lte: now },
        endTime: { gte: now }
      },
      orderBy: { startTime: "desc" }
    });

    if (!activity) {
      // Auto create the first/next one if missing (seed logic)
      activity = await this.startNewPeriod(now);
    }

    return activity;
  }

  async getRanking() {
    const activity = await this.getCurrentActivity();
    return this.rankingService.getTopInviters(activity.startTime, activity.endTime);
  }

  async processEndOfPeriod(periodId: bigint) {
    const period = await this.prisma.activityPeriod.findUnique({
      where: { periodId }
    });

    if (!period || period.isProcessed) return;

    this.logger.log(`Processing end of period ${periodId}`);

    const top30 = await this.rankingService.getTopInviters(period.startTime, period.endTime, 30);

    for (const item of top30) {
      const reward = this.calculateReward(item.rank);
      if (reward > 0) {
        await this.doppelgangerService.createOrUpdateDoppelganger(BigInt(item.userId), 0);
        await this.doppelgangerService.addPoints(
          BigInt(item.userId),
          reward,
          PointTransType.INVITE_REWARD,
          { periodId: Number(periodId), rank: item.rank }
        );
      }
    }

    await this.prisma.activityPeriod.update({
      where: { periodId },
      data: { isProcessed: true }
    });

    // Start next period
    await this.startNewPeriod(period.endTime);
  }

  private calculateReward(rank: number): number {
    if (rank === 1) return 1000;
    if (rank === 2) return 600;
    if (rank === 3) return 400;
    if (rank >= 4 && rank <= 10) return 200;
    if (rank >= 11 && rank <= 30) return 80;
    return 0;
  }

  private async startNewPeriod(startTime: Date) {
    const endTime = new Date(startTime);
    endTime.setDate(endTime.getDate() + 14); // 2 weeks

    return this.prisma.activityPeriod.create({
      data: {
        startTime,
        endTime,
        rewardPool: new Prisma.Decimal(5000),
        isProcessed: false
      }
    });
  }
}
