import { Controller, Post, Get, UseGuards } from "@nestjs/common";
import { SignInService } from "./signin.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { User } from "@prisma/client";
import { ok } from "../../common/api-response";

@Controller("signin")
@UseGuards(JwtAuthGuard)
export class SignInController {
  constructor(private readonly signinService: SignInService) {}

  @Post()
  async signIn(@CurrentUser() user: User) {
    const result = await this.signinService.signIn(user.userId);
    return ok(result, "签到成功，已获得能量奖励");
  }

  @Get("status")
  async getStatus(@CurrentUser() user: User) {
    const status = await this.signinService.getStatus(user.userId);
    return ok(status);
  }
}
