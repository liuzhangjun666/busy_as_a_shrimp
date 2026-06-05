import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { ok } from "../../common/api-response";
import { CurrentUser } from "../user/decorators/current-user.decorator";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CaptainService } from "./captain.service";
import { WithdrawDto } from "./dto/captain.dto";

interface AuthUser {
  userId: bigint | string;
  role: string;
}

@Controller("captain")
@UseGuards(JwtAuthGuard)
export class CaptainController {
  constructor(private readonly captainService: CaptainService) {}

  @Get("info")
  async info(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.info(BigInt(user.userId)));
  }

  @Get("ranking")
  async ranking(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.ranking(BigInt(user.userId)));
  }

  @Get("rewards")
  async rewards(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.rewards(BigInt(user.userId)));
  }

  @Get("commissions")
  async commissions(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.rewards(BigInt(user.userId)));
  }

  @Get("invites")
  async invites(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.invites(BigInt(user.userId)));
  }

  @Post("withdraw")
  async withdraw(@CurrentUser() _user: AuthUser, @Body() _payload: WithdrawDto) {
    return ok(
      await this.captainService.withdraw(),
      "withdraw request submitted"
    );
  }

  @Get("stats")
  async stats(@CurrentUser() user: AuthUser) {
    return ok(await this.captainService.stats(BigInt(user.userId)));
  }
}
