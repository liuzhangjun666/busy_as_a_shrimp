import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ActivityService } from "./activity.service";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class ActivityScheduler {
  private readonly logger = new Logger(ActivityScheduler.name);

  constructor(
    private readonly activityService: ActivityService,
    private readonly prisma: PrismaService
  ) {}

  // Check every hour if a period has ended
  @Cron(CronExpression.EVERY_HOUR)
  async handleActivityTurnover() {
    this.logger.debug("Checking for expired activity periods...");
    const now = new Date();

    const expiredPeriods = await this.prisma.activityPeriod.findMany({
      where: {
        endTime: { lte: now },
        isProcessed: false
      }
    });

    for (const period of expiredPeriods) {
      this.logger.log(`Period ${period.periodId} has ended. Processing rewards...`);
      await this.activityService.processEndOfPeriod(period.periodId);
    }
  }

  // Optional: A more specific cron if we want it precisely every 2 weeks at a specific time
  // For simplicity, the check above handles it based on the database endTime.
}
