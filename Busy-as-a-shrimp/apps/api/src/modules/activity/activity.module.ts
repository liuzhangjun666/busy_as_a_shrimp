import { Module } from "@nestjs/common";
import { ScheduleModule } from "@nestjs/schedule";
import { ActivityService } from "./activity.service";
import { ActivityController } from "./activity.controller";
import { RankingService } from "./ranking.service";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";
import { ActivityScheduler } from "./activity.scheduler";

@Module({
  imports: [ScheduleModule.forRoot(), DoppelgangerModule],
  controllers: [ActivityController],
  providers: [ActivityService, RankingService, PrismaService, ActivityScheduler],
  exports: [ActivityService]
})
export class ActivityModule {}
