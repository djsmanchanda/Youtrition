// prisma/seed.ts
import { PrismaClient } from "../src/generated/prisma";
const db = new PrismaClient();

async function main() {
  // 1 — Clear existing data
  await db.ingredient.deleteMany();
  await db.recipe.deleteMany();
  await db.profile.deleteMany();

  // 2 — Re-insert demo profiles
  const pablo = await db.profile.create({
    data: {
      name: "Pablo",
      persona: "Athlete",
      dietaryRestrictions: ["gluten-free"],
      allergies: [],
      cuisinePreferences: ["Mexican", "Italian"],
      workoutFrequency: 5,
      workoutIntensity: 7,
    },
  });

  const divjot = await db.profile.create({
    data: {
      name: "Divjot",
      persona: "Vegetarian",
      dietaryRestrictions: ["vegetarian"],
      allergies: ["peanuts"],
      cuisinePreferences: ["Indian", "Thai"],
      workoutFrequency: 3,
      workoutIntensity: 4,
    },
  });

  console.log(`🌱 Seed created profiles: Pablo (ID ${pablo.id}), Divjot (ID ${divjot.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
