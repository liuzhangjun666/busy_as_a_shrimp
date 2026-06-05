import { Body, Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { MatchListQueryDto, RunMatchDto, RunResourcePoolMatchDto } from "./dto/match.dto";
import { MatchService } from "./match.service";

interface AuthUser {
  userId: bigint | string;
  role: string;
}

@Controller("match")
@UseGuards(JwtAuthGuard)
export class MatchController {
  constructor(private readonly matchService: MatchService) {}

  @Post("run")
  async run(@CurrentUser() user: AuthUser, @Body() payload: RunMatchDto) {
    return ok(await this.matchService.run(BigInt(user.userId), payload), "match task queued");
  }

  @Post("run-pool")
  async runPool(@CurrentUser() user: AuthUser, @Body() payload: RunResourcePoolMatchDto = {}) {
    return ok(
      await this.matchService.runResourcePool(BigInt(user.userId), payload),
      "resource pool match completed"
    );
  }

  @Get("list")
  async list(@CurrentUser() user: AuthUser, @Query() query: MatchListQueryDto) {
    return ok(await this.matchService.list(BigInt(user.userId), query));
  }

  @Post(":id/confirm")
  async confirm(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return ok(await this.matchService.confirm(BigInt(user.userId), Number(id)), "match confirmed");
  }

  @Post(":id/reject")
  async reject(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return ok(await this.matchService.reject(BigInt(user.userId), Number(id)), "match invalidated");
  }
}
