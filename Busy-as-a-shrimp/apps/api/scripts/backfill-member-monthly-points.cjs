const path = require("path");
const dotenv = require("dotenv");
const { PrismaClient, MemberLevel, PointTransType, DoppelgangerStatus } = require("@prisma/client");

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
dotenv.config({ path: path.resolve(__dirname, "../.env"), override: true });

const prisma = new PrismaClient();

const MEMBERSHIP_MONTHLY_POINT_GIFT = {
  [MemberLevel.free]: 0,
  [MemberLevel.monthly]: 180,
  [MemberLevel.yearly]: 480,
  [MemberLevel.lifetime]: 1200
};

function getShanghaiMonthKey(date = new Date()) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit"
  });
  return formatter.format(date);
}

function isActiveMember(user) {
  if (!user || user.memberLevel === MemberLevel.free || !user.memberExpire) {
    return false;
  }
  return new Date(user.memberExpire).getTime() > Date.now();
}

function readObjectMetadata(metadata) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null;
  }

  return Object.entries(metadata).reduce((acc, [key, value]) => {
    if (typeof value === "string") {
      acc[key] = value;
    }
    return acc;
  }, {});
}

async function ensureDoppelganger(userId) {
  return prisma.cyberDoppelganger.upsert({
    where: { userId },
    create: {
      userId,
      balance: 0,
      status: DoppelgangerStatus.active
    },
    update: {
      status: DoppelgangerStatus.active
    }
  });
}

async function main() {
  const grantMonth = getShanghaiMonthKey();
  const activeMembers = await prisma.user.findMany({
    where: {
      memberLevel: {
        in: [MemberLevel.monthly, MemberLevel.yearly, MemberLevel.lifetime]
      },
      memberExpire: {
        gt: new Date()
      }
    },
    select: {
      userId: true,
      memberLevel: true,
      memberExpire: true,
      maskedPhone: true,
      phoneHash: true
    },
    orderBy: {
      userId: "asc"
    }
  });

  const stats = {
    scanned: activeMembers.length,
    updated: 0,
    skipped: 0,
    totalGranted: 0,
    byLevel: {
      monthly: 0,
      yearly: 0,
      lifetime: 0
    }
  };

  console.log(`[member-points] 开始补发 ${grantMonth} 会员月度积分，共扫描 ${activeMembers.length} 个会员账号`);

  for (const user of activeMembers) {
    if (!isActiveMember(user)) {
      stats.skipped += 1;
      continue;
    }

    const target = MEMBERSHIP_MONTHLY_POINT_GIFT[user.memberLevel] ?? 0;
    if (target <= 0) {
      stats.skipped += 1;
      continue;
    }

    const doppelganger = await ensureDoppelganger(user.userId);

    const transactions = await prisma.pointTransaction.findMany({
      where: {
        doppelgangerId: doppelganger.doppelgangerId,
        type: PointTransType.SYSTEM_ADJUST
      },
      orderBy: {
        createdAt: "desc"
      },
      take: 50
    });

    const grantedThisMonth = transactions.reduce((sum, transaction) => {
      const metadata = readObjectMetadata(transaction.metadata);
      if (metadata?.source !== "membership_monthly_grant" || metadata?.grantMonth !== grantMonth) {
        return sum;
      }
      return sum + Number(transaction.amount);
    }, 0);

    const delta = Math.max(0, target - grantedThisMonth);
    if (delta <= 0) {
      stats.skipped += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.pointTransaction.create({
        data: {
          doppelgangerId: doppelganger.doppelgangerId,
          amount: delta,
          type: PointTransType.SYSTEM_ADJUST,
          metadata: {
            source: "membership_monthly_grant",
            grantMonth,
            memberLevel: user.memberLevel,
            reason: "会员月度积分发放（批量补发脚本）"
          }
        }
      });

      await tx.cyberDoppelganger.update({
        where: { doppelgangerId: doppelganger.doppelgangerId },
        data: {
          balance: {
            increment: delta
          }
        }
      });
    });

    stats.updated += 1;
    stats.totalGranted += delta;
    stats.byLevel[user.memberLevel] += delta;

    const userLabel = user.maskedPhone || user.phoneHash || `user#${user.userId.toString()}`;
    console.log(
      `[member-points] 已补发 ${userLabel} (${user.memberLevel})：${delta} 积分，本月累计 ${grantedThisMonth + delta}/${target}`
    );
  }

  console.log("[member-points] 补发完成");
  console.log(
    JSON.stringify(
      {
        grantMonth,
        ...stats
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("[member-points] 补发失败", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
