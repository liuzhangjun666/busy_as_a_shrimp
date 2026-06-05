import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ComplianceService } from "./compliance.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { ImageCheckDto } from "./dto/compliance.dto";

@Controller("compliance")
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get("rules")
  rules() {
    return ok(this.complianceService.rules());
  }

  @Post("image-check")
  @UseGuards(JwtAuthGuard)
  async imageCheck(@Body() payload: ImageCheckDto) {
    const result = await this.complianceService.inspectImage(payload.imageUrl, payload.scene);
    return ok(
      {
        passed: true,
        engine: result.engine,
        service: result.service
      },
      "图片审核通过"
    );
  }
}
