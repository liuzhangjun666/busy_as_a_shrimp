import { PrismaClient } from "@prisma/client";
import * as jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET?.trim();

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not configured.");
}

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
