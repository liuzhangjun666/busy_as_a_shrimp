const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const openTasks = await prisma.bountyTask.findMany({
    where: {
      status: "PUBLISHED",
      selectedSubmissionId: null,
      publisherId: { not: null },
    },
    include: {
      publisher: {
        select: {
          userId: true,
          nickname: true,
          maskedPhone: true,
        },
      },
      submissions: {
        where: {
          userId: 22n,
        },
        include: {
          user: {
            select: {
              userId: true,
              nickname: true,
              maskedPhone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    take: 1,
  });

  const myPublished = await prisma.bountyTask.findMany({
    where: {
      publisherId: 22n,
    },
    include: {
      publisher: {
        select: {
          userId: true,
          nickname: true,
          maskedPhone: true,
        },
      },
      submissions: {
        include: {
          user: {
            select: {
              userId: true,
              nickname: true,
              maskedPhone: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 1,
  });

  const myClaimed = await prisma.taskSubmission.findMany({
    where: {
      userId: 22n,
    },
    include: {
      task: {
        include: {
          publisher: {
            select: {
              userId: true,
              nickname: true,
              maskedPhone: true,
            },
          },
        },
      },
      user: {
        select: {
          userId: true,
          nickname: true,
          maskedPhone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 1,
  });

  console.log(
    JSON.stringify({
      ok: true,
      openTasks: openTasks.length,
      myPublished: myPublished.length,
      myClaimed: myClaimed.length,
    }),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
