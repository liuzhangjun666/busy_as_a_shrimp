import { BadRequestException, Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CampusUnlockService } from "./campus-unlock.service";

interface ICurrentUser {
  userId: string | bigint;
}

@Controller("campus/unlock")
@UseGuards(JwtAuthGuard)
export class CampusUnlockController {
  constructor(private readonly campusUnlockService: CampusUnlockService) {}

  @Get("status")
  async status(@CurrentUser() user: ICurrentUser) {
    return ok(await this.campusUnlockService.getUnlockStatus(BigInt(user.userId)));
  }

  @Post("checkout")
  async checkout(
    @CurrentUser() user: ICurrentUser,
    @Body() payload: { sourceModule?: "campus"; sourceAction?: string } = {}
  ) {
    if (payload.sourceModule && payload.sourceModule !== "campus") {
      throw new BadRequestException("sourceModule must be campus");
    }

    return ok(await this.campusUnlockService.checkout(BigInt(user.userId), payload));
  }
}
