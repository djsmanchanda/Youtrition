import { PrismaClient } from "../src/generated/prisma";   // or "@prisma/client"
const db = new PrismaClient();

async function main() {
  // 1 — clear the table
  await db.profile.deleteMany();

  // 2 — re‑insert demo rows
  await db.profile.createMany({
    data: [
      { id: 1, name: "Pablo",  persona: "Athlete"     },
      { id: 2, name: "Divjot", persona: "Vegetarian"  }
    ]
  });
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
