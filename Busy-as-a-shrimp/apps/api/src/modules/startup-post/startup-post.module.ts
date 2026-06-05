import { Module } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { AdminAuthGuard } from "../admin/auth/admin-auth.guard";
import { AdminAuthService } from "../admin/auth/admin-auth.service";
import { AdminStartupPostController } from "./admin-startup-post.controller";
import { PublicStartupPostController } from "./public-startup-post.controller";
import { SopTemplateController } from "./sop-template.controller";
import { StartupPostService } from "./startup-post.service";

@Module({
  controllers: [AdminStartupPostController, PublicStartupPostController, SopTemplateController],
  providers: [StartupPostService, PrismaService, AdminAuthService, AdminAuthGuard]
})
export class StartupPostModule {}
