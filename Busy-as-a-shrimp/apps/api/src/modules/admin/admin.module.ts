import { Module } from "@nestjs/common";
import { AdminController } from "./admin.controller";
import { AdminService } from "./admin.service";
import { AdminAuthService } from "./auth/admin-auth.service";
import { AdminAuthGuard } from "./auth/admin-auth.guard";
import { PrismaService } from "../../common/prisma.service";

import { ResourceModule } from "../resource/resource.module";
import { TaskModule } from "../task/task.module";
import { LobsterModule } from "../lobster/lobster.module";
import { CampusUnlockModule } from "../campus-unlock/campus-unlock.module";

@Module({
  imports: [ResourceModule, TaskModule, LobsterModule, CampusUnlockModule],
  controllers: [AdminController],
  providers: [AdminService, AdminAuthService, AdminAuthGuard, PrismaService]
})
export class AdminModule {}
