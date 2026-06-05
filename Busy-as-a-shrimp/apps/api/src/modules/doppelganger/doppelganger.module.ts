import { Module } from "@nestjs/common";
import { DoppelgangerService } from "./doppelganger.service";
import { DoppelgangerController } from "./doppelganger.controller";
import { PrismaService } from "../../common/prisma.service";

@Module({
  controllers: [DoppelgangerController],
  providers: [DoppelgangerService, PrismaService],
  exports: [DoppelgangerService]
})
export class DoppelgangerModule {}
