import { Module } from "@nestjs/common";
import { AutoReviewService } from "./auto-review.service";
import { ComplianceModule } from "./compliance.module";
import { ResourceModule } from "../resource/resource.module";
import { TaskModule } from "../task/task.module";
import { PrismaService } from "../../common/prisma.service";

@Module({
  imports: [ComplianceModule, ResourceModule, TaskModule],
  providers: [AutoReviewService, PrismaService],
  exports: [AutoReviewService]
})
export class AutoReviewModule {}
