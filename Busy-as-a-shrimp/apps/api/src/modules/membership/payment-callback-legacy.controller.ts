import { Body, Controller, HttpCode, Post } from "@nestjs/common";
import { MembershipService } from "./membership.service";
import { ForwardedPaymentCallbackDto } from "./dto/forwarded-payment-callback.dto";

@Controller("api/payment/wechat")
export class PaymentCallbackLegacyController {
  constructor(private readonly membershipService: MembershipService) {}

  @Post("callback")
  @HttpCode(200)
  async receiveWechatCallback(@Body() payload: ForwardedPaymentCallbackDto) {
    await this.membershipService.handleForwardedWechatCallback(payload);
    return {
      code: 0,
      message: "ok"
    };
  }
}
