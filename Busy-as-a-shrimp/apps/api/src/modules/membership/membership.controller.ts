import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  Ip,
  Post,
  Query,
  Req,
  UseGuards
} from "@nestjs/common";
import { MemberLevel } from "@prisma/client";
import type { Request } from "express";
import { ok } from "../../common/api-response";
import { MembershipService } from "./membership.service";
import { WechatPayService } from "./wechat-pay.service";
import { JwtAuthGuard } from "../user/guards/jwt-auth.guard";
import { CurrentUser } from "../user/decorators/current-user.decorator";

interface ICurrentUser {
  userId: string | bigint;
}

interface WechatNotifyBodyPayload {
  id: string;
  event_type: string;
  resource_type: string;
  resource: {
    algorithm: string;
    ciphertext: string;
    nonce: string;
    associated_data?: string;
  };
}

type SourceModule = "ai_brief" | "solo_ai" | "campus";

@Controller("membership")
export class MembershipController {
  constructor(
    private readonly membershipService: MembershipService,
    private readonly wechatPayService: WechatPayService
  ) {}

  @Get("plans")
  plans() {
    return ok(this.membershipService.plans());
  }

  @Post("subscribe")
  @UseGuards(JwtAuthGuard)
  async subscribe(
    @CurrentUser() user: ICurrentUser,
    @Body() payload: { planCode: string; sourceModule?: SourceModule; sourceAction?: string },
    @Ip() ip: string
  ) {
    if (!payload.planCode) {
      throw new BadRequestException("planCode is required");
    }
    if (
      payload.sourceModule &&
      payload.sourceModule !== "ai_brief" &&
      payload.sourceModule !== "solo_ai" &&
      payload.sourceModule !== "campus"
    ) {
      throw new BadRequestException("sourceModule is invalid");
    }

    // Convert string planCode to MemberLevel enum, defaulting to something safe if invalid
    let level: MemberLevel = MemberLevel.free;
    if (payload.planCode === "PRO" || payload.planCode === "monthly") level = MemberLevel.monthly;
    if (payload.planCode === "yearly") level = MemberLevel.yearly;
    if (payload.planCode === "LIFETIME" || payload.planCode === "lifetime")
      level = MemberLevel.lifetime;

    const result = await this.membershipService.createMembershipOrder({
      userId: BigInt(user.userId),
      planCode: level,
      sourceModule: payload.sourceModule,
      sourceAction: payload.sourceAction,
      payerClientIp: ip
    });
    return ok(result || { success: true }, "Subscription successful");
  }

  @Get("order-status")
  @UseGuards(JwtAuthGuard)
  async orderStatus(@CurrentUser() user: ICurrentUser, @Query("outTradeNo") outTradeNo?: string) {
    const normalized = outTradeNo?.trim();
    if (!normalized) {
      throw new BadRequestException("outTradeNo is required");
    }
    const status = await this.membershipService.getOrderStatus(BigInt(user.userId), normalized);
    return ok(status);
  }

  @Post("wechat/notify")
  @HttpCode(200)
  async wechatNotify(
    @Req() request: Request & { rawBody?: Buffer },
    @Headers() headers: Record<string, string | string[] | undefined>,
    @Body() body: unknown
  ) {
    const rawBody = request.rawBody?.toString("utf8") ?? JSON.stringify(body ?? {});
    this.wechatPayService.verifyCallbackSignature(headers, rawBody);
    const decrypted = this.wechatPayService.decryptCallbackBody(body as WechatNotifyBodyPayload);

    if (decrypted.trade_state === "SUCCESS") {
      await this.membershipService.completeMembershipOrder(
        decrypted.out_trade_no,
        decrypted.transaction_id,
        decrypted.success_time
      );
    }
  }
}
