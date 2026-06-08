import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";
import { DoppelgangerService } from "../doppelganger/doppelganger.service";
import { PointTransType } from "@prisma/client";

@Injectable()
export class SignInService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly doppelgangerService: DoppelgangerService
  ) {}

  async signIn(userId: bigint) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. 检查今日是否已签到
    const existing = await this.prisma.signInRecord.findUnique({
      where: {
        userId_lastSignInDate: {
          userId,
          lastSignInDate: today
        }
      }
    });

    if (existing) {
      throw new BadRequestException("今日已完成能量签到");
    }

    // 2. 检查用户是否已完成新手三步曲（即拥有资源记录）
    const hasResource = await this.prisma.resource.findFirst({
      where: { userId }
    });

    if (!hasResource) {
      throw new BadRequestException("请先完成赛博分身激活三步曲以开启签到");
    }

    // 3. 计算连续签到天数 (Streak)
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const prevRecord = await this.prisma.signInRecord.findFirst({
      where: {
        userId,
        lastSignInDate: {
          gte: yesterday,
          lt: today
        }
      }
    });

    const newStreak = prevRecord ? prevRecord.streakDays + 1 : 1;

    // 4. 计算奖励逻辑 (5基础 + 7天额外+20)
    let rewardPoints = 5;
    if (newStreak % 7 === 0) {
      rewardPoints += 20;
    }

    return this.prisma.$transaction(async (tx) => {
      // 记录签到
      await tx.signInRecord.create({
        data: {
          userId,
          lastSignInDate: today,
          streakDays: newStreak
        }
      });

      // 发放积分
      await this.doppelgangerService.addPoints(userId, rewardPoints, PointTransType.DAILY_SIGN_IN, {
        streak: newStreak
      });

      return {
        points: rewardPoints,
        streakDays: newStreak,
        nextBigReward: 7 - (newStreak % 7)
      };
    });
  }

  async getStatus(userId: bigint) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const record = await this.prisma.signInRecord.findFirst({
      where: { userId },
      orderBy: { lastSignInDate: "desc" }
    });

    const signedToday = record?.lastSignInDate.getTime() === today.getTime();

    return {
      signedToday,
      streakDays: record ? record.streakDays : 0
    };
  }
}
