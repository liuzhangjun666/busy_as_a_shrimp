import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

interface CheckoutInput {
  sourceModule?: "campus";
  sourceAction?: string;
}

@Injectable()
export class CampusUnlockService {
  private static readonly ITEM_TYPE = "campus_unlock_9_9";
  private static readonly PRICE = 9.9;

  constructor(private readonly prisma: PrismaService) {}

  async getUnlockStatus(userId: bigint) {
    const purchase = await this.prisma.userPurchase.findFirst({
      where: {
        userId,
        itemType: CampusUnlockService.ITEM_TYPE,
        status: "completed"
      },
      orderBy: [{ createdAt: "desc" }, { purchaseId: "desc" }]
    });

    if (!purchase) {
      return { unlocked: false as const };
    }

    return {
      unlocked: true as const,
      purchaseId: Number(purchase.purchaseId),
      unlockedAt: purchase.createdAt.toISOString()
    };
  }

  async checkout(userId: bigint, payload: CheckoutInput) {
    const current = await this.getUnlockStatus(userId);
    if (current.unlocked) {
      return {
        success: true as const,
        unlocked: true as const,
        purchaseId: current.purchaseId,
        amount: CampusUnlockService.PRICE
      };
    }

    const sourceAction = payload.sourceAction?.trim().slice(0, 64) || null;
    const created = await this.prisma.userPurchase.create({
      data: {
        userId,
        itemType: CampusUnlockService.ITEM_TYPE,
        amount: CampusUnlockService.PRICE,
        status: "completed",
        sourceModule: payload.sourceModule ?? null,
        sourceAction
      }
    });

    return {
      success: true as const,
      unlocked: true as const,
      purchaseId: Number(created.purchaseId),
      amount: CampusUnlockService.PRICE
    };
  }

  async grantUnlock(userId: bigint, note?: string) {
    const current = await this.getUnlockStatus(userId);
    if (current.unlocked) {
      return {
        success: true as const,
        userId: Number(userId),
        purchaseId: current.purchaseId
      };
    }

    const created = await this.prisma.userPurchase.create({
      data: {
        userId,
        itemType: CampusUnlockService.ITEM_TYPE,
        amount: CampusUnlockService.PRICE,
        status: "completed",
        sourceModule: "campus",
        sourceAction: note?.trim().slice(0, 64) || "admin_grant"
      }
    });

    return {
      success: true as const,
      userId: Number(userId),
      purchaseId: Number(created.purchaseId)
    };
  }
}
