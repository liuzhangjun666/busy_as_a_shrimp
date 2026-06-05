import { Injectable, BadRequestException, ForbiddenException } from "@nestjs/common";
import { DoppelgangerStatus, MemberLevel, PointTransType, Prisma } from "@prisma/client";
import { PrismaService } from "../../common/prisma.service";
import {
  getMembershipMonthlyPointGift,
  getMomoCommandPointCost
} from "./member-point-policy";

export interface PointAccountSummary {
  balance: number;
  memberMonthlyPointsGift: number;
  currentMonthGrantedPoints: number;
  isMomoUnlocked: boolean;
}

export interface PointLedgerItem {
  transactionId: number;
  amount: number;
  type: PointTransType;
  createdAt: string;
  direction: "income" | "expense";
  title: string;
  description: string;
}

@Injectable()
export class DoppelgangerService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoppelganger(userId: bigint) {
    const summary = await this.getPointAccountSummary(userId);
    const doppelganger = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: "desc" }, take: 50 } }
    });

    return {
      ...summary,
      transactions: (doppelganger?.transactions ?? []).map((item) => this.toLedgerItem(item))
    };
  }

  async createOrUpdateDoppelganger(userId: bigint, initialBalance: number = 0) {
    return this.prisma.cyberDoppelganger.upsert({
      where: { userId },
      create: {
        userId,
        balance: initialBalance,
        status: DoppelgangerStatus.active
      },
      update: {
        status: DoppelgangerStatus.active
      }
    });
  }

  async activateWithBonus(userId: bigint, bonusAmount: number = 100) {
    const doppelganger = await this.createOrUpdateDoppelganger(userId, 0);

    const existingBonus = await this.prisma.pointTransaction.findFirst({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.INITIAL_BONUS
      }
    });

    if (!existingBonus && bonusAmount > 0) {
      await this.addPoints(userId, bonusAmount, PointTransType.INITIAL_BONUS, {
        reason: "Welcome Bonus"
      });
    }

    return doppelganger;
  }

  async getPointAccountSummary(
    userId: bigint,
    options?: {
      memberLevel?: MemberLevel;
      memberExpire?: Date | null;
    }
  ): Promise<PointAccountSummary> {
    const user =
      options?.memberLevel !== undefined
        ? {
            memberLevel: options.memberLevel,
            memberExpire: options.memberExpire ?? null
          }
        : await this.prisma.user.findUnique({
            where: { userId },
            select: { memberLevel: true, memberExpire: true }
          });

    if (!user) {
      throw new BadRequestException("用户未找到");
    }

    const account = await this.ensureMonthlyMembershipPoints(
      userId,
      user.memberLevel,
      user.memberExpire ?? null
    );

    return {
      balance: account.balance,
      memberMonthlyPointsGift: account.memberMonthlyPointsGift,
      currentMonthGrantedPoints: account.currentMonthGrantedPoints,
      isMomoUnlocked: account.isMomoUnlocked
    };
  }

  async addPoints(
    userId: bigint,
    amount: number,
    type: PointTransType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  ) {
    return this.prisma.$transaction((tx) =>
      this.addPointsInTransaction(tx, userId, amount, type, metadata)
    );
  }

  async addPointsInTransaction(
    tx: Prisma.TransactionClient,
    userId: bigint,
    amount: number,
    type: PointTransType,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    metadata?: any
  ) {
    let doppelganger = await tx.cyberDoppelganger.findUnique({
      where: { userId }
    });

    if (!doppelganger) {
      doppelganger = await tx.cyberDoppelganger.create({
        data: {
          userId,
          balance: 0,
          status: DoppelgangerStatus.active
        }
      });
    }

    await tx.pointTransaction.create({
      data: {
        doppelgangerId: doppelganger.doppelgangerId,
        amount: new Prisma.Decimal(amount),
        type,
        metadata
      }
    });

    return tx.cyberDoppelganger.update({
      where: { doppelgangerId: doppelganger.doppelgangerId },
      data: {
        balance: { increment: new Prisma.Decimal(amount) }
      }
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async consumePoints(userId: bigint, amount: number, metadata?: any) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException("amount must be greater than 0");
    }

    return this.prisma.$transaction(async (tx) => {
      // @ts-expect-error prisma queryRaw returns generic promise that cannot be safely destructured
      const [doppelganger] = await tx.$queryRaw`
        SELECT doppelganger_id as doppelgangerId, balance, status 
        FROM cyber_doppelgangers 
        WHERE user_id = ${userId} 
        FOR UPDATE
      `;

      if (!doppelganger) throw new BadRequestException("Cyber Doppelganger not found");
      if (doppelganger.status !== DoppelgangerStatus.active)
        throw new BadRequestException("Active Cyber Doppelganger not found");
      if (Number(doppelganger.balance) < amount)
        throw new BadRequestException("Insufficient point balance");

      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: new Prisma.Decimal(-amount),
          type: PointTransType.TOKEN_CONSUME,
          metadata: {
            ...metadata,
            audit: { timestamp: new Date().toISOString() }
          }
        }
      });

      return tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: { decrement: new Prisma.Decimal(amount) }
        }
      });
    });
  }

  async consumeMomoCommandPoints(userId: bigint, rawCommand: string) {
    const command = rawCommand.trim().split(/\s+/)[0] ?? "";
    const cost = getMomoCommandPointCost(command);

    if (!command || cost <= 0) {
      throw new BadRequestException("暂不支持该 momo 指令");
    }

    const user = await this.prisma.user.findUnique({
      where: { userId },
      select: { memberLevel: true, memberExpire: true }
    });

    if (!user) {
      throw new BadRequestException("用户未找到");
    }

    const account = await this.ensureMonthlyMembershipPoints(
      userId,
      user.memberLevel,
      user.memberExpire ?? null
    );

    if (!account.isMomoUnlocked) {
      throw new ForbiddenException("momo 赛博分身仅对已开通会员用户开放");
    }

    const updated = await this.consumePoints(userId, cost, {
      source: "momo_command",
      command,
      reason: "momo 指令执行消耗"
    });

    return {
      success: true,
      command,
      cost,
      remainingBalance: Number(updated.balance),
      memberMonthlyPointsGift: account.memberMonthlyPointsGift,
      currentMonthGrantedPoints: account.currentMonthGrantedPoints,
      memberLevel: user.memberLevel
    };
  }

  private async ensureMonthlyMembershipPoints(
    userId: bigint,
    memberLevel: MemberLevel,
    memberExpire: Date | null
  ): Promise<PointAccountSummary> {
    const isMomoUnlocked = this.isMembershipActive(memberLevel, memberExpire);
    const monthlyGift = isMomoUnlocked ? getMembershipMonthlyPointGift(memberLevel) : 0;

    const existingAccount = await this.prisma.cyberDoppelganger.findUnique({
      where: { userId }
    });

    const doppelganger =
      existingAccount ??
      (isMomoUnlocked ? await this.createOrUpdateDoppelganger(userId, 0) : null);

    if (!doppelganger) {
      return {
        balance: 0,
        memberMonthlyPointsGift: monthlyGift,
        currentMonthGrantedPoints: 0,
        isMomoUnlocked
      };
    }

    if (!isMomoUnlocked || monthlyGift <= 0) {
      return {
        balance: Number(doppelganger.balance),
        memberMonthlyPointsGift: monthlyGift,
        currentMonthGrantedPoints: 0,
        isMomoUnlocked
      };
    }

    const grantMonth = this.getShanghaiMonthKey();
    const recentAdjustments = await this.prisma.pointTransaction.findMany({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.SYSTEM_ADJUST
      },
      orderBy: { createdAt: "desc" },
      take: 36
    });

    const grantedThisMonth = recentAdjustments.reduce((sum, transaction) => {
      const metadata = this.readObjectMetadata(transaction.metadata);
      if (metadata?.source !== "membership_monthly_grant" || metadata?.grantMonth !== grantMonth) {
        return sum;
      }
      return sum + Number(transaction.amount);
    }, 0);

    const delta = Math.max(0, monthlyGift - grantedThisMonth);
    let balance = Number(doppelganger.balance);
    let currentMonthGrantedPoints = grantedThisMonth;

    if (delta > 0) {
      const updated = await this.addPoints(userId, delta, PointTransType.SYSTEM_ADJUST, {
        source: "membership_monthly_grant",
        grantMonth,
        memberLevel,
        reason: "会员月度积分发放"
      });
      balance = Number(updated.balance);
      currentMonthGrantedPoints += delta;
    }

    return {
      balance,
      memberMonthlyPointsGift: monthlyGift,
      currentMonthGrantedPoints,
      isMomoUnlocked
    };
  }

  private isMembershipActive(memberLevel: MemberLevel, memberExpire: Date | null): boolean {
    if (memberLevel === MemberLevel.free) {
      return false;
    }
    if (!memberExpire) {
      return false;
    }
    return memberExpire.getTime() > Date.now();
  }

  private getShanghaiMonthKey(date: Date = new Date()): string {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Shanghai",
      year: "numeric",
      month: "2-digit"
    });
    return formatter.format(date);
  }

  private readObjectMetadata(metadata: Prisma.JsonValue | null | undefined): Record<string, string> | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
      return null;
    }

    return Object.entries(metadata).reduce<Record<string, string>>((acc, [key, value]) => {
      if (typeof value === "string") {
        acc[key] = value;
      }
      return acc;
    }, {});
  }

  private toLedgerItem(transaction: {
    transactionId: bigint;
    amount: Prisma.Decimal;
    type: PointTransType;
    createdAt: Date;
    metadata: Prisma.JsonValue | null;
  }): PointLedgerItem {
    const amount = Number(transaction.amount);
    const metadata = this.readObjectMetadata(transaction.metadata);
    const direction = amount >= 0 ? "income" : "expense";

    return {
      transactionId: Number(transaction.transactionId),
      amount,
      type: transaction.type,
      createdAt: transaction.createdAt.toISOString(),
      direction,
      title: this.resolveLedgerTitle(transaction.type, direction),
      description: this.resolveLedgerDescription(transaction.type, metadata)
    };
  }

  private resolveLedgerTitle(
    type: PointTransType,
    direction: "income" | "expense"
  ): string {
    if (type === PointTransType.INITIAL_BONUS) return "新手激活赠送";
    if (type === PointTransType.DAILY_SIGN_IN) return "每日签到奖励";
    if (type === PointTransType.TASK_REWARD) return "任务奖励";
    if (type === PointTransType.INVITE_REWARD) return "邀请奖励";
    if (type === PointTransType.CONTRIBUTION_REWARD) return "贡献奖励";
    if (type === PointTransType.TOKEN_CONSUME) return "momo 指令消耗";
    if (type === PointTransType.SYSTEM_ADJUST) {
      return direction === "income" ? "会员月度积分发放" : "系统积分调整";
    }
    return direction === "income" ? "积分收入" : "积分支出";
  }

  private resolveLedgerDescription(
    type: PointTransType,
    metadata: Record<string, string> | null
  ): string {
    if (!metadata) {
      if (type === PointTransType.TOKEN_CONSUME) {
        return "执行 momo 指令时消耗积分";
      }
      return "系统记录的积分变动";
    }

    if (type === PointTransType.TOKEN_CONSUME && metadata.command) {
      return `执行指令 ${metadata.command} 时扣除积分`;
    }

    if (type === PointTransType.SYSTEM_ADJUST && metadata.source === "membership_monthly_grant") {
      return `${metadata.grantMonth ?? "当月"} 会员积分已自动到账`;
    }

    return (
      metadata.reason ??
      metadata.source ??
      "系统记录的积分变动"
    );
  }
}
