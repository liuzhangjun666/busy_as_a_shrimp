import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma.service";

@Injectable()
export class RankingService {
  constructor(private readonly prisma: PrismaService) {}

  async getTopInviters(startTime: Date, endTime: Date, limit: number = 30) {
    const records = await this.prisma.inviteRecord.groupBy({
      by: ["inviterId"],
      _count: { recordId: true },
      where: {
        isValid: true,
        createdAt: {
          gte: startTime,
          lte: endTime
        }
      },
      orderBy: {
        _count: {
          recordId: "desc"
        }
      },
      take: limit
    });

    if (records.length === 0) return [];

    const userIds = records.map((r) => r.inviterId);
    const users = await this.prisma.user.findMany({
      where: { userId: { in: userIds } },
      select: { userId: true, maskedPhone: true }
    });

    const userMap = new Map(users.map((u) => [u.userId.toString(), u]));

    return records.map((r, index) => {
      const user = userMap.get(r.inviterId.toString());
      return {
        rank: index + 1,
        userId: Number(r.inviterId),
        inviteCount: r._count.recordId,
        maskedPhone: user?.maskedPhone || "****"
      };
    });
  }
}
