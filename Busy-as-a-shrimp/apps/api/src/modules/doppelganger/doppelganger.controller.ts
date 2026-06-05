import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { DoppelgangerService } from "./doppelganger.service";

@UseGuards(JwtAuthGuard)
@Controller("doppelganger")
export class DoppelgangerController {
  constructor(private readonly doppelgangerService: DoppelgangerService) {}

  @Get("me")
  async getMyDoppelganger(@Req() req: { user: { userId: string } }) {
    // Note: Assuming AuthGuard and userId availability. Using req.user.userId
    const userId = BigInt(req.user.userId);
    return this.doppelgangerService.getDoppelganger(userId);
  }

  @Post("consume")
  async consumeTokens(
    @Req() req: { user: { userId: string } },
    @Body() body: { amount: number; metadata?: Record<string, unknown> }
  ) {
    const userId = BigInt(req.user.userId);
    return this.doppelgangerService.consumePoints(userId, body.amount, body.metadata);
  }

  @Post("momo/consume")
  async consumeMomoCommand(
    @Req() req: { user: { userId: string } },
    @Body() body: { command: string }
  ) {
    const userId = BigInt(req.user.userId);
    return this.doppelgangerService.consumeMomoCommandPoints(userId, body.command);
  }
}
