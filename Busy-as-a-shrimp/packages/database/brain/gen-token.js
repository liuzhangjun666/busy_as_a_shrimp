const { PrismaClient } = require("@prisma/client");
const jwt = require("jsonwebtoken");
const path = require("path");
const fs = require("fs");

// Load .env manually for standalone script
const envContent = fs.readFileSync(path.join(__dirname, "../../../.env"), "utf8");
const JWT_SECRET = envContent
  .split("\n")
  .find((line) => line.startsWith("JWT_SECRET="))
  ?.split("=")[1]
  ?.trim();

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { userId: BigInt(10001) }
  });

  if (!user) {
    console.error("User 10001 not found");
    return;
  }

  const payload = {
    userId: user.userId.toString(),
    role: user.role
  };

  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  console.log("\n✅ Generated Token for User 10001:");
  console.log(token);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
