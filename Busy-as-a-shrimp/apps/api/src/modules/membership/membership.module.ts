import { Module } from "@nestjs/common";
import { MembershipController } from "./membership.controller";
import { PaymentCallbackLegacyController } from "./payment-callback-legacy.controller";
import { PaymentCallbackController } from "./payment-callback.controller";
import { MembershipService } from "./membership.service";
import { PrismaService } from "../../common/prisma.service";
import { WechatPayService } from "./wechat-pay.service";

import { DoppelgangerModule } from "../doppelganger/doppelganger.module";

@Module({
  imports: [DoppelgangerModule],
  controllers: [MembershipController, PaymentCallbackController, PaymentCallbackLegacyController],
  providers: [MembershipService, PrismaService, WechatPayService],
  exports: [MembershipService]
})
export class MembershipModule {}
