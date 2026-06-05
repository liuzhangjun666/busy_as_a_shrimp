import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { CampusUnlockController } from "./campus-unlock.controller";
import { CampusUnlockService } from "./campus-unlock.service";

@Module({
  controllers: [CampusUnlockController],
  providers: [CampusUnlockService, PrismaService],
  exports: [CampusUnlockService]
})
export class CampusUnlockModule {}
