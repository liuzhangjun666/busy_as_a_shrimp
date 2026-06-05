import { Controller, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { QueryPublicStartupPostsDto } from "./dto/startup-post.dto";
import { StartupPostService } from "./startup-post.service";

interface AuthUser {
  userId: string | bigint;
}

@Controller()
export class SopTemplateController {
  constructor(private readonly startupPostService: StartupPostService) {}

  @Get("public/sop-templates")
  async list(@Query() query: QueryPublicStartupPostsDto) {
    return ok(await this.startupPostService.queryPublicSopTemplates(query));
  }

  @Get("public/sop-templates/:id")
  async preview(@Param("id") id: string) {
    return ok(await this.startupPostService.getPublicSopTemplatePreview(id));
  }

  @Get("sop-templates/:id")
  @UseGuards(JwtAuthGuard)
  async detail(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return ok(await this.startupPostService.getMemberSopTemplateDetail(BigInt(user.userId), id));
  }
}
