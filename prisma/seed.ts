import { db } from "../src/lib/db";

async function main() {
  await db.profile.createMany({
    data: [
      { id: 1, name: "Pablo", persona: "Athlete" },
      { id: 2, name: "Divjot",  persona: "Vegetarian" },
    ],
});
}

main().finally(() => db.$disconnect());
