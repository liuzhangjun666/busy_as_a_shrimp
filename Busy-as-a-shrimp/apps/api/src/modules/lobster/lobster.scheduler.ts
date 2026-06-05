import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { LobsterService } from "./lobster.service";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class LobsterScheduler {
  private readonly logger = new Logger(LobsterScheduler.name);
  private static readonly CAMPUS_SOURCE_TYPE = "campus_recruitment";
  private static readonly CAMPUS_STALENESS_WINDOW_HOURS = 24;
  private static readonly CAMPUS_UPDATE_ALERT_MARKER = "[campus_data_update_alert]";

  constructor(
    private readonly lobsterService: LobsterService,
    private readonly prisma: PrismaService
  ) {}

  @Cron("0 6 * * *")
  async handleDailyScan() {
    this.logger.log("[LobsterScheduler] start daily doppelganger scan dispatch");

    const activeLobsters = await this.prisma.lobsterStatus.findMany({
      where: {
        status: "active",
        OR: [{ lobsterExpiresAt: null }, { lobsterExpiresAt: { gt: new Date() } }]
      },
      include: {
        user: { select: { city: true } }
      }
    });

    if (activeLobsters.length === 0) {
      this.logger.log("[LobsterScheduler] no active doppelganger found for today");
      return;
    }

    const cityMap = new Map<string, typeof activeLobsters>();
    for (const lobster of activeLobsters) {
      const city = lobster.user.city ?? "unknown";
      if (!cityMap.has(city)) {
        cityMap.set(city, []);
      }
      cityMap.get(city)!.push(lobster);
    }

    const batchSize = 50;
    for (const [city, lobsters] of cityMap.entries()) {
      this.logger.log(`[LobsterScheduler] processing city=${city}, userCount=${lobsters.length}`);

      for (let i = 0; i < lobsters.length; i += batchSize) {
        const batch = lobsters.slice(i, i + batchSize);
        await Promise.all(
          batch.map((lobster) =>
            this.lobsterService
              .triggerTask(lobster.userId, {})
              .catch((err) =>
                this.logger.error(
                  `[LobsterScheduler] trigger failed for userId=${lobster.userId.toString()}: ${err.message}`
                )
              )
          )
        );
      }
    }

    this.logger.log("[LobsterScheduler] daily doppelganger scan dispatch completed");
  }

  @Cron("0 * * * *")
  async handleReviewExpiry() {
    this.logger.log("[LobsterScheduler] start review task expiry check");
    const count = await this.lobsterService.handleReviewExpiry();
    if (count > 0) {
      this.logger.log(`[LobsterScheduler] expired review tasks cleaned: ${count}`);
    }
  }

  @Cron("0 6 * * *", { timeZone: "Asia/Shanghai" })
  async handleCampusDataFreshnessCheck() {
    const now = new Date();
    const lookbackStart = new Date(
      now.getTime() - LobsterScheduler.CAMPUS_STALENESS_WINDOW_HOURS * 60 * 60 * 1000
    );

    const recentCampusRecords = await this.prisma.opportunity.count({
      where: {
        sourceType: LobsterScheduler.CAMPUS_SOURCE_TYPE,
        createdAt: {
          gte: lookbackStart
        }
      }
    });

    if (recentCampusRecords > 0) {
      this.logger.log(
        `[LobsterScheduler] campus data freshness check passed: ${recentCampusRecords} new rows in last ${LobsterScheduler.CAMPUS_STALENESS_WINDOW_HOURS}h`
      );
      return;
    }

    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);

    const existingAlert = await this.prisma.announcement.findFirst({
      where: {
        createdAt: { gte: startOfToday },
        content: { contains: LobsterScheduler.CAMPUS_UPDATE_ALERT_MARKER }
      },
      select: { noticeId: true }
    });

    if (existingAlert) {
      this.logger.log(
        "[LobsterScheduler] campus stale alert already created today, skip duplicate"
      );
      return;
    }

    const alertContent =
      `${LobsterScheduler.CAMPUS_UPDATE_ALERT_MARKER} ` +
      "\u3010\u6821\u62db\u4fe1\u606f\u66f4\u65b0\u63d0\u9192\u3011\u622a\u81f3\u4eca\u65e506:00\uff08Asia/Shanghai\uff09\uff0c\u8fc7\u53bb24\u5c0f\u65f6\u672a\u68c0\u6d4b\u5230\u201c\u5927\u5b66\u751f\u5c31\u4e1a/\u6821\u62db\u4fe1\u606f\u201d\u65b0\u6570\u636e\u3002\u8bf7\u540e\u53f0\u7ba1\u7406\u5458\u624b\u52a8\u66f4\u65b0\u5e76\u4e0a\u4f20\u6570\u636e\u3002";

    await this.prisma.announcement.create({
      data: {
        content: alertContent,
        publisher: "system"
      }
    });

    this.logger.warn("[LobsterScheduler] created campus stale-data alert announcement");
  }
}
