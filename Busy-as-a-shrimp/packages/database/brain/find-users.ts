import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    take: 5,
    select: {
      userId: true,
      phoneHash: true,
      maskedPhone: true
    }
  });
  console.log(
    JSON.stringify(users, (key, value) => (typeof value === "bigint" ? value.toString() : value), 2)
  );
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
