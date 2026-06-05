import { Module } from "@nestjs/common";
import { TaskService } from "./task.service";
import { TaskController } from "./task.controller";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [TaskController],
  providers: [TaskService, PrismaService],
  exports: [TaskService]
})
export class TaskModule {}
