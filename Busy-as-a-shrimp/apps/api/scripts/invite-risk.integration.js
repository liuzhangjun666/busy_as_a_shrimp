const { PrismaClient } = require("@prisma/client");
const { ComplianceService } = require("../dist/modules/compliance/compliance.service");
const { LocalComplianceProvider } = require("../dist/modules/compliance/providers/local.provider");

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function createSuffix() {
  return `${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

function createInviteCode(prefix, suffix) {
  const cleanedPrefix = prefix.replace(/[^A-Z0-9]/g, "").slice(0, 3) || "IVT";
  const cleanedSuffix = suffix.replace(/[^0-9]/g, "").slice(-6);
  return `${cleanedPrefix}${cleanedSuffix}`.slice(0, 10);
}

async function createUser(prisma, label, suffix) {
  const phoneHash = `invite-risk-${label}-${suffix}`;
  const inviteCode = createInviteCode(label.toUpperCase(), suffix);

  return prisma.user.create({
    data: {
      phoneHash,
      role: "service",
      status: "active",
      inviteCode
    }
  });
}

async function run() {
  const prisma = new PrismaClient();
  const provider = new LocalComplianceProvider();
  const compliance = new ComplianceService(prisma, provider);

  const createdUserIds = [];
  const createdInviteeIds = [];
  const suffix = createSuffix();

  try {
    await prisma.$connect();

    const inviter1 = await createUser(prisma, "A01", suffix);
    const invitee1 = await createUser(prisma, "B01", suffix);
    createdUserIds.push(inviter1.userId, invitee1.userId);
    createdInviteeIds.push(invitee1.userId);

    const singleResult = await compliance.evaluateInviteRisk({
      inviterId: inviter1.userId,
      inviteeId: invitee1.userId,
      inviteCode: inviter1.inviteCode || "INVITER1"
    });

    assert(singleResult.isValid, "single invite should be valid");
    assert(singleResult.recordCreated, "single invite should create one record");

    const singleCount = await prisma.inviteRecord.count({
      where: { inviteeId: invitee1.userId }
    });
    assert(singleCount === 1, `single invite count should be 1, got ${singleCount}`);

    const duplicateResult = await compliance.evaluateInviteRisk({
      inviterId: inviter1.userId,
      inviteeId: invitee1.userId,
      inviteCode: inviter1.inviteCode || "INVITER1"
    });

    assert(!duplicateResult.isValid, "duplicate invite should be invalid");
    assert(!duplicateResult.recordCreated, "duplicate invite should not create new record");
    assert(
      duplicateResult.reasons.includes("duplicate_invitee"),
      `duplicate invite should include duplicate_invitee, got ${duplicateResult.reasons.join(",")}`
    );

    const duplicateCount = await prisma.inviteRecord.count({
      where: { inviteeId: invitee1.userId }
    });
    assert(duplicateCount === 1, `duplicate invite count should stay 1, got ${duplicateCount}`);

    const inviter2 = await createUser(prisma, "A02", suffix);
    const invitee2 = await createUser(prisma, "B02", suffix);
    createdUserIds.push(inviter2.userId, invitee2.userId);
    createdInviteeIds.push(invitee2.userId);

    const [concurrentA, concurrentB] = await Promise.all([
      compliance.evaluateInviteRisk({
        inviterId: inviter1.userId,
        inviteeId: invitee2.userId,
        inviteCode: inviter1.inviteCode || "INVITER1"
      }),
      compliance.evaluateInviteRisk({
        inviterId: inviter2.userId,
        inviteeId: invitee2.userId,
        inviteCode: inviter2.inviteCode || "INVITER2"
      })
    ]);

    const concurrentCount = await prisma.inviteRecord.count({
      where: { inviteeId: invitee2.userId }
    });
    assert(concurrentCount === 1, `concurrent invite count should be 1, got ${concurrentCount}`);

    const createdCount = [concurrentA, concurrentB].filter((item) => item.recordCreated).length;
    assert(createdCount === 1, `concurrent recordCreated count should be 1, got ${createdCount}`);

    const duplicateReasonCount = [concurrentA, concurrentB].filter((item) =>
      item.reasons.includes("duplicate_invitee")
    ).length;
    assert(
      duplicateReasonCount === 1,
      `concurrent duplicate_invitee count should be 1, got ${duplicateReasonCount}`
    );

    console.log("invite-risk.integration passed");
  } finally {
    if (createdInviteeIds.length > 0) {
      await prisma.inviteRecord.deleteMany({
        where: {
          OR: [{ inviteeId: { in: createdInviteeIds } }, { inviterId: { in: createdUserIds } }]
        }
      });
    }

    if (createdUserIds.length > 0) {
      await prisma.user.deleteMany({
        where: {
          userId: { in: createdUserIds }
        }
      });
    }

    await prisma.$disconnect();
  }
}

run().catch((error) => {
  console.error("invite-risk.integration failed");
  console.error(error instanceof Error ? error.stack : error);
  process.exit(1);
});
