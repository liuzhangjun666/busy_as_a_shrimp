import { Injectable, Logger } from "@nestjs/common";
import { MemberLevel } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import { getMembershipMonthlyPointGift } from "../doppelganger/member-point-policy";
import { WechatPayService } from "./wechat-pay.service";
import { ForwardedPaymentCallbackDto } from "./dto/forwarded-payment-callback.dto";

type PurchaseSourceModule = "ai_brief" | "solo_ai" | "campus";

interface PurchaseSourceContext {
  sourceModule?: PurchaseSourceModule;
  sourceAction?: string;
}

interface CreateMembershipOrderInput extends PurchaseSourceContext {
  userId: bigint;
  planCode: MemberLevel;
  payerClientIp?: string | null;
}

export interface MembershipCheckoutResult {
  success: true;
  paymentRequired: boolean;
  memberLevel: string;
  expireDate?: string;
  outTradeNo?: string;
  paymentMode?: "native";
  codeUrl?: string;
  paymentUrl?: string;
  amount?: number;
  status?: string;
}

@Injectable()
export class MembershipService {
  private readonly logger = new Logger(MembershipService.name);
  private static readonly TEST_MEMBER_PRICE = 0.01;
  private static readonly PLAN_PRICE_MAP: Record<MemberLevel, number> = {
    free: 0,
    monthly: MembershipService.TEST_MEMBER_PRICE,
    yearly: MembershipService.TEST_MEMBER_PRICE,
    lifetime: MembershipService.TEST_MEMBER_PRICE
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService,
    private readonly wechatPayService: WechatPayService
  ) {}

  plans() {
    return [
      { code: "free", name: "免费版", price: 0 },
      {
        code: "monthly",
        name: "月度会员",
        price: MembershipService.TEST_MEMBER_PRICE,
        monthlyGiftPoints: getMembershipMonthlyPointGift(MemberLevel.monthly)
      },
      {
        code: "yearly",
        name: "年度会员",
        price: MembershipService.TEST_MEMBER_PRICE,
        monthlyGiftPoints: getMembershipMonthlyPointGift(MemberLevel.yearly)
      },
      {
        code: "lifetime",
        name: "终身版",
        price: MembershipService.TEST_MEMBER_PRICE,
        monthlyGiftPoints: getMembershipMonthlyPointGift(MemberLevel.lifetime)
      }
    ];
  }

  async subscribe(userId: bigint, planCode: MemberLevel, source?: PurchaseSourceContext) {
    if (planCode === MemberLevel.free) return;

    return this.prisma.$transaction(async (tx) => {
      // 1. 更新会员等级
      const expireDate = new Date();
      if (planCode === MemberLevel.monthly) expireDate.setMonth(expireDate.getMonth() + 1);
      if (planCode === MemberLevel.yearly) expireDate.setFullYear(expireDate.getFullYear() + 1);
      if (planCode === MemberLevel.lifetime) expireDate.setFullYear(expireDate.getFullYear() + 99);

      await tx.user.update({
        where: { userId },
        data: {
          memberLevel: planCode,
          memberExpire: expireDate
        }
      });

      const priceMap: Record<MemberLevel, number> = {
        free: 0,
        monthly: MembershipService.TEST_MEMBER_PRICE,
        yearly: MembershipService.TEST_MEMBER_PRICE,
        lifetime: MembershipService.TEST_MEMBER_PRICE
      };
      const sourceAction = source?.sourceAction?.trim().slice(0, 64) || null;

      await tx.userPurchase.create({
        data: {
          userId,
          itemType: `membership_${planCode}`,
          amount: priceMap[planCode],
          status: "completed",
          sourceModule: source?.sourceModule ?? null,
          sourceAction
        }
      });

      // 2. 激活分身并确保当前月份的会员积分到账
      await this.doppelgangerService.activateWithBonus(userId, 100);
      await this.doppelgangerService.getPointAccountSummary(userId, {
        memberLevel: planCode,
        memberExpire: expireDate
      });

      return { success: true, memberLevel: planCode, expireDate };
    });
  }

  async createMembershipOrder(input: CreateMembershipOrderInput): Promise<MembershipCheckoutResult> {
    if (input.planCode === MemberLevel.free) {
      return {
        success: true,
        paymentRequired: false,
        memberLevel: MemberLevel.free
      };
    }

    const outTradeNo = this.generateOutTradeNo();
    const amount = MembershipService.PLAN_PRICE_MAP[input.planCode];
    const sourceAction = this.composeSourceAction(input.sourceAction, outTradeNo);

    await this.prisma.userPurchase.create({
      data: {
        userId: input.userId,
        itemType: this.buildMembershipItemType(input.planCode, outTradeNo),
        amount,
        status: "pending",
        sourceModule: input.sourceModule ?? null,
        sourceAction
      }
    });

    const codeUrl = await this.wechatPayService.createNativeOrder({
      outTradeNo,
      description: this.buildDescription(input.planCode),
      totalAmountFen: Math.round(amount * 100)
    });

    return {
      success: true,
      paymentRequired: true,
      memberLevel: input.planCode,
      outTradeNo,
      paymentMode: "native",
      codeUrl,
      amount,
      status: "pending"
    };
  }

  async getOrderStatus(userId: bigint, outTradeNo: string) {
    const purchase = await this.prisma.userPurchase.findFirst({
      where: {
        userId,
        itemType: {
          endsWith: `_${outTradeNo}`
        }
      },
      orderBy: [{ createdAt: "desc" }, { purchaseId: "desc" }]
    });

    if (!purchase) {
      return {
        outTradeNo,
        status: "not_found",
        paid: false
      };
    }

    if (purchase.status === "pending") {
      const remote = await this.wechatPayService.queryTransactionByOutTradeNo(outTradeNo);
      if (remote?.trade_state === "SUCCESS") {
        await this.completeMembershipOrder(outTradeNo, remote.transaction_id, remote.success_time);
      }
    }

    const latest = await this.prisma.userPurchase.findUnique({
      where: { purchaseId: purchase.purchaseId }
    });

    return {
      outTradeNo,
      status: latest?.status ?? purchase.status,
      paid: (latest?.status ?? purchase.status) === "completed"
    };
  }

  async completeMembershipOrder(
    outTradeNo: string,
    transactionId?: string,
    paidAt?: string
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const purchase = await tx.userPurchase.findFirst({
        where: {
          itemType: {
            endsWith: `_${outTradeNo}`
          }
        },
        orderBy: [{ purchaseId: "desc" }]
      });

      if (!purchase || purchase.status === "completed") {
        return;
      }

      const planCode = this.parsePlanCodeFromItemType(purchase.itemType);
      const expireDate = this.computeExpireDate(planCode);

      await tx.user.update({
        where: { userId: purchase.userId },
        data: {
          memberLevel: planCode,
          memberExpire: expireDate
        }
      });

      const noteParts = [purchase.sourceAction ?? "", transactionId ? `wx_txn:${transactionId}` : ""];
      if (paidAt) {
        noteParts.push(`paid_at:${paidAt}`);
      }

      await tx.userPurchase.update({
        where: { purchaseId: purchase.purchaseId },
        data: {
          status: "completed",
          sourceAction: noteParts.filter(Boolean).join("|").slice(0, 64)
        }
      });

      await this.doppelgangerService.activateWithBonus(purchase.userId, 100);
      await this.doppelgangerService.getPointAccountSummary(purchase.userId, {
        memberLevel: planCode,
        memberExpire: expireDate
      });
    });
  }

  async handleForwardedWechatCallback(payload: ForwardedPaymentCallbackDto): Promise<void> {
    if (!payload.order_no.startsWith("MP")) {
      this.logger.warn(`Ignore forwarded callback with unsupported order prefix: ${payload.order_no}`);
      return;
    }

    if (payload.payStatus !== "success") {
      this.logger.log(
        `Ignore forwarded callback for non-success order ${payload.order_no}, status=${payload.payStatus}`
      );
      return;
    }

    await this.completeMembershipOrder(payload.order_no, payload.providerTradeNo, payload.paidAt);
  }

  private computeExpireDate(planCode: MemberLevel): Date {
    const expireDate = new Date();
    if (planCode === MemberLevel.monthly) {
      expireDate.setMonth(expireDate.getMonth() + 1);
    } else if (planCode === MemberLevel.yearly) {
      expireDate.setFullYear(expireDate.getFullYear() + 1);
    } else if (planCode === MemberLevel.lifetime) {
      expireDate.setFullYear(expireDate.getFullYear() + 99);
    }
    return expireDate;
  }

  private buildDescription(planCode: MemberLevel): string {
    if (planCode === MemberLevel.monthly) return "星际枢纽-月度会员";
    if (planCode === MemberLevel.yearly) return "星际枢纽-年度会员";
    return "星际枢纽-终身会员";
  }

  private generateOutTradeNo(): string {
    const now = new Date();
    const date =
      `${now.getUTCFullYear()}${(now.getUTCMonth() + 1).toString().padStart(2, "0")}${now
        .getUTCDate()
        .toString()
        .padStart(2, "0")}` +
      `${now.getUTCHours().toString().padStart(2, "0")}${now.getUTCMinutes().toString().padStart(2, "0")}${now
        .getUTCSeconds()
        .toString()
        .padStart(2, "0")}`;
    const random = Math.random().toString(36).slice(2, 10).toUpperCase();
    return `MP${date}${random}`.slice(0, 32);
  }

  private buildMembershipItemType(planCode: MemberLevel, outTradeNo: string): string {
    return `membership_${planCode}_${outTradeNo}`;
  }

  private parsePlanCodeFromItemType(itemType: string): MemberLevel {
    if (itemType.includes("_monthly_")) return MemberLevel.monthly;
    if (itemType.includes("_yearly_")) return MemberLevel.yearly;
    if (itemType.includes("_lifetime_")) return MemberLevel.lifetime;
    return MemberLevel.free;
  }

  private composeSourceAction(sourceAction: string | undefined, outTradeNo: string): string {
    const safeSource = sourceAction?.trim().slice(0, 40) ?? "member_checkout";
    return `${safeSource}|ord:${outTradeNo}`.slice(0, 64);
  }
}
