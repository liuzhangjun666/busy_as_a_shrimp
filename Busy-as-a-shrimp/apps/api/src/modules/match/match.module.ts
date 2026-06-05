import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { MessageModule } from "../message/message.module";
import { MatchController } from "./match.controller";
import { MatchService } from "./match.service";

@Module({
  imports: [MessageModule],
  controllers: [MatchController],
  providers: [MatchService, PrismaService]
})
export class MatchModule {}
