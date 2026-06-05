import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";
import { CaptainController } from "./captain.controller";
import { CaptainService } from "./captain.service";

@Module({
  imports: [DoppelgangerModule],
  controllers: [CaptainController],
  providers: [CaptainService, PrismaService],
  exports: [CaptainService]
})
export class CaptainModule {}
