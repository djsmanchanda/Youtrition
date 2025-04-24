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

  // 3 — Seed ingredients and a recipe for Pablo
  const banana = await db.ingredient.create({
    data: {
      name: "Banana",
      quantity: 2,
      unit: "pieces",
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
      profileId: pablo.id,
    },
  });

  const smoothie = await db.recipe.create({
    data: {
      title: "Banana Protein Smoothie",
      cuisine: "American",
      source: "seed",
      instructions: "Blend banana, protein powder, and almond milk until smooth.",
      cookTime: 5,
      dietaryInfo: "Gluten-free",
      nutrition: { calories: 250, protein: 20 },
      profileId: pablo.id,
      ingredients: {
        connect: [{ id: banana.id }],
      },
    },
  });

  console.log(
    `🌱 Seed data created: Pablo (ID ${pablo.id}) and Divjot (ID ${divjot.id})`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
