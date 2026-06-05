const { PrismaClient } = require("@prisma/client");
const crypto = require("crypto");

const prisma = new PrismaClient();

function hashPhone(phone) {
  return crypto.createHash("sha256").update(phone).digest("hex");
}

function generateSecureInviteCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.randomBytes(8);
  let code = "SHR-";
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

async function testLogin(phone) {
  const phoneHash = hashPhone(phone);
  console.log(`Phone: ${phone}, Hash: ${phoneHash}`);

  try {
    let user = await prisma.user.findFirst({ where: { phoneHash } });
    if (!user) {
      console.log("User not found, creating...");
      user = await prisma.user.create({
        data: {
          phoneHash,
          role: "service",
          status: "active",
          lastIp: "127.0.0.1",
          inviteCode: generateSecureInviteCode()
        }
      });
      console.log("User created:", user.userId.toString());
    } else {
      console.log("User found:", user.userId.toString());
    }
  } catch (error) {
    console.error("Operation failed:", error);
  } finally {
    await prisma.$disconnect();
  }
}

testLogin("13800138001");
