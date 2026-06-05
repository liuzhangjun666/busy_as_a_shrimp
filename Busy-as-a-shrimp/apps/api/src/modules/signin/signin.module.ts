import { Module } from "@nestjs/common";
import { SignInController } from "./signin.controller";
import { SignInService } from "./signin.service";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [SignInController],
  providers: [SignInService, PrismaService]
})
export class SignInModule {}
