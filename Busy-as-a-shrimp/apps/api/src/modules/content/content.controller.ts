import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { ContentService } from "./content.service";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CreateContentDto, TrackContentStatsDto } from "./dto/content.dto";

interface AuthUser {
  userId: bigint | string;
}

@Controller("content")
@UseGuards(JwtAuthGuard)
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  @Post("generate")
  async generate(@CurrentUser() user: AuthUser, @Body() payload: CreateContentDto) {
    const userId = BigInt(user.userId);
    return ok(await this.contentService.create(userId, payload), "内容已生成，等待确认");
  }

  @Get("list")
  async list(@CurrentUser() user: AuthUser) {
    const userId = BigInt(user.userId);
    return ok(await this.contentService.list(userId));
  }

  @Post(":id/publish")
  async publish(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    const userId = BigInt(user.userId);
    return ok(await this.contentService.publish(userId, Number(id)), "内容已发布");
  }

  @Post(":id/stats")
  async trackStats(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body() payload: TrackContentStatsDto
  ) {
    const userId = BigInt(user.userId);
    return ok(
      await this.contentService.trackStats(userId, Number(id), payload.event),
      "统计已回流"
    );
  }
}
