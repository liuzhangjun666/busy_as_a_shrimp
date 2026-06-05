import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { PublicController } from "./public.controller";
import { PublicService } from "./public.service";
import { AiBriefIngestService } from "./ai-brief-ingest.service";
import { AiBriefScheduler } from "./ai-brief.scheduler";
import { SoloSignalIngestService } from "./solo-signal-ingest.service";
import { SoloSignalScheduler } from "./solo-signal.scheduler";

@Module({
  controllers: [PublicController],
  providers: [
    PublicService,
    AiBriefIngestService,
    AiBriefScheduler,
    SoloSignalIngestService,
    SoloSignalScheduler,
    PrismaService
  ]
})
export class PublicModule {}
