import { Module, Global } from "@nestjs/common";
import { ComplianceController } from "./compliance.controller";
import { ComplianceService } from "./compliance.service";
import { LocalComplianceProvider } from "./providers/local.provider";
import { AliyunComplianceProvider } from "./providers/aliyun.provider";
import { PrismaService } from "../../common/prisma.service";

@Global()
@Module({
  controllers: [ComplianceController],
  providers: [ComplianceService, LocalComplianceProvider, AliyunComplianceProvider, PrismaService],
  exports: [ComplianceService]
})
export class ComplianceModule {}
